import {configureStore} from '@reduxjs/toolkit';
import booksReducer, {
  fetchAdvancedFilterOptions,
  setAdvancedFilters,
  advancedSearchBooks,
} from '../../src/state/slices/booksSlice';

jest.mock('../../src/services/booksApi', () => ({
  booksApi: {
    getBooks: jest.fn(),
    getBooksPage: jest.fn(),
    getBooksByIds: jest.fn(),
    getStats: jest.fn(),
    getAuthors: jest.fn(),
    getCategories: jest.fn(),
    getBookById: jest.fn(),
    searchBooks: jest.fn(),
    advancedSearch: jest.fn(),
  },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
}));

const {booksApi} = jest.requireMock('../../src/services/booksApi') as {
  booksApi: {
    getAuthors: jest.Mock;
    getCategories: jest.Mock;
    advancedSearch: jest.Mock;
  };
};

describe('advanced search integration flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs full flow: load options -> set filters -> search -> store results', async () => {
    booksApi.getAuthors.mockResolvedValue([
      {id: 1, name: 'Author A', bookCount: 2},
      {id: 2, name: 'Author B', bookCount: 1},
    ]);
    booksApi.getCategories.mockResolvedValue([
      {id: 10, name: 'Fiction', bookCount: 3},
    ]);
    booksApi.advancedSearch.mockResolvedValue({
      books: [
        {
          id: 'b-3',
          title: 'Third Title',
          author: 'Author A',
          language: 'hy',
          type: 'audiobook',
          category: 'Fiction',
          duration: 3600,
        },
      ],
      totalCount: 1,
      hasMore: false,
      page: 1,
      limit: 100,
    });

    const store = configureStore({
      reducer: {
        books: booksReducer,
      },
    });

    await store.dispatch(fetchAdvancedFilterOptions() as never);

    store.dispatch(
      setAdvancedFilters({
        text: 'Third',
        authorIds: [1],
        categoryIds: [10],
        durationRange: '30-60',
      }),
    );

    await store.dispatch(advancedSearchBooks({page: 1, limit: 100}) as never);

    const state = store.getState().books;
    expect(booksApi.advancedSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Third',
        authorIds: [1],
        categoryIds: [10],
        durationRange: '30-60',
        page: 1,
        limit: 100,
      }),
    );
    expect(state.authorOptions).toHaveLength(2);
    expect(state.categoryOptions).toHaveLength(1);
    expect(state.advancedResults).toHaveLength(1);
    expect(state.advancedTotalCount).toBe(1);
    expect(state.advancedResults[0].title).toBe('Third Title');
  });
});
