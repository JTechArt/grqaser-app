/**
 * Crawler smoke test: run crawler in test mode against test DB to preserve behavior (Task 2).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createTestDb, getTestDbPath } = require('./create-test-db');

process.env.NODE_ENV = 'test';

describe('Crawler integration (mode=test)', () => {
  let testDbPath;

  beforeAll(async () => {
    testDbPath = getTestDbPath();
    await createTestDb(testDbPath);
    // Seed one book so test mode has something to select
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(testDbPath);
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO books (id, title, author, crawl_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [1, 'Test Book', 'Test Author', 'completed', new Date().toISOString(), new Date().toISOString()],
        (err) => (err ? reject(err) : resolve())
      );
    });
    await new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('runs crawler in test mode without throwing', async () => {
    process.env.CRAWLER_MODE = 'test';
    process.env.CRAWLER_DB_PATH = testDbPath;
    process.env.DB_PATH = testDbPath;
    const { GrqaserCrawler } = require('grqaser-crawler');

    const cliOverrides = { mode: 'test', testLimit: 1, testDbPath };
    const crawler = new GrqaserCrawler(cliOverrides);

    const initialized = await crawler.initialize();
    expect(initialized).toBe(true);

    await crawler.runUpdateMode();
    await crawler.cleanup();
  }, 60000);
});
