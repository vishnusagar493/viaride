
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const { errorResponse } = require('../utils/apiResponse');

const allowedImageTypes = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp'
];

const allowedDocTypes = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf'
];

const MAX_SIZE =
  parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;

// Vercel writable temporary storage
const UPLOAD_ROOT = path.join(os.tmpdir(), 'uploads');

// Generate secure filename
const generateSecureFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const randomName = crypto.randomBytes(16).toString('hex');

  return `${Date.now()}-${randomName}${ext}`;
};

// Create upload directories in /tmp
const createUploadDirectory = (folder) => {
  const uploadPath = path.join(UPLOAD_ROOT, folder);

  fs.mkdirSync(uploadPath, { recursive: true });

  return uploadPath;
};

// Create separate storage configurations
const createStorage = (folder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const uploadPath = createUploadDirectory(folder);
        cb(null, uploadPath);
      } catch (error) {
        cb(error);
      }
    },

    filename: (req, file, cb) => {
      cb(null, generateSecureFilename(file.originalname));
    }
  });
};

// File filters
const imageFilter = (req, file, cb) => {
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Only JPEG, PNG, JPG and WebP images are allowed.'),
      false
    );
  }
};

const documentFilter = (req, file, cb) => {
  if (allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only JPEG, PNG, JPG and PDF files are allowed for documents.'
      ),
      false
    );
  }
};

// Vehicle images upload
const uploadVehicleImage = multer({
  storage: createStorage('vehicles'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter
});

// Documents upload
const uploadDocuments = multer({
  storage: createStorage('documents'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: documentFilter
});

// QR code upload
const uploadQR = multer({
  storage: createStorage('qr'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter
});

// Payment screenshot upload
const uploadPaymentScreenshot = multer({
  storage: createStorage('payments'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter
});

// Export middleware
module.exports = {
  uploadVehicleImage,
  uploadDocuments,
  uploadQR,
  uploadPaymentScreenshot
};
