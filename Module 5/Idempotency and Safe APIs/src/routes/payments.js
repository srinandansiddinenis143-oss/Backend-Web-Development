'use strict';
// src/routes/payments.js

const express = require('express');
const { charges, idempotency, nextChargeId } = require('../store');

const router = express.Router();

router.post('/payments', (req, res) => {
  // Rule 1: Missing key → 400, no charge
  const key = req.headers['idempotency-key'];
  if (!key) {
    return res.status(400).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required',
      },
    });
  }

  // Rule 2: Repeat key → replay stored response, no new charge
  if (idempotency.has(key)) {
    const saved = idempotency.get(key);
    return res.status(saved.status).json(saved.body);
  }

  // Rule 3: New key → charge exactly once
  const charge = {
    id: nextChargeId(),
    amount: req.body?.amount,
    currency: req.body?.currency || 'usd',
  };
  charges.push(charge);

  const body = { charge };
  const status = 201;

  // Store full response (status + body), not just a flag
  idempotency.set(key, { status, body });

  return res.status(status).json(body);
});

module.exports = router;
