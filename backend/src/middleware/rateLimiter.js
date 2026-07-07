const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// General API rate limiter (relaxed)
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max * 5, // e.g., 500 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for Authentication attempts (register, login, credentials verification)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // limit each IP to 30 auth requests per 15 minutes
  message: {
    success: false,
    error: 'Too many login or registration attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
};
