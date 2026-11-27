'use strict';

// ─── YOUR FILE, implement this ───────────────────────────────────────────────
// In-memory OTP store for email verification.

const store = new Map();

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

/**
 * Returns a random 6-digit numeric string, e.g. '183726'.
 * padStart keeps leading zeros so the result is always exactly 6 chars.
 */
function generateOTP() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

/**
 * Saves the OTP for `email` with a 10-minute expiry and attempts = 0.
 * Overwrites any existing entry (so a resend resets expiry + attempts).
 */
function storeOTP(email, otp) {
  store.set(email, {
    otp,
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
  });
}

/**
 * Verifies `code` for `email`. Guards checked IN ORDER:
 *   1. not found      -> { ok: false, reason: 'not_found' }          (401)
 *   2. expired        -> { ok: false, reason: 'expired' }             (410, delete)
 *   3. attempts >= 3  -> { ok: false, reason: 'too_many_attempts' }   (429)
 *   4. wrong code     -> { ok: false, reason: 'wrong_code' }          (401, attempts++)
 *   5. correct        -> delete (single-use), { ok: true }
 */
function verifyOTP(email, code) {
  const entry = store.get(email);

  if (!entry) {
    return { ok: false, reason: 'not_found' };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return { ok: false, reason: 'expired' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (entry.otp !== String(code)) {
    entry.attempts += 1;
    return { ok: false, reason: 'wrong_code' };
  }

  store.delete(email);
  return { ok: true };
}

/**
 * Logs that the email is verified. In production: update the DB.
 */
function markVerified(email) {
  console.log(`[otp] email verified: ${email}`);
}

module.exports = { generateOTP, storeOTP, verifyOTP, markVerified, _store: store };
