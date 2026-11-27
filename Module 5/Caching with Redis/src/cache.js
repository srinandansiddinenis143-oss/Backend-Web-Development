'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Three Redis helper functions using ioredis.

const Redis = require('ioredis');

// Create the Redis client once. lazyConnect defers the socket open until the
// first command, so importing this module never blocks on an unavailable Redis.
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
});

// ioredis emits 'error' events; without a listener Node may treat them as
// unhandled and crash the process when Redis is down.
redis.on('error', (err) => {
  console.error('[cache] redis error:', err.message);
});

// cacheGet(key)
//   - redis.get(key) → string | null
//   - string → JSON.parse and return the object
//   - null   → return null (cache miss)
//   - error  → log and return null (graceful degradation)
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

// cacheSet(key, data, ttlSeconds)
//   - redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
//   - error → log only (never fail the request because a cache write failed)
async function cacheSet(key, data, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`[cache] SET ${key} failed:`, err.message);
  }
}

// cacheDel(key)
//   - redis.del(key)
//   - error → log only
async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[cache] DEL ${key} failed:`, err.message);
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };
