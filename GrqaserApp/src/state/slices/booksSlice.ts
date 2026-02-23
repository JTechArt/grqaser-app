import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {Book, BookFilter} from '../../types/book';
import {
  booksApi,
  getErrorMessage,
  type CatalogStats,
} from '../../services/booksApi';
import {getPlaybackPositions} from '../../services/preferencesStorage';

interface BooksState {
  books: Book[];
  /** On-demand book details by id (Library, Favorites, Recently Played) */
  booksById: Record<string, Book>;
  filteredBooks: Book[];
  favorites: string[];
  recentlyPlayed: string[];
  /** Catalog counts from DB (no full load). */
  catalogStats: CatalogStats | null;
  loading: boolean;
  loadingStats: boolean;
  error: string | null;
  searchLoading: boolean;
  searchError: string | null;
  filters: BookFilter;
  searchQuery: string;
}

const initialState: BooksState = {
  books: [],
  booksById: {},
  filteredBooks: [],
  favorites: [],
  recentlyPlayed: [],
  catalogStats: null,
  loading: false,
  loadingStats: false,
  error: null,
  searchLoading: false,
  searchError: null,
  filters: {
    type: 'all',
    language: 'all',
    duration: 'all',
    category: 'all',
  },
  searchQuery: '',
};

export const fetchBooks = createAsyncThunk(
  'books/fetchBooks',
  async (_, {rejectWithValue}) => {
    try {
      const books = await booksApi.getBooks();
      const positions = await getPlaybackPositions();
      return books.map(b => ({
        ...b,
        playProgress: positions[b.id] as number | undefined,
      }));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

/** Load first page of catalog for Home (lazy load). */
export const fetchBooksPage = createAsyncThunk(
  'books/fetchBooksPage',
  async (
    {limit = 20, offset = 0}: {limit?: number; offset?: number},
    {rejectWithValue},
  ) => {
    try {
      const books = await booksApi.getBooksPage(limit, offset);
      const positions = await getPlaybackPositions();
      return books.map(b => ({
        ...b,
        playProgress: positions[b.id] as number | undefined,
      }));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

/** Load book details by IDs (Library, Favorites, Recently Played). */
export const fetchBooksByIds = createAsyncThunk(
  'books/fetchBooksByIds',
  async (ids: string[], {rejectWithValue}) => {
    try {
      if (ids.length === 0) return [];
      const books = await booksApi.getBooksByIds(ids);
      const positions = await getPlaybackPositions();
      return books.map(b => ({
        ...b,
        playProgress: positions[b.id] as number | undefined,
      }));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

/** Load catalog counts from DB (no full catalog load). */
export const fetchCatalogStats = createAsyncThunk(
  'books/fetchCatalogStats',
  async (_, {rejectWithValue}) => {
    try {
      return await booksApi.getStats();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const searchBooks = createAsyncThunk(
  'books/searchBooks',
  async (query: string, {rejectWithValue}) => {
    try {
      return await booksApi.searchBooks(query);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<BookFilter>>) => {
      state.filters = {...state.filters, ...action.payload};
      state.filteredBooks = applyFilters(
        state.books,
        state.filters,
        state.searchQuery,
      );
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredBooks = applyFilters(
        state.books,
        state.filters,
        action.payload,
      );
    },
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const bookId = action.payload;
      const index = state.favorites.indexOf(bookId);
      if (index > -1) {
        state.favorites.splice(index, 1);
      } else {
        state.favorites.push(bookId);
      }
    },
    setFavorites: (state, action: PayloadAction<string[]>) => {
      state.favorites = action.payload;
    },
    addToRecentlyPlayed: (state, action: PayloadAction<string>) => {
      const bookId = action.payload;
      const index = state.recentlyPlayed.indexOf(bookId);
      if (index > -1) {
        state.recentlyPlayed.splice(index, 1);
      }
      state.recentlyPlayed.unshift(bookId);
      if (state.recentlyPlayed.length > 20) {
        state.recentlyPlayed.pop();
      }
    },
    clearError: state => {
      state.error = null;
    },
    clearSearchError: state => {
      state.searchError = null;
    },
    mergePlayProgress: (
      state,
      action: PayloadAction<Record<string, number>>,
    ) => {
      const positions = action.payload;
      state.books = state.books.map(b => ({
        ...b,
        playProgress: positions[b.id] as number | undefined,
      }));
      for (const id of Object.keys(state.booksById)) {
        const p = positions[id];
        if (p !== undefined) {
          state.booksById[id] = {
            ...state.booksById[id],
            playProgress: p,
          };
        }
      }
      state.filteredBooks = applyFilters(
        state.books,
        state.filters,
        state.searchQuery,
      );
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchBooks.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.loading = false;
        state.books = action.payload;
        state.filteredBooks = applyFilters(
          action.payload,
          state.filters,
          state.searchQuery,
        );
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to load books';
      })
      .addCase(fetchBooksPage.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBooksPage.fulfilled, (state, action) => {
        state.loading = false;
        state.books = action.payload;
        for (const b of action.payload) {
          state.booksById[b.id] = b;
        }
        state.filteredBooks = applyFilters(
          action.payload,
          state.filters,
          state.searchQuery,
        );
      })
      .addCase(fetchBooksPage.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? 'Failed to load book list';
      })
      .addCase(fetchBooksByIds.fulfilled, (state, action) => {
        for (const b of action.payload) {
          state.booksById[b.id] = b;
        }
      })
      .addCase(fetchCatalogStats.pending, state => {
        state.loadingStats = true;
      })
      .addCase(fetchCatalogStats.fulfilled, (state, action) => {
        state.loadingStats = false;
        state.catalogStats = action.payload;
      })
      .addCase(fetchCatalogStats.rejected, state => {
        state.loadingStats = false;
      })
      .addCase(searchBooks.pending, state => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchBooks.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchError = null;
        state.filteredBooks = action.payload.books;
      })
      .addCase(searchBooks.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError =
          (action.payload as string) ?? 'Search failed. Please try again.';
      });
  },
});

const applyFilters = (
  books: Book[],
  filters: BookFilter,
  searchQuery: string,
): Book[] => {
  let filtered = books;

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description?.toLowerCase().includes(query),
    );
  }

  if (filters.type !== 'all') {
    filtered = filtered.filter(book => book.type === filters.type);
  }

  if (filters.language !== 'all') {
    filtered = filtered.filter(book => book.language === filters.language);
  }

  if (filters.duration !== 'all') {
    filtered = filtered.filter(book => {
      const duration = book.duration || 0;
      switch (filters.duration) {
        case 'short':
          return duration < 1800;
        case 'medium':
          return duration >= 1800 && duration < 7200;
        case 'long':
          return duration >= 7200;
        default:
          return true;
      }
    });
  }

  return filtered;
};

export const {
  setFilters,
  setSearchQuery,
  toggleFavorite,
  setFavorites,
  addToRecentlyPlayed,
  clearError,
  clearSearchError,
  mergePlayProgress,
} = booksSlice.actions;

export const syncPlayProgress = createAsyncThunk(
  'books/syncPlayProgress',
  async (_, {dispatch, rejectWithValue}) => {
    try {
      const positions = await getPlaybackPositions();
      dispatch(mergePlayProgress(positions));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export default booksSlice.reducer;
