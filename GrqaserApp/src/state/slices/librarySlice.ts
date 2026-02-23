import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {appMetaRepository} from '../../database/appMetaRepository';
import type {LibraryEntry} from '../../types/book';

interface LibraryState {
  libraryBookIds: string[];
  /** Entries with lastOpenedAt for reliable In Progress section */
  libraryEntries: LibraryEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: LibraryState = {
  libraryBookIds: [],
  libraryEntries: [],
  loading: false,
  error: null,
};

export const fetchLibraryEntries = createAsyncThunk(
  'library/fetchEntries',
  async (_, {rejectWithValue}) => {
    try {
      const entries = await appMetaRepository.getLibraryEntries();
      return {
        bookIds: entries.map(e => e.bookId),
        entries,
      };
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to load library entries';
      return rejectWithValue(msg);
    }
  },
);

export const addBookToLibrary = createAsyncThunk(
  'library/addBook',
  async (bookId: string, {rejectWithValue}) => {
    try {
      await appMetaRepository.addToLibrary(bookId);
      const entries = await appMetaRepository.getLibraryEntries();
      return {bookIds: entries.map(e => e.bookId), entries};
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to add to library';
      return rejectWithValue(msg);
    }
  },
);

export const removeBookFromLibrary = createAsyncThunk(
  'library/removeBook',
  async (bookId: string, {rejectWithValue}) => {
    try {
      await appMetaRepository.removeFromLibrary(bookId);
      return bookId;
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to remove from library';
      return rejectWithValue(msg);
    }
  },
);

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLibraryEntries.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLibraryEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.libraryBookIds = action.payload.bookIds;
        state.libraryEntries = action.payload.entries;
      })
      .addCase(fetchLibraryEntries.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? 'Failed to load library entries';
      })

      .addCase(addBookToLibrary.fulfilled, (state, action) => {
        state.libraryBookIds = action.payload.bookIds;
        state.libraryEntries = action.payload.entries;
      })
      .addCase(addBookToLibrary.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to add to library';
      })

      .addCase(removeBookFromLibrary.fulfilled, (state, action) => {
        const bookId = action.payload;
        state.libraryBookIds = state.libraryBookIds.filter(id => id !== bookId);
        state.libraryEntries = state.libraryEntries.filter(
          e => e.bookId !== bookId,
        );
      })
      .addCase(removeBookFromLibrary.rejected, (state, action) => {
        state.error =
          (action.payload as string) ?? 'Failed to remove from library';
      });
  },
});

export default librarySlice.reducer;
