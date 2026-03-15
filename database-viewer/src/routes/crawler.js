/**
 * Crawler Monitoring API Routes
 */

const express = require('express');
const Database = require('../models/database');
const router = express.Router();

// Initialize database
const db = new Database();

// Connect to database when route is first accessed
let isConnected = false;
async function ensureConnection() {
  if (!isConnected) {
    await db.connect();
    isConnected = true;
  }
}

/**
 * GET /api/v1/crawler/status
 * Get crawler status
 */
router.get('/status', async (req, res) => {
  try {
    await ensureConnection();
    const stats = await db.getCrawlStats();
    const urlQueue = await db.getUrlQueueStatus();

    const status = {
      is_running: false, // TODO: Implement crawler process monitoring
      last_run: null, // TODO: Get from crawler logs
      total_books: stats.totalBooks,
      discovered_books: stats.booksByStatus.find(s => s.crawl_status === 'discovered')?.count || 0,
      processed_books: stats.booksByStatus.find(s => s.crawl_status === 'completed')?.count || 0,
      failed_books: stats.booksByStatus.find(s => s.crawl_status === 'failed')?.count || 0,
      pending_urls: urlQueue.summary.pending || 0,
      processing_urls: urlQueue.summary.processing || 0,
      completed_urls: urlQueue.summary.completed || 0,
      failed_urls: urlQueue.summary.failed || 0
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting crawler status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve crawler status',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/crawler/urls
 * Get URL queue status
 */
router.get('/urls', async (req, res) => {
  try {
    await ensureConnection();
    const { status } = req.query;
    const urlQueue = await db.getUrlQueueStatus();

    let urls = urlQueue.urls;
    if (status) {
      urls = urls.filter(url => url.status === status);
    }

    res.json({
      success: true,
      data: {
        urls,
        summary: urlQueue.summary
      }
    });
  } catch (error) {
    console.error('Error getting URL queue:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve URL queue',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/crawler/logs
 * Get crawl logs
 */
router.get('/logs', async (req, res) => {
  try {
    await ensureConnection();
    const {
      page = 1,
      limit = 20,
      level,
      book_id
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      level,
      bookId: book_id ? parseInt(book_id) : null
    };

    const result = await db.getCrawlLogs(options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting crawl logs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve crawl logs',
        details: error.message
      }
    });
  }
});

module.exports = router;
