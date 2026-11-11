const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { verifyToken } = require('../middleware/auth');
const { uploadDocuments } = require('../middleware/upload');

router.post(
  '/:booking_id/documents',
  verifyToken,
  uploadDocuments.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'driving_licence', maxCount: 1 },
    { name: 'pan_card', maxCount: 1 },
  ]),
  rentalController.uploadDocuments
);

module.exports = router;
