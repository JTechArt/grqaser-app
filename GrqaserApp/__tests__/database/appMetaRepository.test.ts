jest.mock('react-native-sqlite-storage');

const {
  __mockExecuteSql: mockExecuteSql,
  __mockClose: mockClose,
  __mockTransaction: mockTransaction,
  __mockOpenDatabase: mockOpenDatabase,
} = require('react-native-sqlite-storage');

import {
  appMetaRepository,
  initAppMetaDb,
  closeAppMetaDb,
} from '../../src/database/appMetaRepository';
import {ManagedDatabase} from '../../src/types/book';

function makeRows(items: Record<string, unknown>[]) {
  return [
    {
      rows: {
        length: items.length,
        item: (i: number) => items[i],
      },
    },
  ];
}

const sampleDbRow = {
  id: 'db-1',
  display_name: 'My Database',
  source_url: 'https://example.com/db.sqlite',
  file_path: '/data/db.sqlite',
  file_size_bytes: 1024000,
  downloaded_at: '2026-01-01T00:00:00Z',
  is_active: 1,
};

const sampleManagedDb: ManagedDatabase = {
  id: 'db-1',
  displayName: 'My Database',
  sourceUrl: 'https://example.com/db.sqlite',
  filePath: '/data/db.sqlite',
  fileSizeBytes: 1024000,
  downloadedAt: '2026-01-01T00:00:00Z',
  isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('appMetaRepository', () => {
  describe('initAppMetaDb', () => {
    it('opens database and creates managed_databases table', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      expect(mockOpenDatabase).toHaveBeenCalledWith(
        expect.objectContaining({name: 'meta.db'}),
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS managed_databases'),
      );
    });
  });

  describe('listDatabases', () => {
    it('returns all managed databases', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleDbRow]));

      const dbs = await appMetaRepository.listDatabases();
      expect(dbs).toHaveLength(1);
      expect(dbs[0].id).toBe('db-1');
      expect(dbs[0].displayName).toBe('My Database');
      expect(dbs[0].isActive).toBe(true);
    });
  });

  describe('getActiveDatabase', () => {
    it('returns the active database', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleDbRow]));

      const db = await appMetaRepository.getActiveDatabase();
      expect(db).not.toBeNull();
      expect(db!.id).toBe('db-1');
      expect(db!.isActive).toBe(true);
    });

    it('returns null when no active database', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const db = await appMetaRepository.getActiveDatabase();
      expect(db).toBeNull();
    });
  });

  describe('setActiveDatabase', () => {
    it('deactivates all then activates specified ID via transaction', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');

      const txExec = jest.fn().mockResolvedValue([{rows: {length: 0}}]);
      mockTransaction.mockImplementationOnce(async (cb: Function) => {
        await cb({executeSql: txExec});
      });

      await appMetaRepository.setActiveDatabase('db-1');

      expect(txExec).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = 0'),
      );
      expect(txExec).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = 1'),
        ['db-1'],
      );
    });
  });

  describe('addDatabase', () => {
    it('inserts a managed database entry', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.addDatabase(sampleManagedDb);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        [
          'db-1',
          'My Database',
          'https://example.com/db.sqlite',
          '/data/db.sqlite',
          1024000,
          '2026-01-01T00:00:00Z',
          1,
        ],
      );
    });
  });

  describe('removeDatabase', () => {
    it('deletes the specified database entry', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.removeDatabase('db-1');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM managed_databases'),
        ['db-1'],
      );
    });
  });

  describe('getDatabaseById', () => {
    it('returns a single database entry', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleDbRow]));

      const db = await appMetaRepository.getDatabaseById('db-1');
      expect(db).not.toBeNull();
      expect(db!.displayName).toBe('My Database');
    });
  });

  describe('closeAppMetaDb', () => {
    it('closes the connection', async () => {
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await initAppMetaDb('meta.db');
      await closeAppMetaDb();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
