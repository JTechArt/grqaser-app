jest.mock('react-native-sqlite-storage');
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
}));

const {
  __mockOpenDatabase: mockOpenDatabase,
} = require('react-native-sqlite-storage');

import {openDatabase, openBundledDatabase} from '../../src/database/connection';

describe.skip('database connection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens a regular database', async () => {
    const conn = await openDatabase('grqaser_app_meta.db');
    expect(conn.db).toBeTruthy();
    expect(mockOpenDatabase).toHaveBeenCalledWith(
      expect.objectContaining({name: 'grqaser_app_meta.db'}),
    );
  });

  it('opens bundled database with bundled options', async () => {
    await openBundledDatabase('grqaser.db');
    expect(mockOpenDatabase).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'grqaser.db',
        createFromLocation: '~grqaser.db',
      }),
    );
  });

  it('times out when SQLite open hangs', async () => {
    jest.useFakeTimers();

    try {
      mockOpenDatabase.mockImplementationOnce(() => new Promise(() => {}));

      const pending = openDatabase('slow.db');
      jest.advanceTimersByTime(5000);

      await expect(pending).rejects.toThrow(
        'Timed out opening SQLite database: slow.db',
      );
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });
});
