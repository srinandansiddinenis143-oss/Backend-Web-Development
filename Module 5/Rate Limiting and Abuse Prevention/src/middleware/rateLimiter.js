'use strict';
// middleware/rateLimiter.js
//
// Strict limiter for the auth routes: 5 failed attempts per IP per 15 minutes.
// Successful logins do NOT count against the quota, so a legitimate user who
// logs in repeatedly is never locked out.
//
// ---------------------------------------------------------------------------
// PRODUCTION NOTE — why the default in-memory store is not enough
// ---------------------------------------------------------------------------
// express-rate-limit's default store keeps counters in the process's own
// memory. That works for a single instance, but as soon as you run more than
// one instance behind a load balancer (horizontal scaling, Kubernetes, etc.)
// the counters are partitioned per process:
//
//   - Request 1 -> instance A  (A's counter: 1)
//   - Request 2 -> instance B  (B's counter: 1)
//   - Request 3 -> instance A  (A's counter: 2)
//   - ...
//
// The effective limit becomes `max x N` (N = number of instances), so an
// attacker can spread requests across instances and effectively bypass the
// limit. A process restart also wipes the counters, resetting the window early.
//
// The fix is a SHARED store — typically Redis — so every instance reads and
// writes the same counter atomically. With `rate-limit-redis`:
//
//   const { RedisStore } = require('rate-limit-redis');
//   const { createClient } = require('redis');
//
//   const redisClient = createClient({ url: process.env.REDIS_URL });
//   await redisClient.connect();
//
//   const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 5,
//     standardHeaders: true,
//     legacyHeaders: false,
//     skipSuccessfulRequests: true,
//     store: new RedisStore({
//       sendCommand: (...args) => redisClient.sendCommand(args),
//       prefix: 'rl:auth:',          // namespace so keys don't collide
//     }),
//   });
//
// Redis gives us: (a) one counter shared by all instances, (b) INCR + EXPIRE
// as atomic ops (no race between concurrent requests), (c) TTL-based expiry so
// keys don't leak, and (d) survival across process restarts.
// ---------------------------------------------------------------------------

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  max: 5,                          // 5 failed attempts per IP per window
  standardHeaders: true,           // emit RateLimit-* headers
  legacyHeaders: false,            // disable X-RateLimit-* headers
  skipSuccessfulRequests: true,    // only FAILED attempts count toward the quota
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again later.',
      },
    });
  },
});

module.exports = authLimiter;
