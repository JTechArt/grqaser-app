const express = require('express');

function createAuthorsRouter(dbHolder) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const authors = await db.listAuthorsWithBookCount();
      res.json({ success: true, data: authors });
    } catch (error) {
      console.error('Error getting authors:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve authors', details: error.message }
      });
    }
  });

  return router;
}

module.exports = createAuthorsRouter;
