/**
 * Articles router — STARTER (validation defined INLINE).
 *
 * PROBLEM: the validation chains and the validationResult check live right here
 * in the route file. They belong in validators/ (the chains) and utils/ (the
 * validateRequest helper).
 *
 * TODO:
 *   - Move the createArticle / updateArticle chains to validators/article.validator.js
 *     and import them here.
 *   - Move the inline (req,res,next) validationResult check into
 *     utils/validateRequest.js and import it here.
 *   - Wrap the async controller calls with utils/asyncHandler.js instead of try/catch.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('./../controllers/articlesController');
const { createArticle, updateArticle } = require('./../validators/article.validator');
const asyncHandler = require('./../utils/asyncHandler');
const validateRequest = require('./../utils/validateRequest');

router.get('/', asyncHandler(ctrl.list));

router.post(
  '/',
  createArticle,
  validateRequest,
  asyncHandler(ctrl.create)
);

router.patch(
  '/:id',
  updateArticle,
  validateRequest,
  asyncHandler(ctrl.update)
);

module.exports = router;
