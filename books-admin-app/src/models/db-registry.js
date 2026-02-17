/**
 * DB registry: active path and discovery of db.{version} databases.
 * One active DB at a time; all others are backups. Used by server and routes.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DB_FILENAME = 'grqaser.db';
const REGISTRY_FILENAME = 'db-registry.json';
const VERSION_DIR_PREFIX = 'db.v';

function getConfig() {
  try {
    return require('../config/config');
  } catch (e) {
    return { database: { path: path.join(__dirname, '../../../data/grqaser.db') } };
  }
}

function getDataRoot() {
  const config = getConfig();
  const defaultPath = config.database.path || path.join(__dirname, '../../../data/grqaser.db');
  const dataRoot = config.database.dataRoot || path.dirname(defaultPath);
  return path.isAbsolute(dataRoot) ? dataRoot : path.resolve(path.join(__dirname, '../..'), dataRoot);
}

function getRegistryPath() {
  const dataRoot = getDataRoot();
  return path.join(dataRoot, REGISTRY_FILENAME);
}

function loadRegistry() {
  const filePath = getRegistryPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data.activePath === 'string') {
        return data;
      }
    }
  } catch (err) {
    console.warn('DB registry load failed:', err.message);
  }
  return { activePath: null };
}

function saveRegistry(data) {
  const filePath = getRegistryPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Discover database paths under data root: directories named db.v1, db.v2, ... each with grqaser.db.
 * Also accepts a single default DB file at data root (grqaser.db) as "default" id.
 */
function discoverDatabases() {
  const dataRoot = getDataRoot();
  const list = [];

  if (!fs.existsSync(dataRoot)) {
    return list;
  }

  const defaultDbPath = path.join(dataRoot, DEFAULT_DB_FILENAME);
  if (fs.existsSync(defaultDbPath)) {
    list.push({ id: 'default', path: defaultDbPath });
  }

  const entries = fs.readdirSync(dataRoot, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (!ent.name.startsWith(VERSION_DIR_PREFIX)) continue;
    const dbPath = path.join(dataRoot, ent.name, DEFAULT_DB_FILENAME);
    if (fs.existsSync(dbPath)) {
      list.push({ id: ent.name, path: dbPath });
    }
  }

  return list.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Resolve current active DB path: env DB_PATH (tests) > registry > config default.
 */
function getActivePath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const config = getConfig();
  const reg = loadRegistry();
  if (reg.activePath && fs.existsSync(reg.activePath)) {
    return reg.activePath;
  }
  return config.database.path || path.join(getDataRoot(), DEFAULT_DB_FILENAME);
}

/**
 * Set which database is active. Path must be one of the discovered DBs.
 */
function setActivePath(newPath) {
  const list = discoverDatabases();
  const normalizedNew = path.normalize(newPath);
  const found = list.find((e) => path.normalize(e.path) === normalizedNew);
  if (!found) {
    throw new Error('Path is not a known database: ' + newPath);
  }
  saveRegistry({ activePath: found.path });
  return found.path;
}

/**
 * Delete a backup database (file and empty parent dir). Fails if path is the active DB.
 */
function deleteBackup(pathOrId) {
  const activePath = getActivePath();
  const list = discoverDatabases();
  let targetPath = null;
  if (pathOrId.includes(path.sep) || pathOrId.includes('/')) {
    targetPath = path.normalize(pathOrId);
  } else {
    const entry = list.find((e) => e.id === pathOrId);
    if (entry) targetPath = path.normalize(entry.path);
  }
  if (!targetPath) {
    throw new Error('Unknown database: ' + pathOrId);
  }
  if (path.normalize(activePath) === targetPath) {
    throw new Error('Cannot delete the active database');
  }
  const listNormalized = list.map((e) => path.normalize(e.path));
  if (!listNormalized.includes(targetPath)) {
    throw new Error('Path is not a known database: ' + pathOrId);
  }
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
  const parentDir = path.dirname(targetPath);
  if (parentDir !== getDataRoot() && fs.existsSync(parentDir)) {
    try {
      const remaining = fs.readdirSync(parentDir);
      if (remaining.length === 0) {
        fs.rmdirSync(parentDir);
      }
    } catch (err) {
      console.warn('Could not remove empty parent dir:', parentDir, err.message);
    }
  }
}

/**
 * List known DBs with active flag. Id is directory name (db.v1) or "default".
 */
function listDatabases() {
  const activePath = getActivePath();
  const list = discoverDatabases();
  return list.map((e) => ({
    id: e.id,
    path: e.path,
    active: path.normalize(e.path) === path.normalize(activePath)
  }));
}

module.exports = {
  getDataRoot,
  getRegistryPath,
  loadRegistry,
  saveRegistry,
  discoverDatabases,
  getActivePath,
  setActivePath,
  deleteBackup,
  listDatabases,
  DEFAULT_DB_FILENAME,
  VERSION_DIR_PREFIX
};
