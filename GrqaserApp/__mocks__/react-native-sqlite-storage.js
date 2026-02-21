const mockExecuteSql = jest.fn();
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockTransaction = jest.fn().mockImplementation(async cb => {
  await cb({executeSql: mockExecuteSql});
});

const mockDb = {
  executeSql: mockExecuteSql,
  close: mockClose,
  transaction: mockTransaction,
};

const mockOpenDatabase = jest.fn().mockResolvedValue(mockDb);
const enablePromise = jest.fn();

const SQLite = {
  enablePromise,
  openDatabase: mockOpenDatabase,
};

module.exports = SQLite;
module.exports.default = SQLite;
module.exports.__mockDb = mockDb;
module.exports.__mockExecuteSql = mockExecuteSql;
module.exports.__mockClose = mockClose;
module.exports.__mockTransaction = mockTransaction;
module.exports.__mockOpenDatabase = mockOpenDatabase;
