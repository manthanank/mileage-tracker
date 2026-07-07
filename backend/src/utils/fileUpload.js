const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

let storage;
let isCloudinary = false;

// Check if Cloudinary credentials are provided and are not the placeholder defaults
if (
  config.cloudinary.cloudName && 
  config.cloudinary.apiKey && 
  config.cloudinary.apiSecret && 
  config.cloudinary.cloudName !== 'your_cloud_name'
) {
  try {
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });

    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'mileage_tracker',
        allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
        resource_type: 'auto', // Support both images and PDFs
      },
    });
    isCloudinary = true;
    console.log('FileUpload: Configured with Cloudinary Storage.');
  } catch (err) {
    console.error('FileUpload: Failed to initialize Cloudinary storage, falling back to disk:', err.message);
  }
}

// Fallback to local storage
if (!storage) {
  const uploadDirPath = path.join(__dirname, '../../', config.uploadDir);
  if (!fs.existsSync(uploadDirPath)) {
    fs.mkdirSync(uploadDirPath, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDirPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
  console.log('FileUpload: Configured with Local Disk Storage.');
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});

/**
 * Returns either the direct Cloudinary URL (if path begins with http) or the local filename
 */
const getUploadedFileUrl = (file) => {
  if (!file) return null;
  if (file.path && file.path.startsWith('http')) {
    return file.path;
  }
  return file.filename;
};

// Bind helper property to keep direct middleware import working
upload.getUploadedFileUrl = getUploadedFileUrl;
upload.isCloudinary = isCloudinary;

module.exports = upload;
