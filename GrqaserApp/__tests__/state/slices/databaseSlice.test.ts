jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn().mockResolvedValue({
    executeSql: jest.fn().mockResolvedValue([{rows: {length: 0}}]),
    close: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn(),
  }),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  downloadFile: jest.fn().mockReturnValue({
    promise: Promise.resolve({statusCode: 200, bytesWritten: 1024}),
  }),
  exists: jest.fn().mockResolvedValue(false),
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({size: 1024}),
  readDir: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../src/database/appMetaRepository', () => ({
  appMetaRepository: {
    listDatabases: jest.fn().mockResolvedValue([]),
    getActiveDatabase: jest.fn().mockResolvedValue(null),
    getDatabaseById: jest.fn().mockResolvedValue(null),
    addDatabase: jest.fn().mockResolvedValue(undefined),
    setActiveDatabase: jest.fn().mockResolvedValue(undefined),
    removeDatabase: jest.fn().mockResolvedValue(undefined),
  },
  initAppMetaDb: jest.fn().mockResolvedValue(undefined),
  closeAppMetaDb: jest.fn().mockResolvedValue(undefined),
}));

import {configureStore} from '@reduxjs/toolkit';
import reducer, {
  setActiveDatabase,
  triggerReload,
  setLoading,
  setError,
  setDownloadProgress,
  initializeDatabases,
  switchDatabase,
  fetchManagedDatabases,
  loadNewDatabase,
  refreshDb,
  switchActiveDb,
  removeDb,
} from '../../../src/state/slices/databaseSlice';
import {ManagedDatabase} from '../../../src/types/book';
import {appMetaRepository} from '../../../src/database/appMetaRepository';

const mockRepo = appMetaRepository as jest.Mocked<typeof appMetaRepository>;

const sampleDb: ManagedDatabase = {
  id: 'db-1',
  displayName: 'Test DB',
  sourceUrl: 'https://example.com/test.db',
  filePath: '/data/test.db',
  fileSizeBytes: 500000,
  downloadedAt: '2026-01-01T00:00:00Z',
  isActive: true,
};

const sampleDb2: ManagedDatabase = {
  id: 'db-2',
  displayName: 'Test DB 2',
  sourceUrl: 'https://example.com/test2.db',
  filePath: '/data/test2.db',
  fileSizeBytes: 300000,
  downloadedAt: '2026-01-02T00:00:00Z',
  isActive: false,
};

function createTestStore() {
  return configureStore({reducer: {database: reducer}});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.listDatabases.mockResolvedValue([]);
  mockRepo.getActiveDatabase.mockResolvedValue(null);
});

describe('databaseSlice', () => {
  const initialState = {
    managedDatabases: [],
    activeDbId: null,
    activeDatabase: null,
    isDownloading: false,
    downloadProgress: 0,
    loading: false,
    error: null,
    initialized: false,
  };

  it('returns the initial state', () => {
    expect(reducer(undefined, {type: 'unknown'})).toEqual(initialState);
  });

  describe('setActiveDatabase', () => {
    it('sets the active database and activeDbId', () => {
      const state = reducer(initialState, setActiveDatabase(sampleDb));
      expect(state.activeDatabase).toEqual(sampleDb);
      expect(state.activeDbId).toBe('db-1');
    });

    it('clears the active database', () => {
      const withDb = {...initialState, activeDatabase: sampleDb, activeDbId: 'db-1'};
      const state = reducer(withDb, setActiveDatabase(null));
      expect(state.activeDatabase).toBeNull();
      expect(state.activeDbId).toBeNull();
    });
  });

  describe('triggerReload', () => {
    it('sets initialized to false', () => {
      const initd = {...initialState, initialized: true};
      const state = reducer(initd, triggerReload());
      expect(state.initialized).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      const state = reducer(initialState, setLoading(true));
      expect(state.loading).toBe(true);
    });
  });

  describe('setError', () => {
    it('sets an error message', () => {
      const state = reducer(initialState, setError('Something broke'));
      expect(state.error).toBe('Something broke');
    });

    it('clears the error', () => {
      const withError = {...initialState, error: 'old error'};
      const state = reducer(withError, setError(null));
      expect(state.error).toBeNull();
    });
  });

  describe('setDownloadProgress', () => {
    it('sets download progress fraction', () => {
      const state = reducer(initialState, setDownloadProgress(0.75));
      expect(state.downloadProgress).toBe(0.75);
    });
  });

  describe('initializeDatabases (async thunk)', () => {
    it('sets loading then initialized on success', async () => {
      const store = createTestStore();

      const promise = store.dispatch(initializeDatabases());
      expect(store.getState().database.loading).toBe(true);

      await promise;
      const state = store.getState().database;
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      const appMetaRepo = require('../../../src/database/appMetaRepository');
      appMetaRepo.initAppMetaDb.mockRejectedValueOnce(
        new Error('DB open failed'),
      );

      const store = createTestStore();
      await store.dispatch(initializeDatabases());

      const state = store.getState().database;
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(false);
      expect(state.error).toBe('DB open failed');
    });
  });

  describe('fetchManagedDatabases', () => {
    it('populates managedDatabases and activeDatabase', async () => {
      mockRepo.listDatabases.mockResolvedValue([sampleDb, sampleDb2]);

      const store = createTestStore();
      await store.dispatch(fetchManagedDatabases());

      const state = store.getState().database;
      expect(state.managedDatabases).toHaveLength(2);
      expect(state.activeDatabase).toEqual(sampleDb);
      expect(state.activeDbId).toBe('db-1');
    });

    it('sets activeDatabase to null when no active DB', async () => {
      mockRepo.listDatabases.mockResolvedValue([{...sampleDb, isActive: false}]);

      const store = createTestStore();
      await store.dispatch(fetchManagedDatabases());

      const state = store.getState().database;
      expect(state.managedDatabases).toHaveLength(1);
      expect(state.activeDatabase).toBeNull();
      expect(state.activeDbId).toBeNull();
    });
  });

  describe('loadNewDatabase', () => {
    it('sets isDownloading during load', async () => {
      mockRepo.listDatabases.mockResolvedValue([]);
      mockRepo.addDatabase.mockResolvedValue(undefined);
      mockRepo.setActiveDatabase.mockResolvedValue(undefined);

      const store = createTestStore();
      const promise = store.dispatch(
        loadNewDatabase('https://example.com/new.db'),
      );
      expect(store.getState().database.isDownloading).toBe(true);

      await promise;
      expect(store.getState().database.isDownloading).toBe(false);
    });

    it('sets error on failure', async () => {
      const RNFS = require('react-native-fs');
      RNFS.downloadFile.mockReturnValueOnce({
        promise: Promise.resolve({statusCode: 500, bytesWritten: 0}),
      });

      const store = createTestStore();
      await store.dispatch(loadNewDatabase('https://example.com/bad.db'));

      const state = store.getState().database;
      expect(state.isDownloading).toBe(false);
      expect(state.error).toContain('HTTP 500');
    });
  });

  describe('switchActiveDb', () => {
    it('updates activeDatabase on success', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(sampleDb2);
      mockRepo.listDatabases.mockResolvedValue([
        {...sampleDb, isActive: false},
        {...sampleDb2, isActive: true},
      ]);

      const store = createTestStore();
      await store.dispatch(switchActiveDb('db-2'));

      const state = store.getState().database;
      expect(state.loading).toBe(false);
      expect(state.activeDbId).toBe('db-2');
    });

    it('sets error when DB not found', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(null);

      const store = createTestStore();
      await store.dispatch(switchActiveDb('nonexistent'));

      const state = store.getState().database;
      expect(state.error).toContain('not found');
    });
  });

  describe('removeDb', () => {
    it('removes DB and refreshes list', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(sampleDb2);
      const RNFS = require('react-native-fs');
      RNFS.exists.mockResolvedValueOnce(true);
      mockRepo.removeDatabase.mockResolvedValue(undefined);
      mockRepo.listDatabases.mockResolvedValue([sampleDb]);

      const store = createTestStore();
      await store.dispatch(removeDb('db-2'));

      const state = store.getState().database;
      expect(state.managedDatabases).toHaveLength(1);
      expect(state.loading).toBe(false);
    });

    it('sets error when trying to remove active DB', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(sampleDb);

      const store = createTestStore();
      await store.dispatch(removeDb('db-1'));

      const state = store.getState().database;
      expect(state.error).toContain('Cannot remove the active database');
    });
  });

  describe('refreshDb', () => {
    it('sets isDownloading during refresh', async () => {
      mockRepo.getDatabaseById.mockResolvedValue(sampleDb);
      mockRepo.listDatabases.mockResolvedValue([sampleDb]);
      mockRepo.addDatabase.mockResolvedValue(undefined);

      const store = createTestStore();
      const promise = store.dispatch(refreshDb('db-1'));
      expect(store.getState().database.isDownloading).toBe(true);

      await promise;
      expect(store.getState().database.isDownloading).toBe(false);
    });
  });

  describe('switchDatabase (legacy)', () => {
    it('sets activeDatabase on success', async () => {
      const store = createTestStore();

      await store.dispatch(switchDatabase(sampleDb));
      const state = store.getState().database;
      expect(state.activeDatabase).toEqual(sampleDb);
      expect(state.activeDbId).toBe('db-1');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      const SQLite = require('react-native-sqlite-storage');
      SQLite.openDatabase.mockRejectedValueOnce(new Error('Switch failed'));

      const store = createTestStore();
      await store.dispatch(switchDatabase(sampleDb));

      const state = store.getState().database;
      expect(state.activeDatabase).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Switch failed');
    });
  });
});
