/**
 * Crawler monitoring, start/stop, and config API routes. Story 6.3.
 */

const express = require('express');
const crawlerRunner = require('../services/crawler-runner');
const crawlerConfigStore = require('../services/crawler-config-store');

function createCrawlerRouter(dbHolder, dbRegistry) {
  const router = express.Router();

  router.get('/status', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const stats = await db.getCrawlStats();
      const urlQueue = await db.getUrlQueueStatus();
      const lastStarted = crawlerRunner.getLastRunStartedAt();
      const lastFinished = crawlerRunner.getLastRunFinishedAt();

      const status = {
        is_running: crawlerRunner.isRunning(),
        last_run: lastFinished ? lastFinished.toISOString() : (lastStarted ? lastStarted.toISOString() : null),
        last_run_started_at: lastStarted ? lastStarted.toISOString() : null,
        last_start_error: crawlerRunner.getLastSpawnError() || null,
        total_books: stats.totalBooks,
        discovered_books: stats.booksByStatus.find(s => s.crawl_status === 'discovered')?.count || 0,
        processed_books: stats.booksByStatus.find(s => s.crawl_status === 'completed')?.count || 0,
        failed_books: stats.booksByStatus.find(s => s.crawl_status === 'failed')?.count || 0,
        pending_urls: urlQueue.summary.pending || 0,
        processing_urls: urlQueue.summary.processing || 0,
        completed_urls: urlQueue.summary.completed || 0,
        failed_urls: urlQueue.summary.failed || 0
      };

      console.debug('[route:crawler] GET /status - running: %s, totalBooks: %d', status.is_running, status.total_books);
      res.json({ success: true, data: status });
    } catch (error) {
      console.error('[route:crawler] Error getting status:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve crawler status', details: error.message }
      });
    }
  });

  router.post('/start', async (req, res) => {
    try {
      const storedConfig = crawlerConfigStore.load();
      const activePath = dbRegistry ? dbRegistry.getActivePath() : process.env.DB_PATH;
      const runConfig = {
        ...storedConfig,
        dbPath: activePath
      };
      console.debug('[route:crawler] POST /start - config: %j', { ...runConfig, dbPath: activePath });
      crawlerRunner.startCrawler(runConfig);
      await new Promise((r) => setTimeout(r, 400));
      if (!crawlerRunner.isRunning()) {
        const spawnErr = crawlerRunner.getLastSpawnError();
        if (spawnErr) {
          console.error('[route:crawler] Subprocess failed after spawn: %s', spawnErr);
          return res.status(500).json({
            success: false,
            error: {
              code: 'CRAWLER_START_ERROR',
              message: 'Crawler subprocess failed to start',
              details: spawnErr
            }
          });
        }
      }
      console.debug('[route:crawler] Crawler started successfully');
      res.json({ success: true, data: { started: true, message: 'Crawler started' } });
    } catch (error) {
      if (error.code === 'CRAWLER_ALREADY_RUNNING') {
        console.warn('[route:crawler] Start rejected - already running');
        return res.status(409).json({
          success: false,
          error: { code: 'CRAWLER_ALREADY_RUNNING', message: error.message }
        });
      }
      if (error.code === 'CRAWLER_ENTRY_MISSING') {
        console.error('[route:crawler] Crawler not available: %s', error.message);
        return res.status(500).json({
          success: false,
          error: { code: error.code, message: error.message }
        });
      }
      console.error('[route:crawler] Unexpected error starting crawler:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CRAWLER_START_ERROR', message: error.message, details: error.message }
      });
    }
  });

  router.post('/stop', (req, res) => {
    try {
      console.debug('[route:crawler] POST /stop');
      const result = crawlerRunner.stopCrawler();
      console.debug('[route:crawler] Stop result: %j', result);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[route:crawler] Error stopping:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CRAWLER_STOP_ERROR', message: error.message }
      });
    }
  });

  router.get('/config', (req, res) => {
    try {
      const config = crawlerConfigStore.load();
      const activePath = dbRegistry ? dbRegistry.getActivePath() : process.env.DB_PATH;
      console.debug('[route:crawler] GET /config - mode: %s, dbPath: %s', config.mode, activePath);
      res.json({ success: true, data: { ...config, dbPath: activePath } });
    } catch (error) {
      console.error('[route:crawler] Error getting config:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'Failed to get crawler config', details: error.message }
      });
    }
  });

  router.put('/config', (req, res) => {
    try {
      const body = req.body || {};
      console.debug('[route:crawler] PUT /config - body: %j', body);
      const errors = crawlerConfigStore.validate(body);
      if (errors.length > 0) {
        console.warn('[route:crawler] Config validation failed: %j', errors);
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: errors.join('; '), details: errors }
        });
      }
      const updated = crawlerConfigStore.save(body);
      const activePath = dbRegistry ? dbRegistry.getActivePath() : process.env.DB_PATH;
      res.json({ success: true, data: { ...updated, dbPath: activePath } });
    } catch (error) {
      console.error('[route:crawler] Error saving config:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'Failed to save crawler config', details: error.message }
      });
    }
  });

  router.get('/urls', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const { status } = req.query;
      const urlQueue = await db.getUrlQueueStatus();

      let urls = urlQueue.urls;
      if (status) {
        urls = urls.filter(url => url.status === status);
      }

      console.debug('[route:crawler] GET /urls - filter: %s, count: %d', status || 'all', urls.length);
      res.json({
        success: true,
        data: { urls, summary: urlQueue.summary }
      });
    } catch (error) {
      console.error('[route:crawler] Error getting URL queue:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve URL queue', details: error.message }
      });
    }
  });

  router.get('/logs', async (req, res) => {
    const db = dbHolder.getDb();
    try {
      const { page = 1, limit = 20, level, book_id } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        level,
        bookId: book_id ? parseInt(book_id) : null
      };

      console.debug('[route:crawler] GET /logs - page: %d, limit: %d, level: %s', options.page, options.limit, level || 'all');
      const result = await db.getCrawlLogs(options);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[route:crawler] Error getting crawl logs:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve crawl logs', details: error.message }
      });
    }
  });

  return router;
}

module.exports = createCrawlerRouter;
