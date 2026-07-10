const express = require('express');
const router = express.Router();
const {
  register,
  login,
  sendSignupOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  getProfile,
  updateProfile
} = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

router.post('/send-otp', sendSignupOtp);          // signup: request a code
router.post('/register', register);               // signup: verify code + create account

router.post('/forgot-password/send-otp', sendForgotPasswordOtp);       // reset: request a code
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);   // reset: verify code + set new password

router.post('/login', login);

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;