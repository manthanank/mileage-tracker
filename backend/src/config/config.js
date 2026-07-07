const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate required environment variables in production (fail-fast)
const requiredEnv = [];
if (process.env.NODE_ENV === 'production') {
  requiredEnv.push('MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');
}

requiredEnv.forEach((envName) => {
  if (!process.env[envName]) {
    console.error(`\x1b[31m[CRITICAL SETUP ERROR] Missing environment variable in production: ${envName}\x1b[0m`);
    process.exit(1);
  }
});

module.exports = {
  port: process.env.PORT || 3000,
  mongoose: {
    url: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mileage-tracker',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkeychangeinproduction',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkeychangeinproduction',
    accessExpiration: process.env.JWT_EXPIRE || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};
