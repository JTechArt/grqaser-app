const express = require('express');

function createCategoriesRouter(dbHolder) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const categories = await db.listCategoriesWithBookCount();
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve categories', details: error.message }
      });
    }
  });

  return router;
}

module.exports = createCategoriesRouter;
