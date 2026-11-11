const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, errors.array()[0].msg, 400, errors.array());
  }
  next();
};

// Public routes
router.post('/register', [
  body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ max: 150 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian mobile number is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
], validate, register);

router.post('/login', [
  body('identifier').notEmpty().withMessage('Email or mobile is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, login);

router.post('/logout', logout);

// Protected routes
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, [
  body('full_name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('mobile').optional().matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number is required'),
], validate, updateProfile);

module.exports = router;
