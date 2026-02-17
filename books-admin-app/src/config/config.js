/**
 * Books-admin-app configuration.
 * Port, logging, DB path (placeholder for Story 6.2), and crawler-related settings.
 */

const path = require('path');

module.exports = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  database: {
    // DB path: externalized; Story 6.2 will add versioning/active backup
    path: process.env.DB_PATH || path.join(__dirname, '../../data/grqaser.db'),
    timeout: 30000,
    verbose: false
  },

  api: {
    version: 'v1',
    basePath: '/api/v1',
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
    }
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/app.log'),
    maxSize: '10m',
    maxFiles: 5
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },

  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }
  }
};
