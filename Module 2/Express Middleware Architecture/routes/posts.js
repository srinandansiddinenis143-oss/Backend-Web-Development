/**
 * Posts router (already written). Mounted at /posts in app.js.
 *
 * PER-ROUTE MOUNTING TASK:
 *   Import the `auditWrite` middleware and mount it on the POST route ONLY,
 *   so it runs when someone creates a post but NOT when someone reads posts.
 *   This is the per-route mounting example to contrast with the global
 *   middleware mounted in app.js.
 */

const express = require('express');
const router = express.Router();

const auditWrite = require('../middleware/auditWrite');

const posts = [{ id: 1, title: 'Hello World' }];

// Public read — no extra middleware.
router.get('/', (req, res) => {
  res.json({ data: posts });
});

// TODO: add `auditWrite` as PER-ROUTE middleware on this POST route only, e.g.:
//   router.post('/', auditWrite, (req, res) => { ... });
router.post('/', auditWrite,(req, res) => {
  const post = { id: posts.length + 1, title: req.body.title || 'Untitled' };
  posts.push(post);
  res.status(201).json({ data: post });
});

module.exports = router;
