/**
 * Test setup: create test DB and connect server once for all test files.
 * Must run before any test file that requires ../src/server.
 */
const { createTestDb, getTestDbPath } = require('./create-test-db');

async function setup() {
  if (process.env.TEST_DB_PATH) {
    return process.env.TEST_DB_PATH;
  }
  const testDbPath = getTestDbPath();
  await createTestDb(testDbPath);
  process.env.TEST_DB_PATH = testDbPath;
  process.env.DB_PATH = testDbPath;
  return testDbPath;
}

module.exports = { setup };
