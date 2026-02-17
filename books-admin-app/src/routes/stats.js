/**
 * Statistics API routes. Use createStatsRouter(db) with shared db from server.
 */

const express = require('express');

function createStatsRouter(db) {
  const router = express.Router();

  router.get('/overview', async (req, res) => {
    try {
      const stats = await db.getCrawlStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error getting overview stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve overview statistics', details: error.message }
      });
    }
  });

  router.get('/authors', async (req, res) => {
    try {
      const authors = await db.getAuthorsStats();
      res.json({ success: true, data: { authors } });
    } catch (error) {
      console.error('Error getting authors stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve authors statistics', details: error.message }
      });
    }
  });

  router.get('/categories', async (req, res) => {
    try {
      const categories = await db.all(`
        SELECT category, COUNT(*) as book_count, SUM(duration) as total_duration
        FROM books
        WHERE category IS NOT NULL AND category != 'Unknown'
        GROUP BY category ORDER BY book_count DESC
      `);
      res.json({ success: true, data: { categories } });
    } catch (error) {
      console.error('Error getting categories stats:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve categories statistics', details: error.message }
      });
    }
  });

  return router;
}

module.exports = createStatsRouter;
