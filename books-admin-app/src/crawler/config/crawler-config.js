/**
 * Crawler Configuration
 * Centralized configuration for the Grqaser crawler application.
 * Mode: full | update | fix-download-all | full-database | test.
 * Override via env CRAWLER_MODE or CLI --mode=value.
 * Base config is merged with environments[NODE_ENV] (Story 1.6).
 */

const path = require('path');

function deepMerge(target, source) {
  if (source == null) return target;
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const s = source[key];
    if (s != null && typeof s === 'object' && !Array.isArray(s)) {
      out[key] = deepMerge(out[key] || {}, s);
    } else {
      out[key] = s;
    }
  }
  return out;
}

const baseConfig = {
  // Base settings
  baseUrl: 'https://grqaser.org',
  // DB path: env for books-admin-app / Story 6.2; else crawler default
  dbPath: process.env.CRAWLER_DB_PATH || process.env.DB_PATH || path.join(__dirname, '../../../../data/grqaser.db'),
  dataDir: path.join(__dirname, '../../../../data'),

  // Crawler mode: full (default) | update | fix-download-all | full-database | test
  // Env: CRAWLER_MODE. CLI: --mode=update
  mode: process.env.CRAWLER_MODE || 'full',

  // Test mode: limit N books, optional separate DB (no writes to main books)
  // Env: CRAWLER_TEST_LIMIT, CRAWLER_TEST_DB_PATH. CLI: --limit=N, --output-db=path
  testLimit: process.env.CRAWLER_TEST_LIMIT ? parseInt(process.env.CRAWLER_TEST_LIMIT, 10) : 10,
  testDbPath: process.env.CRAWLER_TEST_DB_PATH || null,

  // Update modes: optional limit (default no limit); full-database may use multiple pages
  updateLimit: process.env.CRAWLER_UPDATE_LIMIT ? parseInt(process.env.CRAWLER_UPDATE_LIMIT, 10) : null,
  maxConcurrentPages: process.env.CRAWLER_MAX_CONCURRENT_PAGES ? parseInt(process.env.CRAWLER_MAX_CONCURRENT_PAGES, 10) : 1,

  // Crawling settings (rate limiting and pagination)
  crawling: {
    maxScrolls: 100,
    targetBooks: 950, // PRD target: full catalog 950+ books
    maxListingPages: 200, // Cap listing pages to avoid runaway
    delayBetweenScrolls: 2000,
    timeout: 30000,
    retryAttempts: 3,
    // Rate limiting: delays and concurrency
    delayBetweenRequests: 1000, // ms between each URL (listing or detail)
    delayBetweenPages: 1000, // alias for delayBetweenRequests
    maxConcurrentUrls: 1,
    save404s: true,
    // Optional: search/category/author discovery (Story 1.3). Add URLs to queue at init.
    searchQueries: [], // e.g. ['/search?q=audiobook'] — site-dependent
    categoryUrls: [], // e.g. ['/category/1', '/category/2']
    authorUrls: [] // e.g. ['/author/123']
  },
  
  // Browser settings
  browser: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  },
  
  // Database settings
  database: {
    timeout: 30000,
    verbose: false
  },
  
  // Logging settings
  logging: {
    level: 'info', // debug, info, warn, error
    format: 'json', // json, simple
    file: path.join(__dirname, '../../../logs/crawler.log'),
    maxSize: '10m',
    maxFiles: 5
  },
  
  // Environment-specific settings
  environments: {
    development: {
      crawling: {
        maxConcurrentUrls: 2,
        delayBetweenRequests: 2000
      },
      browser: {
        headless: false,
      },
      logging: {
        level: 'debug'
      }
    },
    production: {
      crawling: {
        maxConcurrentUrls: 5,
        delayBetweenRequests: 1000
      },
      browser: {
        headless: true
      },
      logging: {
        level: 'info'
      }
    }
  }
};

const envName = process.env.NODE_ENV || 'production';
const envOverrides = baseConfig.environments && baseConfig.environments[envName];
const merged = envOverrides ? deepMerge({ ...baseConfig }, { ...envOverrides }) : { ...baseConfig };
delete merged.environments;

module.exports = merged;
module.exports.getMergedConfig = function getMergedConfig() {
  return merged;
};
module.exports.deepMerge = deepMerge;
module.exports.baseConfig = baseConfig;
