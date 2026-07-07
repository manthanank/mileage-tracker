const express = require('express');
const { body } = require('express-validator');
const { register, login, refresh, logout } = require('../controllers/authController');
const { validate } = require('../middleware/validation');

const router = express.Router();

router.post(
  '/register',
  [
    body('username', 'Username is required').notEmpty().trim(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    validate,
  ],
  register
);

router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').exists(),
    validate,
  ],
  login
);

router.post(
  '/refresh',
  [
    body('refreshToken', 'Refresh token is required').notEmpty(),
    validate,
  ],
  refresh
);

router.post(
  '/logout',
  [
    body('refreshToken', 'Refresh token is required').notEmpty(),
    validate,
  ],
  logout
);

module.exports = router;
