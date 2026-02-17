/**
 * Crawler runner: start/stop crawler as subprocess. One run at a time.
 * Story 6.3.
 */

const { spawn } = require('child_process');
const path = require('path');

const VALID_MODES = ['full', 'update', 'fix-download-all', 'full-database', 'test'];

let childProcess = null;
let lastRunStartedAt = null;
let lastRunFinishedAt = null;

function getCrawlerPackageRoot() {
  try {
    const mainPath = require.resolve('grqaser-crawler');
    return path.dirname(path.dirname(mainPath));
  } catch (e) {
    return path.join(__dirname, '../../node_modules/grqaser-crawler');
  }
}

/**
 * Start the crawler subprocess with given config. Config must include dbPath (active path).
 * Returns { started: true } or throws if already running.
 */
function startCrawler(config) {
  if (childProcess) {
    const err = new Error('Crawler is already running');
    err.code = 'CRAWLER_ALREADY_RUNNING';
    throw err;
  }
  const crawlerRoot = getCrawlerPackageRoot();
  const env = {
    ...process.env,
    CRAWLER_DB_PATH: config.dbPath || process.env.DB_PATH,
    CRAWLER_MODE: config.mode || 'full',
    NODE_ENV: process.env.NODE_ENV || 'production'
  };
  if (config.testLimit != null) env.CRAWLER_TEST_LIMIT = String(config.testLimit);
  if (config.updateLimit != null) env.CRAWLER_UPDATE_LIMIT = String(config.updateLimit);
  if (config.maxConcurrentPages != null) env.CRAWLER_MAX_CONCURRENT_PAGES = String(config.maxConcurrentPages);

  const child = spawn('node', ['src/crawler.js'], {
    cwd: crawlerRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  childProcess = child;
  lastRunStartedAt = new Date();

  child.on('exit', (code, signal) => {
    childProcess = null;
    lastRunFinishedAt = new Date();
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[crawler] ${data}`);
  });
  child.stderr.on('data', (data) => {
    process.stderr.write(`[crawler] ${data}`);
  });

  return { started: true };
}

/**
 * Stop the running crawler (SIGTERM). No-op if not running.
 */
function stopCrawler() {
  if (!childProcess) {
    return { stopped: false, message: 'Crawler is not running' };
  }
  childProcess.kill('SIGTERM');
  childProcess = null;
  return { stopped: true };
}

function isRunning() {
  return !!childProcess;
}

function getLastRunStartedAt() {
  return lastRunStartedAt;
}

function getLastRunFinishedAt() {
  return lastRunFinishedAt;
}

module.exports = {
  startCrawler,
  stopCrawler,
  isRunning,
  getLastRunStartedAt,
  getLastRunFinishedAt,
  VALID_MODES,
  getCrawlerPackageRoot
};
