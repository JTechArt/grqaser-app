/**
 * Crawler runner: start/stop crawler as subprocess. One run at a time.
 * Story 6.3.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VALID_MODES = ['full', 'update', 'fix-download-all', 'full-database', 'test'];

let childProcess = null;
let lastRunStartedAt = null;
let lastRunFinishedAt = null;
let lastSpawnError = null;

function getCrawlerRoot() {
  const crawlerDir = path.join(__dirname, '../crawler');
  console.debug('[crawler] Using local crawler at: %s', crawlerDir);
  return crawlerDir;
}

/**
 * Start the crawler subprocess with given config. Config must include dbPath (active path).
 * Returns { started: true } or throws if already running.
 */
function startCrawler(config) {
  lastSpawnError = null;
  if (childProcess) {
    const err = new Error('Crawler is already running');
    err.code = 'CRAWLER_ALREADY_RUNNING';
    throw err;
  }
  const crawlerRoot = getCrawlerRoot();

  const entryPoint = path.join(crawlerRoot, 'crawler.js');
  if (!fs.existsSync(entryPoint)) {
    const msg = `Crawler entry point not found: ${entryPoint}`;
    console.error('[crawler]', msg);
    lastSpawnError = msg;
    lastRunFinishedAt = new Date();
    const err = new Error(msg);
    err.code = 'CRAWLER_ENTRY_MISSING';
    throw err;
  }

  const env = {
    ...process.env,
    CRAWLER_DB_PATH: config.dbPath || process.env.DB_PATH,
    CRAWLER_MODE: config.mode || 'full',
    NODE_ENV: process.env.NODE_ENV || 'production'
  };
  if (config.testLimit != null) env.CRAWLER_TEST_LIMIT = String(config.testLimit);
  if (config.updateLimit != null) env.CRAWLER_UPDATE_LIMIT = String(config.updateLimit);
  if (config.maxConcurrentPages != null) env.CRAWLER_MAX_CONCURRENT_PAGES = String(config.maxConcurrentPages);

  console.debug('[crawler] Starting subprocess:');
  console.debug('[crawler]   cwd: %s', crawlerRoot);
  console.debug('[crawler]   mode: %s', env.CRAWLER_MODE);
  console.debug('[crawler]   dbPath: %s', env.CRAWLER_DB_PATH);
  console.debug('[crawler]   testLimit: %s', env.CRAWLER_TEST_LIMIT || 'n/a');

  const isWin = process.platform === 'win32';
  const child = spawn(
    isWin ? 'cmd.exe' : '/bin/sh',
    isWin ? ['/c', 'node crawler.js'] : ['-c', 'node crawler.js'],
    {
      cwd: crawlerRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  childProcess = child;
  lastRunStartedAt = new Date();
  console.debug('[crawler] Subprocess spawned, pid: %d', child.pid);

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (data) => {
    process.stdout.write(data.toString().replace(/^(?!\s*$)/gm, '[crawler:stdout] '));
  });
  child.stderr.on('data', (data) => {
    process.stderr.write(data.toString().replace(/^(?!\s*$)/gm, '[crawler:stderr] '));
  });

  child.on('error', (err) => {
    lastSpawnError = err.message;
    childProcess = null;
    lastRunFinishedAt = new Date();
    console.error('[crawler] Subprocess error: %s', err.message);
  });

  child.on('exit', (code, signal) => {
    console.debug('[crawler] Subprocess exited, code: %s, signal: %s', code, signal);
    childProcess = null;
    lastRunFinishedAt = new Date();
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

function getLastSpawnError() {
  return lastSpawnError;
}

function clearLastSpawnError() {
  lastSpawnError = null;
}

module.exports = {
  startCrawler,
  stopCrawler,
  isRunning,
  getLastRunStartedAt,
  getLastRunFinishedAt,
  getLastSpawnError,
  clearLastSpawnError,
  VALID_MODES,
  getCrawlerRoot
};
