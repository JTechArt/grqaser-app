#!/usr/bin/env node

const { SequentialCrawler } = require('./src/sequential-crawler');

// Configuration
const config = {
  startId: 1,
  endId: 2000,
  delayBetweenRequests: 1000, // 1 second
  timeout: 15000, // 15 seconds
  save404s: true
};

async function runSequentialCrawler() {
  console.log('🚀 Starting Sequential Book Crawler');
  console.log(`📊 Configuration:`);
  console.log(`   Start ID: ${config.startId}`);
  console.log(`   End ID: ${config.endId}`);
  console.log(`   Delay between requests: ${config.delayBetweenRequests}ms`);
  console.log(`   Timeout: ${config.timeout}ms`);
  console.log(`   Save 404s: ${config.save404s}`);
  console.log('---\n');

  const crawler = new SequentialCrawler();
  
  // Override settings with config
  crawler.settings = {
    ...crawler.settings,
    ...config
  };

  try {
    const initialized = await crawler.initialize();
    if (initialized) {
      await crawler.crawl();
    } else {
      console.error('❌ Failed to initialize sequential crawler');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Sequential crawler execution failed:', error);
    process.exit(1);
  }
}

// Run the crawler
runSequentialCrawler();
