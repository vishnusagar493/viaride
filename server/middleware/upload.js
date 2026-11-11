const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { errorResponse } = require('../utils/apiResponse');

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const allowedDocTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

const generateSecureFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const randomName = crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${randomName}${ext}`;
};

// Vehicle images storage
const vehicleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/vehicles'));
  },
  filename: (req, file, cb) => {
    cb(null, generateSecureFilename(file.originalname));
  },
});

// Document storage (private, only admin access)
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/documents'));
  },
  filename: (req, file, cb) => {
    cb(null, generateSecureFilename(file.originalname));
  },
});

// QR code storage
const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/qr'));
  },
  filename: (req, file, cb) => {
    cb(null, generateSecureFilename(file.originalname));
  },
});

// Payment screenshot storage
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/payments'));
  },
  filename: (req, file, cb) => {
    cb(null, generateSecureFilename(file.originalname));
  },
});

const imageFilter = (req, file, cb) => {
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, JPG and WebP images are allowed.'), false);
  }
};

const documentFilter = (req, file, cb) => {
  if (allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, JPG and PDF files are allowed for documents.'), false);
  }
};

const uploadVehicleImage = multer({
  storage: vehicleStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
});

const uploadDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: documentFilter,
});

const uploadQR = multer({
  storage: qrStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
});

const uploadPaymentScreenshot = multer({
  storage: paymentStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
});

// Ensure payment uploads directory exists
const fs = require('fs');
const paymentDir = path.join(__dirname, '../uploads/payments');
if (!fs.existsSync(paymentDir)) {
  fs.mkdirSync(paymentDir, { recursive: true });
}

module.exports = {
  uploadVehicleImage,
  uploadDocuments,
  uploadQR,
  uploadPaymentScreenshot,
};
