/**
 * Crawler Configuration
 * Centralized configuration for the Grqaser crawler application
 */

const path = require('path');

module.exports = {
  // Base settings
  baseUrl: 'https://grqaser.org',
  dbPath: path.join(__dirname, '../../data/grqaser.db'),
  dataDir: path.join(__dirname, '../../data'),
  
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
    maxConcurrentUrls: 1, // sequential by default; increase for parallel (not used in current loop)
    save404s: true
  },
  
  // Browser settings
  browser: {
    headless: true,
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
    file: path.join(__dirname, '../../logs/crawler.log'),
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
        headless: false
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
