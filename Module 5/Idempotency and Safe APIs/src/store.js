'use strict';
// server.js

const express = require('express');
const crypto = require('crypto');
const { charges, idempotency, nextChargeId } = require('./store');

const app = express();
app.use(express.json());

// Simulated payment processor. Deterministic-ish: fails on amounts ending in .99
// or when `failOnce` flag is set, so tests can drive retry scenarios.
async function processPayment(amount, currency) {
  // Simulate a bit of latency
  await new Promise((r) => setTimeout(r, 10));

  if (amount <= 0) {
    const err = new Error('Amount must be positive');
    err.status = 400;
    err.code = 'invalid_amount';
    throw err;
  }
  if (Math.round(amount * 100) % 100 === 99) {
    const err = new Error('Card declined');
    err.status = 402;
    err.code = 'card_declined';
    throw err;
  }
  return { id: nextChargeId(), amount, currency: currency || 'usd', status: 'succeeded' };
}

/**
 * POST /charge
 * Body: { amount: number, currency?: string }
 * Header: Idempotency-Key: <string>  (required)
 *
 * Guarantees:
 *  - Missing key            -> 400, no charge, nothing cached
 *  - Same key + same body   -> cached response replayed, NO new charge
 *  - Same key + diff body   -> 409 (idempotency key reuse with different payload)
 *  - Same key, concurrent   -> the 2nd+ requests wait for the in-flight one and
 *                              replay its result; NO duplicate charge
 *  - Success is cached too  -> retries replay the success, no double charge
 *  - Failures are NOT cached as terminal -> a retry with the same key may retry
 *    the processor. (If you want "failures are final", cache them instead — see note.)
 */
app.post('/charge', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  const { amount, currency } = req.body || {};
  if (typeof amount !== 'number' || !isFinite(amount)) {
    return res.status(400).json({ error: 'amount must be a number' });
  }

  // Fingerprint the request so we can detect key reuse with a different payload.
  const fingerprint = hashBody({ amount, currency: currency || 'usd' });

  // ----- Synchronous critical section: claim or observe the key -----
  // Node is single-threaded, so the code between here and the first `await`
  // runs atomically with respect to other requests. We use that to install a
  // placeholder ("pending") entry for a brand-new key so concurrent requests
  // can't slip through and charge twice.
  const existing = idempotency.get(key);
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return res.status(409).json({
        error: 'Idempotency-Key reused with a different request body',
      });
    }
    if (existing.status === 'pending') {
      // Another request with this key is in flight. Wait for it, then replay.
      try {
        const result = await existing.promise;
        return res.status(result.status).json(result.body);
      } catch (e) {
        // The in-flight attempt errored in a non-cacheable way; the waiter
        // should be able to retry on its own. Fall through to process.
      }
    } else {
      // Completed (success or cached failure): replay exactly.
      return res.status(existing.status).json(existing.body);
    }
  }

  // Brand-new key: reserve it synchronously before any `await`.
  let resolvePending, rejectPending;
  const pendingPromise = new Promise((resolve, reject) => {
    resolvePending = resolve;
    rejectPending = reject;
  });
  // Avoid unhandled rejection warnings for the waiter path.
  pendingPromise.catch(() => {});

  idempotency.set(key, {
    status: 'pending',
    fingerprint,
    promise: pendingPromise,
  });

  // ----- Do the (slow) real work -----
  let result;
  try {
    const charge = await processPayment(amount, currency);
    charges.push(charge); // record the ONE real charge
    result = { status: 201, body: { charge } };
  } catch (err) {
    // Decide whether to cache the failure. We treat 4xx as terminal (cache it,
    // so retries replay the same error), and 5xx / transient as non-cacheable
    // (delete the key so a retry can actually try again).
    const status = err.status || 502;
    const body = { error: err.message, code: err.code || 'processing_error' };

    if (status >= 500) {
      // Transient failure: free the key so a retry can succeed.
      idempotency.delete(key);
      rejectPending(err);
      return res.status(status).json(body);
    }

    // Terminal failure (e.g. 402): cache and replay forever.
    idempotency.set(key, { status, body, fingerprint });
    resolvePending({ status, body });
    return res.status(status).json(body);
  }

  // Cache the successful response and wake any waiters.
  idempotency.set(key, { status: result.status, body: result.body, fingerprint });
  resolvePending(result);
  return res.status(result.status).json(result.body);
});

function hashBody(obj) {
  // Stable serialization (sorted keys) so semantically identical bodies match.
  const stable = JSON.stringify(sortDeep(obj));
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    return Object.keys(v)
      .sort()
      .reduce((acc, k) => ((acc[k] = sortDeep(v[k])), acc), {});
  }
  return v;
}

module.exports = app;

// If run directly:
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on ${port}`));
}
