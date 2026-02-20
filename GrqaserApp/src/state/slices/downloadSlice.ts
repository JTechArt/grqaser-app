import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {downloadManager} from '../../services/downloadManager';
import {appMetaRepository} from '../../database/appMetaRepository';
import {catalogRepository} from '../../database/catalogRepository';

interface DownloadProgress {
  bytesWritten: number;
  contentLength: number;
  fraction: number;
}

interface DownloadState {
  downloadingBooks: Record<string, DownloadProgress>;
  downloadedBookIds: string[];
  totalStorageUsed: number;
  loading: boolean;
  error: string | null;
}

const initialState: DownloadState = {
  downloadingBooks: {},
  downloadedBookIds: [],
  totalStorageUsed: 0,
  loading: false,
  error: null,
};

export const loadDownloadState = createAsyncThunk(
  'download/loadState',
  async (_, {rejectWithValue}) => {
    try {
      const bookIds = await appMetaRepository.getDownloadedBookIds();
      const totalSize = await appMetaRepository.getTotalDownloadSize();
      return {bookIds, totalSize};
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to load download state';
      return rejectWithValue(msg);
    }
  },
);

export const downloadBook = createAsyncThunk(
  'download/downloadBook',
  async ({bookId}: {bookId: string}, {dispatch, getState, rejectWithValue}) => {
    try {
      const state = getState() as {download: DownloadState};
      if (state.download.downloadingBooks[bookId]) {
        return rejectWithValue('Download already in progress for this book');
      }
      if (state.download.downloadedBookIds.includes(bookId)) {
        return rejectWithValue('Book is already downloaded');
      }

      const audioData = await catalogRepository.getAudioUrls(bookId);
      if (audioData.urls.length === 0) {
        return rejectWithValue('No audio URLs available for this book');
      }

      dispatch(
        downloadSlice.actions.setDownloadProgress({
          bookId,
          progress: {bytesWritten: 0, contentLength: 0, fraction: 0},
        }),
      );

      const entries = await downloadManager.downloadBookMp3s(
        bookId,
        audioData.urls,
        progress => {
          dispatch(
            downloadSlice.actions.setDownloadProgress({bookId, progress}),
          );
        },
      );

      for (const entry of entries) {
        await appMetaRepository.insertDownloadedMp3(entry);
      }

      const totalSize = await appMetaRepository.getTotalDownloadSize();

      return {bookId, totalSize};
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Download failed';
      return rejectWithValue(msg);
    }
  },
);

export const cleanupBook = createAsyncThunk(
  'download/cleanupBook',
  async (bookId: string, {rejectWithValue}) => {
    try {
      await downloadManager.deleteBookDownloads(bookId);
      await appMetaRepository.deleteDownloadsByBookId(bookId);
      const totalSize = await appMetaRepository.getTotalDownloadSize();
      return {bookId, totalSize};
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Cleanup failed';
      return rejectWithValue(msg);
    }
  },
);

export const cleanupAll = createAsyncThunk(
  'download/cleanupAll',
  async (_, {rejectWithValue}) => {
    try {
      await downloadManager.deleteAllDownloads();
      await appMetaRepository.deleteAllDownloadRecords();
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Cleanup failed';
      return rejectWithValue(msg);
    }
  },
);

const downloadSlice = createSlice({
  name: 'download',
  initialState,
  reducers: {
    setDownloadProgress: (
      state,
      action: PayloadAction<{bookId: string; progress: DownloadProgress}>,
    ) => {
      state.downloadingBooks[action.payload.bookId] = action.payload.progress;
    },
    clearDownloadError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadDownloadState.fulfilled, (state, action) => {
        state.downloadedBookIds = action.payload.bookIds;
        state.totalStorageUsed = action.payload.totalSize;
      })
      .addCase(downloadBook.fulfilled, (state, action) => {
        const {bookId, totalSize} = action.payload;
        delete state.downloadingBooks[bookId];
        if (!state.downloadedBookIds.includes(bookId)) {
          state.downloadedBookIds.push(bookId);
        }
        state.totalStorageUsed = totalSize;
        state.error = null;
      })
      .addCase(downloadBook.rejected, (state, action) => {
        const bookId = action.meta.arg.bookId;
        delete state.downloadingBooks[bookId];
        state.error = (action.payload as string) ?? 'Download failed';
      })
      .addCase(cleanupBook.fulfilled, (state, action) => {
        const {bookId, totalSize} = action.payload;
        state.downloadedBookIds = state.downloadedBookIds.filter(
          id => id !== bookId,
        );
        state.totalStorageUsed = totalSize;
      })
      .addCase(cleanupBook.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Cleanup failed';
      })
      .addCase(cleanupAll.fulfilled, state => {
        state.downloadedBookIds = [];
        state.totalStorageUsed = 0;
        state.downloadingBooks = {};
      })
      .addCase(cleanupAll.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Cleanup failed';
      });
  },
});

export const {setDownloadProgress, clearDownloadError} = downloadSlice.actions;

export default downloadSlice.reducer;
