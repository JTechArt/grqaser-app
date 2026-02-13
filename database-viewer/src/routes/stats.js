/**
 * Statistics API Routes
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
 * GET /api/v1/stats/overview
 * Get overall statistics
 */
router.get('/overview', async (req, res) => {
  try {
    await ensureConnection();
    const stats = await db.getCrawlStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting overview stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve overview statistics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/stats/authors
 * Get authors statistics
 */
router.get('/authors', async (req, res) => {
  try {
    await ensureConnection();
    const authors = await db.getAuthorsStats();

    res.json({
      success: true,
      data: { authors }
    });
  } catch (error) {
    console.error('Error getting authors stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve authors statistics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/v1/stats/categories
 * Get categories statistics
 */
router.get('/categories', async (req, res) => {
  try {
    await ensureConnection();
    const categories = await db.all(`
      SELECT category, COUNT(*) as book_count, SUM(duration) as total_duration
      FROM books 
      WHERE category IS NOT NULL AND category != 'Unknown'
      GROUP BY category
      ORDER BY book_count DESC
    `);

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error getting categories stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve categories statistics',
        details: error.message
      }
    });
  }
});

module.exports = router;
