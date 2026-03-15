const fs = require('fs');
const path = require('path');

const MAX_ENTRIES = 200;
const entries = [];
const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'download.log');

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function formatLine(entry) {
  return `[${entry.timestamp}] [${entry.level}] ${entry.message}`;
}

function append(level, message, meta = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  try {
    ensureLogDir();
    fs.appendFileSync(logFile, formatLine(entry) + '\n', 'utf8');
  } catch (err) {
    console.error('[download-log-store] failed to append log:', err.message);
  }

  return entry;
}

function info(message, meta = null) {
  return append('info', message, meta);
}

function error(message, meta = null) {
  return append('error', message, meta);
}

function getRecent(limit = 100) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, MAX_ENTRIES));
  return entries.slice(-safeLimit).reverse();
}

function getLogFilePath() {
  return logFile;
}

module.exports = {
  info,
  error,
  getRecent,
  getLogFilePath
};
