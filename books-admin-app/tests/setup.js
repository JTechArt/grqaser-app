/**
 * Test setup: create test DB and set env for server.
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
