jest.mock('react-native-fs');
jest.mock('../../src/database/appMetaRepository', () => ({
  appMetaRepository: {
    listDatabases: jest.fn(),
    getActiveDatabase: jest.fn(),
    getDatabaseById: jest.fn(),
    addDatabase: jest.fn(),
    setActiveDatabase: jest.fn(),
    removeDatabase: jest.fn(),
  },
}));

const {
  __mockDownloadFile: mockDownloadFile,
  __mockExists: mockExists,
  __mockMkdir: mockMkdir,
  __mockUnlink: mockUnlink,
  __mockStat: mockStat,
} = require('react-native-fs');

import {databaseManager} from '../../src/services/databaseManager';
import {appMetaRepository} from '../../src/database/appMetaRepository';
import {ManagedDatabase} from '../../src/types/book';

const mockRepo = appMetaRepository as jest.Mocked<typeof appMetaRepository>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('databaseManager', () => {
  describe('loadDatabaseFromUrl', () => {
    it('downloads a DB file, records it, and sets active if first', async () => {
      mockExists.mockResolvedValueOnce(false);
      mockMkdir.mockResolvedValue(undefined);
      mockDownloadFile.mockReturnValue({
        promise: Promise.resolve({statusCode: 200, bytesWritten: 50000}),
      });
      mockStat.mockResolvedValue({size: 50000});
      mockRepo.listDatabases.mockResolvedValue([]);
      mockRepo.addDatabase.mockResolvedValue(undefined);
      mockRepo.setActiveDatabase.mockResolvedValue(undefined);

      const result = await databaseManager.loadDatabaseFromUrl(
        'https://example.com/catalog.db',
      );

      expect(result.sourceUrl).toBe('https://example.com/catalog.db');
      expect(result.fileSizeBytes).toBe(50000);
      expect(result.isActive).toBe(true);
      expect(result.displayName).toBe('catalog');
      expect(mockRepo.addDatabase).toHaveBeenCalledTimes(1);
      expect(mockRepo.setActiveDatabase).toHaveBeenCalledWith(result.id);
    });

    it('does not set active if other DBs already exist', async () => {
      mockExists.mockResolvedValueOnce(true);
      mockDownloadFile.mockReturnValue({
        promise: Promise.resolve({statusCode: 200, bytesWritten: 30000}),
      });
      mockStat.mockResolvedValue({size: 30000});
      const existingDb: ManagedDatabase = {
        id: 'db-old',
        displayName: 'Old DB',
        sourceUrl: 'https://example.com/old.db',
        filePath: '/data/old.db',
        fileSizeBytes: 10000,
        isActive: true,
      };
      mockRepo.listDatabases.mockResolvedValue([existingDb]);
      mockRepo.addDatabase.mockResolvedValue(undefined);

      const result = await databaseManager.loadDatabaseFromUrl(
        'https://example.com/new.db',
      );

      expect(result.isActive).toBe(false);
      expect(mockRepo.setActiveDatabase).not.toHaveBeenCalled();
    });

    it('rejects invalid URLs', async () => {
      await expect(
        databaseManager.loadDatabaseFromUrl('ftp://bad.url/db'),
      ).rejects.toThrow('Only http:// and https:// URLs are supported');

      await expect(
        databaseManager.loadDatabaseFromUrl(''),
      ).rejects.toThrow('URL is required');
    });

    it('cleans up file on HTTP error', async () => {
      mockExists.mockResolvedValueOnce(true);
      mockDownloadFile.mockReturnValue({
        promise: Promise.resolve({statusCode: 404, bytesWritten: 0}),
      });
      mockUnlink.mockResolvedValue(undefined);

      await expect(
        databaseManager.loadDatabaseFromUrl('https://example.com/missing.db'),
      ).rejects.toThrow('HTTP 404');

      expect(mockUnlink).toHaveBeenCalled();
    });

    it('reports download progress', async () => {
      mockExists.mockResolvedValueOnce(true);
      const progressCb = jest.fn();
      let capturedProgressHandler: Function;

      mockDownloadFile.mockImplementation(({progress}: any) => {
        capturedProgressHandler = progress;
        return {
          promise: Promise.resolve({statusCode: 200, bytesWritten: 10000}),
        };
      });
      mockStat.mockResolvedValue({size: 10000});
      mockRepo.listDatabases.mockResolvedValue([]);
      mockRepo.addDatabase.mockResolvedValue(undefined);
      mockRepo.setActiveDatabase.mockResolvedValue(undefined);

      await databaseManager.loadDatabaseFromUrl(
        'https://example.com/test.db',
        progressCb,
      );

      capturedProgressHandler!({bytesWritten: 5000, contentLength: 10000});
      expect(progressCb).toHaveBeenCalledWith({
        bytesWritten: 5000,
        contentLength: 10000,
        fraction: 0.5,
      });
    });
  });

  describe('listManagedDatabases', () => {
    it('delegates to appMetaRepository', async () => {
      const dbs: ManagedDatabase[] = [
        {
          id: 'db-1',
          displayName: 'DB 1',
          sourceUrl: 'https://example.com/db1.db',
          filePath: '/data/db1.db',
          fileSizeBytes: 1000,
          isActive: true,
        },
      ];
      mockRepo.listDatabases.mockResolvedValue(dbs);

      const result = await databaseManager.listManagedDatabases();
      expect(result).toEqual(dbs);
    });
  });

  describe('getActiveDatabase', () => {
    it('delegates to appMetaRepository', async () => {
      const db: ManagedDatabase = {
        id: 'db-1',
        displayName: 'Active DB',
        sourceUrl: 'https://example.com/active.db',
        filePath: '/data/active.db',
        fileSizeBytes: 5000,
        isActive: true,
      };
      mockRepo.getActiveDatabase.mockResolvedValue(db);

      const result = await databaseManager.getActiveDatabase();
      expect(result).toEqual(db);
    });
  });

  describe('setActiveDatabase', () => {
    it('sets the specified DB as active', async () => {
      const db: ManagedDatabase = {
        id: 'db-2',
        displayName: 'DB 2',
        sourceUrl: 'https://example.com/db2.db',
        filePath: '/data/db2.db',
        fileSizeBytes: 2000,
        isActive: false,
      };
      mockRepo.getDatabaseById.mockResolvedValue(db);
      mockRepo.setActiveDatabase.mockResolvedValue(undefined);

      const result = await databaseManager.setActiveDatabase('db-2');

      expect(result.isActive).toBe(true);
      expect(mockRepo.setActiveDatabase).toHaveBeenCalledWith('db-2');
    });

    it('throws when DB not found', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(null);

      await expect(
        databaseManager.setActiveDatabase('nonexistent'),
      ).rejects.toThrow('Database nonexistent not found');
    });
  });

  describe('refreshDatabase', () => {
    it('downloads a new copy alongside the old one', async () => {
      const existingDb: ManagedDatabase = {
        id: 'db-old',
        displayName: 'Old DB',
        sourceUrl: 'https://example.com/catalog.db',
        filePath: '/data/old.db',
        fileSizeBytes: 10000,
        isActive: true,
      };
      mockRepo.getDatabaseById.mockResolvedValue(existingDb);
      mockExists.mockResolvedValue(true);
      mockDownloadFile.mockReturnValue({
        promise: Promise.resolve({statusCode: 200, bytesWritten: 15000}),
      });
      mockStat.mockResolvedValue({size: 15000});
      mockRepo.listDatabases.mockResolvedValue([existingDb]);
      mockRepo.addDatabase.mockResolvedValue(undefined);

      const result = await databaseManager.refreshDatabase('db-old');

      expect(result.id).not.toBe('db-old');
      expect(result.sourceUrl).toBe('https://example.com/catalog.db');
      expect(result.fileSizeBytes).toBe(15000);
    });

    it('throws when DB not found', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(null);

      await expect(
        databaseManager.refreshDatabase('nonexistent'),
      ).rejects.toThrow('Database nonexistent not found');
    });
  });

  describe('removeDatabase', () => {
    it('deletes file and removes record for non-active DB', async () => {
      const db: ManagedDatabase = {
        id: 'db-2',
        displayName: 'Inactive DB',
        sourceUrl: 'https://example.com/db2.db',
        filePath: '/data/databases/db-2.db',
        fileSizeBytes: 5000,
        isActive: false,
      };
      mockRepo.getDatabaseById.mockResolvedValue(db);
      mockExists.mockResolvedValue(true);
      mockUnlink.mockResolvedValue(undefined);
      mockRepo.removeDatabase.mockResolvedValue(undefined);

      await databaseManager.removeDatabase('db-2');

      expect(mockUnlink).toHaveBeenCalledWith('/data/databases/db-2.db');
      expect(mockRepo.removeDatabase).toHaveBeenCalledWith('db-2');
    });

    it('throws when trying to remove the active DB', async () => {
      const db: ManagedDatabase = {
        id: 'db-active',
        displayName: 'Active DB',
        sourceUrl: 'https://example.com/active.db',
        filePath: '/data/active.db',
        fileSizeBytes: 5000,
        isActive: true,
      };
      mockRepo.getDatabaseById.mockResolvedValue(db);

      await expect(
        databaseManager.removeDatabase('db-active'),
      ).rejects.toThrow('Cannot remove the active database');
    });

    it('throws when DB not found', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(null);

      await expect(
        databaseManager.removeDatabase('nonexistent'),
      ).rejects.toThrow('Database nonexistent not found');
    });

    it('skips file delete if file does not exist on disk', async () => {
      const db: ManagedDatabase = {
        id: 'db-gone',
        displayName: 'Gone DB',
        sourceUrl: 'https://example.com/gone.db',
        filePath: '/data/databases/gone.db',
        fileSizeBytes: 1000,
        isActive: false,
      };
      mockRepo.getDatabaseById.mockResolvedValue(db);
      mockExists.mockResolvedValue(false);
      mockRepo.removeDatabase.mockResolvedValue(undefined);

      await databaseManager.removeDatabase('db-gone');

      expect(mockUnlink).not.toHaveBeenCalled();
      expect(mockRepo.removeDatabase).toHaveBeenCalledWith('db-gone');
    });
  });
});
