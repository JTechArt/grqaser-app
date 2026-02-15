/**
 * Database Viewer Server
 * Express server for viewing Grqaser audiobook data
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config/config');
const Database = require('./models/database');

// Import routes
const booksRoutes = require('./routes/books');
const statsRoutes = require('./routes/stats');
const crawlerRoutes = require('./routes/crawler');

// Initialize Express app
const app = express();

// Initialize database
const db = new Database();

// Middleware
app.use(helmet(config.security.helmet));
app.use(compression());
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.server.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit(config.api.rateLimit);
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes (crawler uses shared db instance)
app.use(`${config.api.basePath}/books`, booksRoutes);
app.use(`${config.api.basePath}/stats`, statsRoutes);
app.use(`${config.api.basePath}/crawler`, crawlerRoutes(db));

// Health check endpoint (reflects DB connectivity per AC2)
app.get(`${config.api.basePath}/health`, async (req, res) => {
  const payload = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    }
  };
  try {
    await db.get('SELECT 1');
    payload.data.database = 'connected';
    res.status(200).json(payload);
  } catch (err) {
    payload.success = false;
    payload.data.status = 'degraded';
    payload.data.database = 'disconnected';
    res.status(503).json(payload);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Grqaser Database Viewer API',
    version: '1.0.0',
    endpoints: {
      books: `${config.api.basePath}/books`,
      stats: `${config.api.basePath}/stats`,
      crawler: `${config.api.basePath}/crawler`,
      health: `${config.api.basePath}/health`
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: config.server.env === 'development' ? error.message : undefined
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

// Start server (in test mode only connects DB, does not listen)
async function startServer() {
  try {
    await db.connect();
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const server = app.listen(config.server.port, config.server.host, () => {
      console.log(`🚀 Database Viewer Server running on http://${config.server.host}:${config.server.port}`);
      console.log(`📊 API available at http://${config.server.host}:${config.server.port}${config.api.basePath}`);
      console.log(`🔍 Health check at http://${config.server.host}:${config.server.port}${config.api.basePath}/health`);
    });
    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server (skip in test so supertest can use app without listening)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
module.exports.db = db;
module.exports.startServer = startServer;
