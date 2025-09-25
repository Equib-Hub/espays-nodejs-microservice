const { body, validationResult } = require('express-validator');

const validateCreateWallet = [
  body('mnemonic')
    .optional()
    .isString()
    .withMessage('Mnemonic must be a string'),
  body('mnemonic')
    .optional()
    .isLength({ min: 12 })
    .withMessage('Mnemonic must be at least 12 words long'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  validateCreateWallet,
};