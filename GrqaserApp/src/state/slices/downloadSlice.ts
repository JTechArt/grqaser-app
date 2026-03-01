import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {downloadManager} from '../../services/downloadManager';
import {appMetaRepository} from '../../database/appMetaRepository';
import {catalogRepository} from '../../database/catalogRepository';

interface DownloadProgress {
  bytesWritten: number;
  contentLength: number;
  fraction: number;
  overallFraction?: number;
  currentFileIndex?: number;
  totalFiles?: number;
  completedFiles?: number;
}

interface DownloadState {
  downloadingBooks: Record<string, DownloadProgress>;
  downloadedBookIds: string[];
  totalStorageUsed: number;
  loading: boolean;
  error: string | null;
  bannerDismissed: boolean;
}

const initialState: DownloadState = {
  downloadingBooks: {},
  downloadedBookIds: [],
  totalStorageUsed: 0,
  loading: false,
  error: null,
  bannerDismissed: false,
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

export const cancelDownload = createAsyncThunk(
  'download/cancelDownload',
  async (bookId: string, {rejectWithValue}) => {
    try {
      downloadManager.cancelBookDownload(bookId);
      await downloadManager.deleteBookDownloads(bookId);
      return bookId;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Cancel failed';
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
      const isNew = !(action.payload.bookId in state.downloadingBooks);
      state.downloadingBooks[action.payload.bookId] = action.payload.progress;
      if (isNew) {
        state.bannerDismissed = false;
      }
    },
    clearDownloadError: state => {
      state.error = null;
    },
    dismissBanner: state => {
      state.bannerDismissed = true;
    },
    showBanner: state => {
      state.bannerDismissed = false;
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
      .addCase(cancelDownload.fulfilled, (state, action) => {
        delete state.downloadingBooks[action.payload];
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

export const {setDownloadProgress, clearDownloadError, dismissBanner, showBanner} =
  downloadSlice.actions;

export default downloadSlice.reducer;
