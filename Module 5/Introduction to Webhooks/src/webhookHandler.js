'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Export handleWebhook(req, res), used by POST /webhooks in app.js.
// Also export _processedIds (your Set) for test inspection/reset.

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
    .update(req.body) // req.body is the raw string/Buffer here
    .digest('hex');

  // Guard against length mismatch — timingSafeEqual throws if buffers differ in length
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

  // ── 3. Idempotency: already seen this event id? ─────────────────────────
  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  // ── 4. Mark as processed ────────────────────────────────────────────────
  _processedIds.add(event.id);

  // ── 5. Acknowledge fast, then handle async ──────────────────────────────
  res.status(200).json({ status: 'received' });

  setImmediate(() => {
    handleEvent(event).catch((err) => {
      console.error('[webhook] handleEvent failed:', err);
    });
  });
}

module.exports = { handleWebhook, _processedIds };
