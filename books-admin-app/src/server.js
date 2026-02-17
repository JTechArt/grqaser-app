/**
 * Books-admin-app server.
 * Single process: Express (API + static UI) and crawler as in-process library.
 * No authentication; local-only.
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
const createBooksRouter = require('./routes/books');
const createStatsRouter = require('./routes/stats');
const createCrawlerRouter = require('./routes/crawler');

const app = express();
const db = new Database();

app.use(helmet(config.security.helmet));
app.use(compression());
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.server.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

const limiter = rateLimit(config.api.rateLimit);
app.use('/api/', limiter);

app.use(express.static(path.join(__dirname, '../public')));

app.use(`${config.api.basePath}/books`, createBooksRouter(db));
app.use(`${config.api.basePath}/stats`, createStatsRouter(db));
app.use(`${config.api.basePath}/crawler`, createCrawlerRouter(db));

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

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Grqaser Books Admin App (crawler + database-viewer)',
    version: '1.0.0',
    endpoints: {
      books: `${config.api.basePath}/books`,
      stats: `${config.api.basePath}/stats`,
      crawler: `${config.api.basePath}/crawler`,
      health: `${config.api.basePath}/health`
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  });
});

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

async function startServer() {
  try {
    await db.connect();
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const server = app.listen(config.server.port, config.server.host, () => {
      console.log(`🚀 Books Admin App running on http://${config.server.host}:${config.server.port}`);
      console.log(`📊 API at http://${config.server.host}:${config.server.port}${config.api.basePath}`);
      console.log(`🔍 Health at http://${config.server.host}:${config.server.port}${config.api.basePath}/health`);
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

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
module.exports.db = db;
module.exports.startServer = startServer;
