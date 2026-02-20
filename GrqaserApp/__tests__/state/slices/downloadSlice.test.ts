jest.mock('react-native-sqlite-storage');
jest.mock('react-native-fs');

import reducer, {
  setDownloadProgress,
  clearDownloadError,
} from '../../../src/state/slices/downloadSlice';

describe('downloadSlice reducer', () => {
  const initialState = {
    downloadingBooks: {},
    downloadedBookIds: [],
    totalStorageUsed: 0,
    loading: false,
    error: null,
  };

  it('returns initial state', () => {
    expect(reducer(undefined, {type: 'unknown'})).toEqual(initialState);
  });

  describe('setDownloadProgress', () => {
    it('sets progress for a book', () => {
      const progress = {bytesWritten: 500, contentLength: 1000, fraction: 0.5};
      const state = reducer(
        initialState,
        setDownloadProgress({bookId: 'b1', progress}),
      );
      expect(state.downloadingBooks.b1).toEqual(progress);
    });

    it('updates progress for an already-downloading book', () => {
      const prev = {
        ...initialState,
        downloadingBooks: {
          b1: {bytesWritten: 100, contentLength: 1000, fraction: 0.1},
        },
      };
      const progress = {bytesWritten: 800, contentLength: 1000, fraction: 0.8};
      const state = reducer(
        prev,
        setDownloadProgress({bookId: 'b1', progress}),
      );
      expect(state.downloadingBooks.b1.fraction).toBe(0.8);
    });
  });

  describe('clearDownloadError', () => {
    it('clears the error', () => {
      const prev = {...initialState, error: 'Something failed'};
      const state = reducer(prev, clearDownloadError());
      expect(state.error).toBeNull();
    });
  });

  describe('downloadBook.fulfilled', () => {
    it('adds bookId to downloadedBookIds and clears downloading', () => {
      const prev = {
        ...initialState,
        downloadingBooks: {
          b1: {bytesWritten: 1000, contentLength: 1000, fraction: 1},
        },
      };
      const action = {
        type: 'download/downloadBook/fulfilled',
        payload: {bookId: 'b1', totalSize: 5000},
        meta: {arg: {bookId: 'b1'}},
      };
      const state = reducer(prev, action);
      expect(state.downloadedBookIds).toContain('b1');
      expect(state.downloadingBooks.b1).toBeUndefined();
      expect(state.totalStorageUsed).toBe(5000);
    });

    it('does not duplicate bookId if already present', () => {
      const prev = {
        ...initialState,
        downloadedBookIds: ['b1'],
        downloadingBooks: {
          b1: {bytesWritten: 1000, contentLength: 1000, fraction: 1},
        },
      };
      const action = {
        type: 'download/downloadBook/fulfilled',
        payload: {bookId: 'b1', totalSize: 5000},
        meta: {arg: {bookId: 'b1'}},
      };
      const state = reducer(prev, action);
      expect(state.downloadedBookIds.filter(id => id === 'b1')).toHaveLength(1);
    });
  });

  describe('downloadBook.rejected', () => {
    it('sets error and removes from downloading', () => {
      const prev = {
        ...initialState,
        downloadingBooks: {
          b1: {bytesWritten: 500, contentLength: 1000, fraction: 0.5},
        },
      };
      const action = {
        type: 'download/downloadBook/rejected',
        payload: 'Network error',
        meta: {arg: {bookId: 'b1'}},
      };
      const state = reducer(prev, action);
      expect(state.downloadingBooks.b1).toBeUndefined();
      expect(state.error).toBe('Network error');
    });
  });

  describe('cleanupBook.fulfilled', () => {
    it('removes bookId from downloadedBookIds', () => {
      const prev = {
        ...initialState,
        downloadedBookIds: ['b1', 'b2'],
        totalStorageUsed: 10000,
      };
      const action = {
        type: 'download/cleanupBook/fulfilled',
        payload: {bookId: 'b1', totalSize: 5000},
      };
      const state = reducer(prev, action);
      expect(state.downloadedBookIds).toEqual(['b2']);
      expect(state.totalStorageUsed).toBe(5000);
    });
  });

  describe('cleanupAll.fulfilled', () => {
    it('clears all download state', () => {
      const prev = {
        ...initialState,
        downloadedBookIds: ['b1', 'b2', 'b3'],
        totalStorageUsed: 50000,
        downloadingBooks: {
          b4: {bytesWritten: 0, contentLength: 0, fraction: 0},
        },
      };
      const action = {type: 'download/cleanupAll/fulfilled'};
      const state = reducer(prev, action);
      expect(state.downloadedBookIds).toEqual([]);
      expect(state.totalStorageUsed).toBe(0);
      expect(state.downloadingBooks).toEqual({});
    });
  });

  describe('loadDownloadState.fulfilled', () => {
    it('loads downloaded book IDs and total size', () => {
      const action = {
        type: 'download/loadState/fulfilled',
        payload: {bookIds: ['b1', 'b2'], totalSize: 8000},
      };
      const state = reducer(initialState, action);
      expect(state.downloadedBookIds).toEqual(['b1', 'b2']);
      expect(state.totalStorageUsed).toBe(8000);
    });
  });
});
