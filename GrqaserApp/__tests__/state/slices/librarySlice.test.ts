jest.mock('react-native-sqlite-storage');

import reducer from '../../../src/state/slices/librarySlice';

describe('librarySlice reducer', () => {
  const initialState = {
    libraryBookIds: [],
    loading: false,
    error: null,
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

    it('sets libraryBookIds on fulfilled', () => {
      const action = {
        type: 'library/fetchEntries/fulfilled',
        payload: ['book-1', 'book-2'],
      };
      const state = reducer({...initialState, loading: true}, action);
      expect(state.loading).toBe(false);
      expect(state.libraryBookIds).toEqual(['book-1', 'book-2']);
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
    it('replaces libraryBookIds with fresh list on fulfilled', () => {
      const prev = {
        ...initialState,
        libraryBookIds: ['book-1'],
      };
      const action = {
        type: 'library/addBook/fulfilled',
        payload: ['book-2', 'book-1'],
      };
      const state = reducer(prev, action);
      expect(state.libraryBookIds).toEqual(['book-2', 'book-1']);
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
    it('removes bookId from libraryBookIds on fulfilled', () => {
      const prev = {
        ...initialState,
        libraryBookIds: ['book-1', 'book-2', 'book-3'],
      };
      const action = {
        type: 'library/removeBook/fulfilled',
        payload: 'book-2',
      };
      const state = reducer(prev, action);
      expect(state.libraryBookIds).toEqual(['book-1', 'book-3']);
    });

    it('handles removing non-existent book gracefully', () => {
      const prev = {
        ...initialState,
        libraryBookIds: ['book-1'],
      };
      const action = {
        type: 'library/removeBook/fulfilled',
        payload: 'book-99',
      };
      const state = reducer(prev, action);
      expect(state.libraryBookIds).toEqual(['book-1']);
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
