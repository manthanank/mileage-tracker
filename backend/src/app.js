const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const fuelRoutes = require('./routes/fuel');
const tripRoutes = require('./routes/trips');
const expenseRoutes = require('./routes/expenses');
const serviceRoutes = require('./routes/services');
const documentRoutes = require('./routes/documents');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows loading uploaded files in browser from other origins
}));

// CORS Configuration (Strict Whitelisting in Production)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [
      'http://localhost:4200',
      'http://localhost:3000',
      'https://mileage-tracker-application.vercel.app'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, frontend servers, or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
}));

// Payload Optimization & Input Sanitization
app.use(compression()); // Gzip compress responses
app.use(mongoSanitize()); // Prevent NoSQL Injection query manipulations

// General Rate Limiting
app.use('/api/', apiLimiter);

// Logger Middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static upload files
const uploadsPath = path.join(__dirname, '../', config.uploadDir);
app.use('/uploads', express.static(uploadsPath));

// Mount Routes (Apply strict rate-limit specifically to authentication requests)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health Check Endpoint (checks active MongoDB connection & system memory)
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? 'UP' : 'DOWN';
  
  res.status(isDbConnected ? 200 : 503).json({
    status,
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date()
  });
});

// Base Route Status check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Mileage Tracker API',
    version: '1.1.0',
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
