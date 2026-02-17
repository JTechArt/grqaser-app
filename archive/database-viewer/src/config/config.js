/**
 * Database Viewer Configuration
 */

const path = require('path');

module.exports = {
  // Server settings
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Database settings
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../../data/grqaser.db'),
    timeout: 30000,
    verbose: false
  },

  // API settings
  api: {
    version: 'v1',
    basePath: '/api/v1',
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100 // limit per IP per window
    }
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(__dirname, '../../logs/app.log'),
    maxSize: '10m',
    maxFiles: 5
  },

  // Pagination settings
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },

  // Security settings
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }
  }
};
