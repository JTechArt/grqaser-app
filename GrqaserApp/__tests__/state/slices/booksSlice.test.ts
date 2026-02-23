/**
 * Unit tests for booksSlice — playProgress sync, mergePlayProgress, fetchBooks.
 * Story 9.4 — Library In-Progress filter and playProgress on Book objects.
 */

import reducer, {
  mergePlayProgress,
  setFilters,
} from '../../../src/state/slices/booksSlice';
import {Book} from '../../../src/types/book';

const book1: Book = {
  id: 'b1',
  title: 'Book One',
  author: 'Author One',
  language: 'en',
  type: 'audiobook',
  category: 'Fiction',
  duration: 3600,
};

const book2: Book = {
  id: 'b2',
  title: 'Book Two',
  author: 'Author Two',
  language: 'en',
  type: 'audiobook',
  category: 'Nonfiction',
  duration: 7200,
};

describe('booksSlice', () => {
  const initialState = reducer(undefined, {type: 'unknown'});

  it('returns initial state', () => {
    expect(initialState.books).toEqual([]);
    expect(initialState.booksById).toEqual({});
    expect(initialState.catalogStats).toBeNull();
    expect(initialState.filteredBooks).toEqual([]);
    expect(initialState.filters.type).toBe('all');
  });

  describe('mergePlayProgress', () => {
    it('merges playback positions into books', () => {
      const stateWithBooks = reducer(initialState, {
        type: 'books/fetchBooks/fulfilled',
        payload: [book1, book2],
      });
      expect(stateWithBooks.books[0].playProgress).toBeUndefined();
      expect(stateWithBooks.books[1].playProgress).toBeUndefined();

      const positions: Record<string, number> = {b1: 120, b2: 0};
      const state = reducer(stateWithBooks, mergePlayProgress(positions));
      expect(state.books[0].playProgress).toBe(120);
      expect(state.books[1].playProgress).toBe(0);
    });

    it('sets playProgress undefined for books not in positions', () => {
      const stateWithBooks = reducer(initialState, {
        type: 'books/fetchBooks/fulfilled',
        payload: [book1, book2],
      });
      const positions: Record<string, number> = {b1: 100};
      const state = reducer(stateWithBooks, mergePlayProgress(positions));
      expect(state.books[0].playProgress).toBe(100);
      expect(state.books[1].playProgress).toBeUndefined();
    });

    it('updates filteredBooks after merge', () => {
      const stateWithBooks = reducer(initialState, {
        type: 'books/fetchBooks/fulfilled',
        payload: [book1, book2],
      });
      const positions: Record<string, number> = {b1: 500, b2: 100};
      const state = reducer(stateWithBooks, mergePlayProgress(positions));
      expect(state.filteredBooks.length).toBe(2);
      expect(state.filteredBooks[0].playProgress).toBe(500);
      expect(state.filteredBooks[1].playProgress).toBe(100);
    });
  });

  describe('fetchBooks.fulfilled', () => {
    it('stores books with playProgress from payload', () => {
      const payload = [
        {...book1, playProgress: 300},
        {...book2, playProgress: undefined},
      ];
      const state = reducer(initialState, {
        type: 'books/fetchBooks/fulfilled',
        payload,
      });
      expect(state.books).toHaveLength(2);
      expect(state.books[0].playProgress).toBe(300);
      expect(state.books[1].playProgress).toBeUndefined();
      expect(state.loading).toBe(false);
    });
  });

  describe('setFilters / setSearchQuery', () => {
    it('applyFilters leaves in_progress to screen logic', () => {
      const stateWithBooks = reducer(initialState, {
        type: 'books/fetchBooks/fulfilled',
        payload: [book1, book2],
      });
      const state = reducer(stateWithBooks, setFilters({type: 'all'}));
      expect(state.filters.type).toBe('all');
      expect(state.filteredBooks.length).toBe(2);
    });
  });

  describe('fetchBooksPage.fulfilled', () => {
    it('stores page in books and merges into booksById', () => {
      const payload = [book1, book2];
      const state = reducer(initialState, {
        type: 'books/fetchBooksPage/fulfilled',
        payload,
      });
      expect(state.books).toHaveLength(2);
      expect(state.booksById.b1).toEqual(book1);
      expect(state.booksById.b2).toEqual(book2);
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchBooksByIds.fulfilled', () => {
    it('merges fetched books into booksById', () => {
      const state = reducer(initialState, {
        type: 'books/fetchBooksByIds/fulfilled',
        payload: [book1],
      });
      expect(state.booksById.b1).toEqual(book1);
      expect(state.books).toEqual([]);
    });
  });

  describe('fetchCatalogStats.fulfilled', () => {
    it('stores catalog stats from DB count', () => {
      const state = reducer(initialState, {
        type: 'books/fetchCatalogStats/fulfilled',
        payload: {totalBooks: 100, audiobooks: 80, ebooks: 20},
      });
      expect(state.catalogStats).toEqual({
        totalBooks: 100,
        audiobooks: 80,
        ebooks: 20,
      });
      expect(state.loadingStats).toBe(false);
    });
  });
});
