import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Book, BookCategory, BookFilter } from '../../types/book';
import { booksApi } from '../../services/booksApi';

interface BooksState {
  books: Book[];
  filteredBooks: Book[];
  categories: BookCategory[];
  favorites: string[];
  recentlyPlayed: string[];
  loading: boolean;
  error: string | null;
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
  async (_, { rejectWithValue }) => {
    try {
      const response = await booksApi.getBooks();
      return response;
    } catch (error) {
      return rejectWithValue('Failed to fetch books');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'books/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await booksApi.getCategories();
      return response;
    } catch (error) {
      return rejectWithValue('Failed to fetch categories');
    }
  }
);

export const searchBooks = createAsyncThunk(
  'books/searchBooks',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await booksApi.searchBooks(query);
      return response;
    } catch (error) {
      return rejectWithValue('Failed to search books');
    }
  }
);

const booksSlice = createSlice({
  name: 'books',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<BookFilter>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.filteredBooks = applyFilters(state.books, state.filters, state.searchQuery);
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredBooks = applyFilters(state.books, state.filters, action.payload);
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
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBooks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.loading = false;
        state.books = action.payload;
        state.filteredBooks = applyFilters(action.payload, state.filters, state.searchQuery);
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(searchBooks.fulfilled, (state, action) => {
        state.filteredBooks = action.payload;
      });
  },
});

const applyFilters = (
  books: Book[],
  filters: BookFilter,
  searchQuery: string
): Book[] => {
  let filtered = books;

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description?.toLowerCase().includes(query)
    );
  }

  // Apply category filter
  if (filters.category !== 'all') {
    filtered = filtered.filter((book) => book.category === filters.category);
  }

  // Apply type filter
  if (filters.type !== 'all') {
    filtered = filtered.filter((book) => book.type === filters.type);
  }

  // Apply language filter
  if (filters.language !== 'all') {
    filtered = filtered.filter((book) => book.language === filters.language);
  }

  // Apply duration filter
  if (filters.duration !== 'all') {
    filtered = filtered.filter((book) => {
      const duration = book.duration || 0;
      switch (filters.duration) {
        case 'short':
          return duration < 1800; // Less than 30 minutes
        case 'medium':
          return duration >= 1800 && duration < 7200; // 30 minutes to 2 hours
        case 'long':
          return duration >= 7200; // More than 2 hours
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
} = booksSlice.actions;

export default booksSlice.reducer;
