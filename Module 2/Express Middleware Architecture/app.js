/**
 * Express Middleware Architecture — Build the Pipeline
 *
 * This Express app already has TWO routers mounted (/posts and /users) and NO
 * custom middleware written yet. Your job is to write three middleware and mount
 * them correctly:
 *
 *   1) requestId — attaches a UUID to req (and the X-Request-Id header)   [GLOBAL]
 *   2) logger    — logs method, path, and status                          [GLOBAL]
 *   3) timing    — logs how many milliseconds the request took            [GLOBAL]
 *
 * Then show ONE example of PER-ROUTE mounting vs GLOBAL mounting by mounting the
 * provided `auditWrite` middleware on a single route only (see routes/posts.js).
 *
 * Run it with:  npm start
 * Then hit the API, e.g.:
 *   curl http://localhost:3000/posts
 *   curl -X POST http://localhost:3000/posts -H "Content-Type: application/json" -d '{"title":"Hi"}'
 *   curl http://localhost:3000/users
 */

const express = require('express');

// The two routers are already written and mounted for you.
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');

// Your middleware live in ./middleware — implement them, then mount them below.
const requestId = require('./middleware/requestId');
const logger = require('./middleware/logger');
const timing = require('./middleware/timing');

const app = express();

// Built-in body parser so POST /posts can read req.body (already provided).
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// TODO: mount your GLOBAL middleware here, BEFORE the routers, in a deliberate
//       order. request-id must run first so the logger and timer can read req.id.
//
  app.use(requestId);
  app.use(logger);
  app.use(timing);
// ─────────────────────────────────────────────────────────────────────────────

// Two mounted routers (do not remove these).
app.use('/posts', postsRouter);
app.use('/users', usersRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

module.exports = app;
