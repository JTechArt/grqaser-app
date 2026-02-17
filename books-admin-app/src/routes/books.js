/**
 * Books API routes. Use createBooksRouter(db) with shared db from server.
 */

const express = require('express');

function createBooksRouter(dbHolder) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const {
        page = 1,
        limit = 20,
        author,
        category,
        crawl_status,
        type,
        duration_min,
        duration_max,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        author,
        category,
        crawlStatus: crawl_status,
        type,
        durationMin: duration_min ? parseInt(duration_min) : null,
        durationMax: duration_max ? parseInt(duration_max) : null,
        sortBy: sort_by,
        sortOrder: sort_order.toUpperCase()
      };

      const result = await db.getBooks(options);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error getting books:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve books', details: error.message }
      });
    }
  });

  router.get('/search', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const { q, page = 1, limit = 20 } = req.query;
      if (!q) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_QUERY', message: 'Search query is required', details: { query: q } }
        });
      }
      const options = { page: parseInt(page), limit: Math.min(parseInt(limit), 100) };
      const result = await db.searchBooks(q, options);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error searching books:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to search books', details: error.message }
      });
    }
  });

  router.get('/:id', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const { id } = req.params;
      const book = await db.getBookById(id);
      if (!book) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOK_NOT_FOUND', message: `Book with ID ${id} not found`, details: { book_id: id } }
        });
      }
      res.json({ success: true, data: book });
    } catch (error) {
      console.error('Error getting book:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve book', details: error.message }
      });
    }
  });

  router.patch('/:id', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Book id must be a number' }
        });
      }
      const existing = await db.getBookById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOK_NOT_FOUND', message: `Book with ID ${id} not found`, details: { book_id: id } }
        });
      }
      const updated = await db.updateBook(id, req.body || {});
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: { code: 'BOOK_NOT_FOUND', message: `Book with ID ${id} not found` }
        });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      const msg = error.message || '';
      const isValidation = msg.includes(';') || /must be|required|between|max length|non-empty|valid URL/.test(msg);
      if (isValidation) {
        const details = msg.includes(';') ? msg.split('; ') : [msg];
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: msg, details }
        });
      }
      console.error('Error updating book:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to update book', details: msg }
      });
    }
  });

  return router;
}

module.exports = createBooksRouter;
