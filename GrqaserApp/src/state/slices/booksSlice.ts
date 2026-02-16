import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {Book, BookCategory, BookFilter} from '../../types/book';
import {booksApi, getErrorMessage} from '../../services/booksApi';

interface BooksState {
  books: Book[];
  filteredBooks: Book[];
  categories: BookCategory[];
  favorites: string[];
  recentlyPlayed: string[];
  loading: boolean;
  error: string | null;
  searchLoading: boolean;
  searchError: string | null;
  filters: BookFilter;
  searchQuery: string;
}

const initialState: BooksState = {
  books: [],
  filteredBooks: [],
  categories: [],
  favorites: [],
  recentlyPlayed: [],
  loading: false,
  error: null,
  searchLoading: false,
  searchError: null,
  filters: {
    category: 'all',
    type: 'all',
    language: 'all',
    duration: 'all',
  },
  searchQuery: '',
};

export const fetchBooks = createAsyncThunk(
  'books/fetchBooks',
  async (_, {rejectWithValue}) => {
    try {
      return await booksApi.getBooks();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchCategories = createAsyncThunk(
  'books/fetchCategories',
  async (_, {rejectWithValue}) => {
    try {
      return await booksApi.getCategories();
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
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
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

  if (filters.category !== 'all') {
    filtered = filtered.filter(book => book.category === filters.category);
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
  addToRecentlyPlayed,
  clearError,
  clearSearchError,
} = booksSlice.actions;

export default booksSlice.reducer;
