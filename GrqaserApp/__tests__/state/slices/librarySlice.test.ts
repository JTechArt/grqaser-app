jest.mock('react-native-sqlite-storage');

import reducer from '../../../src/state/slices/librarySlice';

const sampleEntries = [
  {
    id: 'book-1',
    bookId: 'book-1',
    addedAt: '2026-02-20T10:00:00Z',
    lastOpenedAt: '2026-02-22T10:00:00Z',
    source: 'auto' as const,
  },
  {
    id: 'book-2',
    bookId: 'book-2',
    addedAt: '2026-02-21T10:00:00Z',
    lastOpenedAt: '2026-02-21T10:00:00Z',
    source: 'auto' as const,
  },
];

describe('librarySlice reducer', () => {
  const initialState = {
    libraryBookIds: [] as string[],
    libraryEntries: [] as typeof sampleEntries,
    loading: false,
    error: null as string | null,
  };

  it('returns initial state', () => {
    expect(reducer(undefined, {type: 'unknown'})).toEqual(initialState);
  });

  describe('fetchLibraryEntries', () => {
    it('sets loading on pending', () => {
      const action = {type: 'library/fetchEntries/pending'};
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('sets libraryBookIds and libraryEntries on fulfilled', () => {
      const action = {
        type: 'library/fetchEntries/fulfilled',
        payload: {bookIds: ['book-1', 'book-2'], entries: sampleEntries},
      };
      const state = reducer({...initialState, loading: true}, action);
      expect(state.loading).toBe(false);
      expect(state.libraryBookIds).toEqual(['book-1', 'book-2']);
      expect(state.libraryEntries).toEqual(sampleEntries);
    });

    it('sets error on rejected', () => {
      const action = {
        type: 'library/fetchEntries/rejected',
        payload: 'DB error',
      };
      const state = reducer({...initialState, loading: true}, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('DB error');
    });
  });

  describe('addBookToLibrary', () => {
    it('replaces libraryBookIds and libraryEntries on fulfilled', () => {
      const prev = {
        ...initialState,
        libraryBookIds: ['book-1'],
        libraryEntries: [sampleEntries[0]],
      };
      const action = {
        type: 'library/addBook/fulfilled',
        payload: {bookIds: ['book-2', 'book-1'], entries: sampleEntries},
      };
      const state = reducer(prev, action);
      expect(state.libraryBookIds).toEqual(['book-2', 'book-1']);
      expect(state.libraryEntries).toEqual(sampleEntries);
    });

    it('sets error on rejected', () => {
      const action = {
        type: 'library/addBook/rejected',
        payload: 'Add failed',
      };
      const state = reducer(initialState, action);
      expect(state.error).toBe('Add failed');
    });
  });

  describe('removeBookFromLibrary', () => {
    it('removes bookId from libraryBookIds and libraryEntries on fulfilled', () => {
      const prev = {
        ...initialState,
        libraryBookIds: ['book-1', 'book-2', 'book-3'],
        libraryEntries: sampleEntries.concat([
          {
            id: 'book-3',
            bookId: 'book-3',
            addedAt: '2026-02-22T10:00:00Z',
            lastOpenedAt: '2026-02-22T10:00:00Z',
            source: 'auto' as const,
          },
        ]),
      };
      const action = {
        type: 'library/removeBook/fulfilled',
        payload: 'book-2',
      };
      const state = reducer(prev, action);
      expect(state.libraryBookIds).toEqual(['book-1', 'book-3']);
      expect(state.libraryEntries).toHaveLength(2);
      expect(state.libraryEntries.every(e => e.bookId !== 'book-2')).toBe(true);
    });

    it('handles removing non-existent book gracefully', () => {
      const prev = {
        ...initialState,
        libraryBookIds: ['book-1'],
        libraryEntries: [sampleEntries[0]],
      };
      const action = {
        type: 'library/removeBook/fulfilled',
        payload: 'book-99',
      };
      const state = reducer(prev, action);
      expect(state.libraryBookIds).toEqual(['book-1']);
      expect(state.libraryEntries).toHaveLength(1);
    });

    it('sets error on rejected', () => {
      const action = {
        type: 'library/removeBook/rejected',
        payload: 'Remove failed',
      };
      const state = reducer(initialState, action);
      expect(state.error).toBe('Remove failed');
    });
  });
});
