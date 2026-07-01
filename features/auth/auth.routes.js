const express = require('express');
const authController = require('./auth.controller');
const authValidator = require('./auth.validator');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public Authentication endpoints
router.post('/register', authValidator.validateRegister, authController.register);
router.post('/login', authValidator.validateLogin, authController.login);
router.post('/logout', authController.logout);
router.get('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authValidator.validateForgotPassword, authController.forgotPassword);
router.patch('/reset-password', authValidator.validateResetPassword, authController.resetPassword);
router.post('/refresh', authController.refresh);
router.post('/resend-verification', authValidator.validateResendVerification, authController.resendVerification);

// Protected endpoints
router.get('/me', protect, authController.getCurrentUser);
router.patch('/update-password', protect, authValidator.validateUpdatePassword, authController.updatePassword);

module.exports = router;
