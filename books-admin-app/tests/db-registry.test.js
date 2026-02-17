/**
 * Unit tests for DB registry: discover, active path, set active, delete backup.
 * Uses temp dir and fs only (no sqlite3). Story 6.2.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('db-registry', () => {
  let dataRoot;
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
    dataRoot = path.join(os.tmpdir(), 'grqaser-db-registry-test-' + Date.now());
    fs.mkdirSync(dataRoot, { recursive: true });
    process.env.DB_DATA_ROOT = dataRoot;
    delete process.env.DB_PATH;
  });

  afterAll(() => {
    process.env = originalEnv;
    try {
      fs.rmSync(dataRoot, { recursive: true });
    } catch (e) {
      // ignore
    }
  });

  beforeEach(() => {
    delete process.env.DB_PATH;
    if (fs.existsSync(dataRoot)) {
      for (const name of fs.readdirSync(dataRoot)) {
        const p = path.join(dataRoot, name);
        if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true });
        else fs.unlinkSync(p);
      }
    }
  });

  function createDbAt(relativePath) {
    const full = path.join(dataRoot, relativePath);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(full, 'sqlite placeholder');
    return full;
  }

  it('discovers default grqaser.db and db.v* directories', () => {
    createDbAt('grqaser.db');
    createDbAt(path.join('db.v1', 'grqaser.db'));
    createDbAt(path.join('db.v2', 'grqaser.db'));
    jest.isolateModules(() => {
      const registry = require('../src/models/db-registry');
      const list = registry.discoverDatabases();
      expect(list.length).toBe(3);
      const ids = list.map((e) => e.id).sort();
      expect(ids).toContain('default');
      expect(ids).toContain('db.v1');
      expect(ids).toContain('db.v2');
    });
  });

  it('getActivePath returns env DB_PATH when set', () => {
    const customPath = path.join(dataRoot, 'custom.db');
    fs.writeFileSync(customPath, '');
    process.env.DB_PATH = customPath;
    jest.isolateModules(() => {
      const registry = require('../src/models/db-registry');
      expect(registry.getActivePath()).toBe(customPath);
    });
  });

  it('setActivePath and listDatabases mark active', () => {
    createDbAt('grqaser.db');
    createDbAt(path.join('db.v1', 'grqaser.db'));
    jest.isolateModules(() => {
      const registry = require('../src/models/db-registry');
      const list = registry.listDatabases();
      expect(list.length).toBe(2);
      const defaultEntry = list.find((e) => e.id === 'default');
      const v1Entry = list.find((e) => e.id === 'db.v1');
      expect(defaultEntry).toBeDefined();
      expect(v1Entry).toBeDefined();
      registry.setActivePath(v1Entry.path);
      const after = registry.listDatabases();
      const active = after.find((e) => e.active);
      expect(active.id).toBe('db.v1');
      expect(registry.getActivePath()).toBe(v1Entry.path);
    });
  });

  it('deleteBackup removes backup file and forbids deleting active', () => {
    createDbAt('grqaser.db');
    createDbAt(path.join('db.v1', 'grqaser.db'));
    jest.isolateModules(() => {
      const registry = require('../src/models/db-registry');
      registry.setActivePath(path.join(dataRoot, 'db.v1', 'grqaser.db'));
      expect(() => registry.deleteBackup('db.v1')).toThrow('Cannot delete the active');
      registry.deleteBackup('default');
      const list = registry.listDatabases();
      expect(list.find((e) => e.id === 'default')).toBeUndefined();
      expect(list.find((e) => e.id === 'db.v1')).toBeDefined();
    });
  });

  it('deleteBackup by id removes only backup', () => {
    createDbAt(path.join('db.v1', 'grqaser.db'));
    createDbAt(path.join('db.v2', 'grqaser.db'));
    jest.isolateModules(() => {
      const registry = require('../src/models/db-registry');
      registry.setActivePath(path.join(dataRoot, 'db.v1', 'grqaser.db'));
      registry.deleteBackup('db.v2');
      const list = registry.listDatabases();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('db.v1');
    });
  });
});
