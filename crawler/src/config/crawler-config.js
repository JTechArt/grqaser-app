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
  
  // Crawling settings
  crawling: {
    maxScrolls: 100, // Maximum scroll attempts for infinite scroll
    targetBooks: 500,
    delayBetweenScrolls: 2000, // Wait longer for content to load
    timeout: 30000,
    retryAttempts: 3,
    maxConcurrentUrls: 5, // Process multiple URLs concurrently
    delayBetweenRequests: 1000, // 1 second between requests
    save404s: true // Save 404 responses for analysis
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
