const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const {
  validateRegistrationInput,
  validateLoginInput
} = require('../middleware/validateRequest');

// Rate limiters for sensitive authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
  }
});

// Public auth routes
router.post('/register', authLimiter, validateRegistrationInput, authController.register);
router.post('/login', authLimiter, validateLoginInput, authController.login);
router.post('/logout', authController.logout);
router.get('/csrf', authController.getCsrf);

// Protected auth routes
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, authController.updateProfile);
router.patch('/password', requireAuth, authController.updatePassword);

module.exports = router;
