import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {appMetaRepository} from '../../database/appMetaRepository';

interface LibraryState {
  libraryBookIds: string[];
  loading: boolean;
  error: string | null;
}

const initialState: LibraryState = {
  libraryBookIds: [],
  loading: false,
  error: null,
};

export const fetchLibraryEntries = createAsyncThunk(
  'library/fetchEntries',
  async (_, {rejectWithValue}) => {
    try {
      const entries = await appMetaRepository.getLibraryEntries();
      return entries.map(e => e.bookId);
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
      return entries.map(e => e.bookId);
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
        state.libraryBookIds = action.payload;
      })
      .addCase(fetchLibraryEntries.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? 'Failed to load library entries';
      })

      .addCase(addBookToLibrary.fulfilled, (state, action) => {
        state.libraryBookIds = action.payload;
      })
      .addCase(addBookToLibrary.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Failed to add to library';
      })

      .addCase(removeBookFromLibrary.fulfilled, (state, action) => {
        state.libraryBookIds = state.libraryBookIds.filter(
          id => id !== action.payload,
        );
      })
      .addCase(removeBookFromLibrary.rejected, (state, action) => {
        state.error =
          (action.payload as string) ?? 'Failed to remove from library';
      });
  },
});

export default librarySlice.reducer;
