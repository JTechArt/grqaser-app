/**
 * Crawler config store: persist and load crawler config for app-managed runs.
 * Story 6.3. Config is stored in data/crawler-config.json; dbPath is always from registry at run time.
 */

const fs = require('fs');
const path = require('path');

const VALID_MODES = ['full', 'update', 'fix-download-all', 'full-database', 'test'];
const DEFAULT_CONFIG = {
  mode: 'full',
  testLimit: 10,
  updateLimit: null,
  maxConcurrentPages: 1,
  delayBetweenRequests: 1000,
  timeout: 30000,
  retryAttempts: 3,
  maxConcurrentUrls: 1
};

function getConfigPath() {
  const dataRoot = process.env.DB_DATA_ROOT || path.join(__dirname, '../../data');
  return path.join(dataRoot, 'crawler-config.json');
}

function load() {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const data = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...data };
    }
  } catch (e) {
    console.warn('Crawler config load failed:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

function save(data) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const toWrite = { ...DEFAULT_CONFIG, ...data };
  delete toWrite.dbPath;
  fs.writeFileSync(configPath, JSON.stringify(toWrite, null, 2), 'utf8');
  return load();
}

function validate(data) {
  const errors = [];
  if (data.mode != null && !VALID_MODES.includes(data.mode)) {
    errors.push(`mode must be one of: ${VALID_MODES.join(', ')}`);
  }
  if (data.testLimit != null && (typeof data.testLimit !== 'number' || data.testLimit < 1)) {
    errors.push('testLimit must be a positive number');
  }
  if (data.updateLimit != null && (typeof data.updateLimit !== 'number' || data.updateLimit < 1)) {
    errors.push('updateLimit must be null or a positive number');
  }
  if (data.maxConcurrentPages != null && (typeof data.maxConcurrentPages !== 'number' || data.maxConcurrentPages < 1)) {
    errors.push('maxConcurrentPages must be a positive number');
  }
  if (data.delayBetweenRequests != null && (typeof data.delayBetweenRequests !== 'number' || data.delayBetweenRequests < 0)) {
    errors.push('delayBetweenRequests must be a non-negative number');
  }
  if (data.timeout != null && (typeof data.timeout !== 'number' || data.timeout < 1000)) {
    errors.push('timeout must be at least 1000 ms');
  }
  if (data.retryAttempts != null && (typeof data.retryAttempts !== 'number' || data.retryAttempts < 0)) {
    errors.push('retryAttempts must be a non-negative number');
  }
  if (data.maxConcurrentUrls != null && (typeof data.maxConcurrentUrls !== 'number' || data.maxConcurrentUrls < 1)) {
    errors.push('maxConcurrentUrls must be a positive number');
  }
  return errors;
}

module.exports = {
  load,
  save,
  validate,
  DEFAULT_CONFIG,
  VALID_MODES,
  getConfigPath
};
