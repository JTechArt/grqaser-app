/**
 * Databases API: list known DBs (active + backups), set active, delete backup.
 * Story 6.2 — DB versioning.
 */

const express = require('express');
const path = require('path');
const Database = require('../models/database');

function createDatabasesRouter(dbHolder, dbRegistry) {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const list = dbRegistry.listDatabases();
      res.json({ success: true, data: { databases: list } });
    } catch (error) {
      console.error('Error listing databases:', error);
      res.status(500).json({
        success: false,
        error: { code: 'REGISTRY_ERROR', message: 'Failed to list databases', details: error.message }
      });
    }
  });

  router.put('/active', async (req, res) => {
    const { id, path: pathParam } = req.body || {};
    const pathOrId = pathParam || id;
    if (!pathOrId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PATH_OR_ID', message: 'Request body must include "id" or "path"' }
      });
    }
    try {
      const list = dbRegistry.listDatabases();
      const entry = list.find((d) => d.id === pathOrId) ||
        list.find((d) => path.normalize(d.path) === path.normalize(pathOrId));
      if (!entry) {
        return res.status(400).json({
          success: false,
          error: { code: 'UNKNOWN_DATABASE', message: 'Unknown database: ' + pathOrId }
        });
      }
      dbRegistry.setActivePath(entry.path);
      const newPath = dbRegistry.getActivePath();
      const oldDb = dbHolder.getDb();
      const newDb = new Database(newPath);
      await newDb.connect();
      await oldDb.close();
      dbHolder.setDb(newDb);
      const updatedList = dbRegistry.listDatabases();
      res.json({ success: true, data: { activePath: newPath, databases: updatedList } });
    } catch (error) {
      console.error('Error setting active database:', error);
      const status = error.message.includes('not a known') || error.message.includes('Unknown') ? 400 : 500;
      res.status(status).json({
        success: false,
        error: { code: 'SET_ACTIVE_ERROR', message: error.message, details: error.message }
      });
    }
  });

  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ID', message: 'Database id is required' }
      });
    }
    try {
      dbRegistry.deleteBackup(id);
      const list = dbRegistry.listDatabases();
      res.json({ success: true, data: { databases: list } });
    } catch (error) {
      console.error('Error deleting backup:', error);
      const isForbidden = error.message.includes('Cannot delete the active');
      const status = isForbidden ? 403 : (error.message.includes('Unknown') ? 404 : 500);
      res.status(status).json({
        success: false,
        error: { code: isForbidden ? 'CANNOT_DELETE_ACTIVE' : 'DELETE_BACKUP_ERROR', message: error.message }
      });
    }
  });

  return router;
}

module.exports = createDatabasesRouter;
