const express = require('express');

function createAuthorsRouter(dbHolder) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const result = await db.listAuthors({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        search: String(search || '')
      });
      res.json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      console.error('Error getting authors:', error);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve authors', details: error.message }
      });
    }
  });

  router.get('/:id', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Author id must be a positive integer' }
        });
      }
      const author = await db.getAuthorById(id);
      if (!author) {
        return res.status(404).json({
          success: false,
          error: { code: 'AUTHOR_NOT_FOUND', message: `Author with ID ${id} not found` }
        });
      }
      res.json({ success: true, data: author });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve author', details: error.message }
      });
    }
  });

  router.post('/', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const created = await db.createAuthor(req.body?.name);
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      const msg = error?.message || 'Failed to create author';
      const status = /required/i.test(msg) ? 400 : (/already exists/i.test(msg) ? 409 : 500);
      res.status(status).json({
        success: false,
        error: { code: status === 409 ? 'AUTHOR_EXISTS' : (status === 400 ? 'VALIDATION_ERROR' : 'DATABASE_ERROR'), message: msg }
      });
    }
  });

  router.put('/:id', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Author id must be a positive integer' }
        });
      }
      const updated = await db.updateAuthor(id, req.body?.name);
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: { code: 'AUTHOR_NOT_FOUND', message: `Author with ID ${id} not found` }
        });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      const msg = error?.message || 'Failed to update author';
      const status = /required/i.test(msg) ? 400 : (/already exists/i.test(msg) ? 409 : 500);
      res.status(status).json({
        success: false,
        error: { code: status === 409 ? 'AUTHOR_EXISTS' : (status === 400 ? 'VALIDATION_ERROR' : 'DATABASE_ERROR'), message: msg }
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Author id must be a positive integer' }
        });
      }
      const deleted = await db.deleteAuthor(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { code: 'AUTHOR_NOT_FOUND', message: `Author with ID ${id} not found` }
        });
      }
      res.json({ success: true, data: deleted });
    } catch (error) {
      const msg = error?.message || 'Failed to delete author';
      const status = /used by existing books/i.test(msg) ? 409 : 500;
      res.status(status).json({
        success: false,
        error: { code: status === 409 ? 'AUTHOR_IN_USE' : 'DATABASE_ERROR', message: msg }
      });
    }
  });

  return router;
}

module.exports = createAuthorsRouter;
