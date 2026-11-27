'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Three Redis helper functions using ioredis.

const Redis = require('ioredis');

// Redis connection — lazyConnect so importing this module doesn't open a socket
// until the first command; errors are handled per-call below.
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
});

// Avoid noisy unhandled 'error' events crashing the process if Redis is down.
redis.on('error', (err) => {
  console.error('[cache] redis error:', err.message);
});

/**
 * Get a value from Redis.
 *   - hit  → JSON.parse and return the object
 *   - miss → null
 *   - error → log and return null (graceful degradation: the app still works)
 */
async function cacheGet(key) {
  try {
    const raw = await redis.get(key);
    if (raw === null || raw === undefined) {
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[cache] GET ${key} failed:`, err.message);
    return null;
  }
}

/**
 * Set a value in Redis with a TTL in seconds.
 * Errors are logged, not thrown — a failed cache write must not fail the request.
 */
async function cacheSet(key, data, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`[cache] SET ${key} failed:`, err.message);
  }
}

/**
 * Delete a key from Redis.
 * Errors are logged, not thrown.
 */
async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[cache] DEL ${key} failed:`, err.message);
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };
