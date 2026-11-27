'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Export handleWebhook(req, res), used by POST /webhooks in app.js.
// Also export _processedIds (your Set) for test inspection/reset.
//
// Steps (in order):
//  1. Verify HMAC-SHA256 signature
//     - Signature header: req.headers['x-webhook-signature'] → 'sha256=<hex>'
//     - Compute: crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('hex')
//     - Compare: crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(received,'hex'))
//     - Mismatch or missing → res.status(401).json({ error: 'Invalid signature' })
//
//  2. Parse body: const event = JSON.parse(req.body)
//
//  3. Idempotency: if _processedIds.has(event.id) → res.status(200).json({ status: 'already_processed' })
//
//  4. Mark: _processedIds.add(event.id)
//
//  5. Acknowledge: res.status(200).json({ status: 'received' })
//     Then call handleEvent(event) inside setImmediate(() => { ... })

const crypto = require('crypto');
const { handleEvent } = require('./eventHandlers');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'whsec_test_secret';

const _processedIds = new Set();

async function handleWebhook(req, res) {
  // ── 1. Verify HMAC-SHA256 signature ─────────────────────────────────────
  const signatureHeader = req.headers['x-webhook-signature'];

  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Expected format: "sha256=<hex>"
  const [scheme, receivedHex] = signatureHeader.split('=');
  if (scheme !== 'sha256' || !receivedHex) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const expectedHex = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body) // raw string/Buffer — must be the exact bytes the sender signed
    .digest('hex');

  // timingSafeEqual throws when buffer lengths differ, so guard first.
  let valid = false;
  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const receivedBuf = Buffer.from(receivedHex, 'hex');
    valid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    valid = false;
  }

  if (!valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // ── 3. Idempotency — already seen this event id? ────────────────────────
  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  // ── 4. Mark as processed (before the ack, so concurrent deliveries can't double-pass) ──
  _processedIds.add(event.id);

  // ── 5. Acknowledge fast, then handle the event asynchronously ───────────
  res.status(200).json({ status: 'received' });

  setImmediate(() => {
    handleEvent(event).catch((err) => {
      console.error('[webhook] handleEvent failed:', err);
    });
  });
}

module.exports = { handleWebhook, _processedIds };
