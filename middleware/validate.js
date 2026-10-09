const { body, param, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');

// Sends a 400 with every validation message if any rule failed.
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(400).json({
    error: 'Validation failed',
    details: result.array().map((e) => ({ field: e.path, message: e.msg }))
  });
}

const isObjectId = (v) => typeof v === 'string' && ObjectId.isValid(v) && String(new ObjectId(v)) === v;

const idParam = (name) =>
  param(name).custom(isObjectId).withMessage(`${name} must be a valid 24-character ObjectId`);

// Only plain strings are accepted, which also blocks NoSQL operator objects like {"$ne": null}.
const str = (field, { required = true, max = 200 } = {}) => {
  const chain = body(field);
  if (!required) chain.optional({ nullable: true });
  return chain
    .isString().withMessage(`${field} must be a string`).bail()
    .trim()
    .notEmpty().withMessage(`${field} cannot be empty`)
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters`);
};

const userRules = [
  str('githubId', { max: 50 }),
  str('username', { max: 50 }),
  str('displayName', { required: false, max: 100 }),
  body('email').isString().withMessage('email must be a string').bail().trim()
    .isEmail().withMessage('email must be a valid email address'),
  body('avatarUrl').optional({ nullable: true }).isString().bail().isURL()
    .withMessage('avatarUrl must be a valid URL'),
  body('role').optional().isIn(['user', 'admin']).withMessage("role must be 'user' or 'admin'")
];

const recipeRules = [
  str('title', { max: 150 }),
  str('description', { required: false, max: 1000 }),
  body('ingredients').isArray({ min: 1 }).withMessage('ingredients must be a non-empty array'),
  body('ingredients.*.name').isString().trim().notEmpty()
    .withMessage('each ingredient needs a name'),
  body('ingredients.*.quantity').optional({ nullable: true }).isFloat({ gt: 0 })
    .withMessage('ingredient quantity must be a number greater than 0'),
  body('ingredients.*.unit').optional({ nullable: true }).isString()
    .withMessage('ingredient unit must be a string'),
  body('instructions').isArray({ min: 1 }).withMessage('instructions must be a non-empty array'),
  body('instructions.*').isString().trim().notEmpty()
    .withMessage('each instruction must be a non-empty string'),
  body('prepTimeMinutes').isInt({ min: 0, max: 10000 })
    .withMessage('prepTimeMinutes must be an integer between 0 and 10000'),
  body('cookTimeMinutes').isInt({ min: 0, max: 10000 })
    .withMessage('cookTimeMinutes must be an integer between 0 and 10000'),
  body('servings').isInt({ min: 1, max: 1000 })
    .withMessage('servings must be an integer between 1 and 1000'),
  str('cuisine', { required: false, max: 50 }),
  body('difficulty').isIn(['easy', 'medium', 'hard'])
    .withMessage("difficulty must be 'easy', 'medium' or 'hard'"),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('tags.*').isString().trim().notEmpty().withMessage('each tag must be a non-empty string'),
  body('createdBy').optional({ nullable: true }).custom(isObjectId)
    .withMessage('createdBy must be a valid ObjectId')
];

module.exports = {
  handleValidation,
  idValidator: (name) => [idParam(name), handleValidation],
  userValidators: [...userRules, handleValidation],
  recipeValidators: [...recipeRules, handleValidation]
};
