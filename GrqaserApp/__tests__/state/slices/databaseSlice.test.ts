jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn().mockResolvedValue({
    executeSql: jest.fn().mockResolvedValue([{rows: {length: 0}}]),
    close: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn(),
  }),
}));

import {configureStore} from '@reduxjs/toolkit';
import reducer, {
  setActiveDatabase,
  triggerReload,
  setLoading,
  setError,
  initializeDatabases,
  switchDatabase,
} from '../../../src/state/slices/databaseSlice';
import {ManagedDatabase} from '../../../src/types/book';

const sampleDb: ManagedDatabase = {
  id: 'db-1',
  displayName: 'Test DB',
  sourceUrl: 'https://example.com/test.db',
  filePath: '/data/test.db',
  fileSizeBytes: 500000,
  downloadedAt: '2026-01-01T00:00:00Z',
  isActive: true,
};

function createTestStore() {
  return configureStore({reducer: {database: reducer}});
}

describe('databaseSlice', () => {
  const initialState = {
    activeDatabase: null,
    loading: false,
    error: null,
    initialized: false,
  };

  it('returns the initial state', () => {
    expect(reducer(undefined, {type: 'unknown'})).toEqual(initialState);
  });

  describe('setActiveDatabase', () => {
    it('sets the active database', () => {
      const state = reducer(initialState, setActiveDatabase(sampleDb));
      expect(state.activeDatabase).toEqual(sampleDb);
    });

    it('clears the active database', () => {
      const withDb = {...initialState, activeDatabase: sampleDb};
      const state = reducer(withDb, setActiveDatabase(null));
      expect(state.activeDatabase).toBeNull();
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
      const SQLite = require('react-native-sqlite-storage');
      SQLite.openDatabase.mockRejectedValueOnce(new Error('DB open failed'));

      const store = createTestStore();
      await store.dispatch(initializeDatabases());

      const state = store.getState().database;
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(false);
      expect(state.error).toBe('DB open failed');
    });
  });

  describe('switchDatabase (async thunk)', () => {
    it('sets activeDatabase on success', async () => {
      const store = createTestStore();

      await store.dispatch(switchDatabase(sampleDb));
      const state = store.getState().database;
      expect(state.activeDatabase).toEqual(sampleDb);
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
