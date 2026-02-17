/**
 * Unit tests for crawler config store. Story 6.3.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('crawler-config-store', () => {
  let originalEnv;
  let testDataRoot;

  beforeAll(() => {
    originalEnv = { ...process.env };
    testDataRoot = path.join(os.tmpdir(), 'grqaser-crawler-config-test-' + Date.now());
    fs.mkdirSync(testDataRoot, { recursive: true });
    process.env.DB_DATA_ROOT = testDataRoot;
  });

  afterAll(() => {
    process.env = originalEnv;
    try {
      fs.rmSync(testDataRoot, { recursive: true });
    } catch (e) {}
  });

  beforeEach(() => {
    process.env.DB_DATA_ROOT = testDataRoot;
    const configPath = path.join(testDataRoot, 'crawler-config.json');
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  });

  it('load returns default config when no file exists', () => {
    jest.isolateModules(() => {
      const store = require('../src/services/crawler-config-store');
      const config = store.load();
      expect(config.mode).toBe('full');
      expect(config.testLimit).toBe(10);
      expect(config.delayBetweenRequests).toBe(1000);
    });
  });

  it('save persists and load returns saved config', () => {
    jest.isolateModules(() => {
      const store = require('../src/services/crawler-config-store');
      store.save({ mode: 'update', testLimit: 5 });
      const config = store.load();
      expect(config.mode).toBe('update');
      expect(config.testLimit).toBe(5);
    });
  });

  it('validate rejects invalid mode', () => {
    jest.isolateModules(() => {
      const store = require('../src/services/crawler-config-store');
      const errors = store.validate({ mode: 'invalid' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('mode'))).toBe(true);
    });
  });

  it('validate accepts valid config', () => {
    jest.isolateModules(() => {
      const store = require('../src/services/crawler-config-store');
      const errors = store.validate({ mode: 'update', testLimit: 3 });
      expect(errors).toEqual([]);
    });
  });
});
