const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');
const { uploadPaymentScreenshot } = require('../middleware/upload');

// Public
router.get('/qr', paymentController.getUPIQR);

// Protected
router.post('/', verifyToken, uploadPaymentScreenshot.single('screenshot'), paymentController.submitPayment);

module.exports = router;
