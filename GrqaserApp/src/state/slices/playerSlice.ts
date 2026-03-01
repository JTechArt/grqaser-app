import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {Track} from 'react-native-track-player';
import {Book} from '../../types/book';
import {appMetaRepository} from '../../database/appMetaRepository';

export type PartStatus = 'not_started' | 'in_progress' | 'completed';

interface PlayerState {
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: Track[];
  currentBook: Book | null;
  currentChapter: number;
  /** Total parts/chapters (1 for single-file books). */
  totalParts: number;
  progress: number;
  duration: number;
  playbackRate: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'track' | 'playlist';
  sleepTimer: number | null;
  volume: number;
  error: string | null;
  /** Per-part listening status keyed by partIndex */
  partHistory: Record<number, PartStatus>;
}

const initialState: PlayerState = {
  isPlaying: false,
  currentTrack: null,
  queue: [],
  currentBook: null,
  currentChapter: 0,
  totalParts: 1,
  progress: 0,
  duration: 0,
  playbackRate: 1.0,
  isShuffled: false,
  repeatMode: 'off',
  sleepTimer: null,
  volume: 1.0,
  error: null,
  partHistory: {},
};

export const loadPartHistory = createAsyncThunk(
  'player/loadPartHistory',
  async (bookId: string) => {
    const history = await appMetaRepository.getPartHistory(bookId);
    const map: Record<number, PartStatus> = {};
    for (const h of history) {
      map[h.partIndex] = h.status as PartStatus;
    }
    return map;
  },
);

export const markPartCompleted = createAsyncThunk(
  'player/markPartCompleted',
  async ({bookId, partIndex}: {bookId: string; partIndex: number}) => {
    await appMetaRepository.markPartStatus(bookId, partIndex, 'completed');
    return partIndex;
  },
);

export const markPartInProgress = createAsyncThunk(
  'player/markPartInProgress',
  async ({bookId, partIndex}: {bookId: string; partIndex: number}) => {
    await appMetaRepository.markPartStatus(bookId, partIndex, 'in_progress');
    return partIndex;
  },
);

export const resetBookPartHistory = createAsyncThunk(
  'player/resetPartHistory',
  async (bookId: string) => {
    await appMetaRepository.resetPartHistory(bookId);
  },
);

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setCurrentTrack: (state, action: PayloadAction<Track>) => {
      state.currentTrack = action.payload;
    },
    setQueue: (state, action: PayloadAction<Track[]>) => {
      state.queue = action.payload;
    },
    setCurrentBook: (state, action: PayloadAction<Book>) => {
      state.currentBook = action.payload;
    },
    setCurrentChapter: (state, action: PayloadAction<number>) => {
      state.currentChapter = action.payload;
    },
    setTotalParts: (state, action: PayloadAction<number>) => {
      state.totalParts = Math.max(1, action.payload);
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    setPlaybackRate: (state, action: PayloadAction<number>) => {
      state.playbackRate = action.payload;
    },
    toggleShuffle: state => {
      state.isShuffled = !state.isShuffled;
    },
    setRepeatMode: (
      state,
      action: PayloadAction<'off' | 'track' | 'playlist'>,
    ) => {
      state.repeatMode = action.payload;
    },
    setSleepTimer: (state, action: PayloadAction<number | null>) => {
      state.sleepTimer = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    resetPlayer: state => {
      state.isPlaying = false;
      state.currentTrack = null;
      state.queue = [];
      state.currentBook = null;
      state.currentChapter = 0;
      state.totalParts = 1;
      state.progress = 0;
      state.duration = 0;
      state.error = null;
      state.partHistory = {};
    },
    setPartStatus: (
      state,
      action: PayloadAction<{partIndex: number; status: PartStatus}>,
    ) => {
      state.partHistory[action.payload.partIndex] = action.payload.status;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadPartHistory.fulfilled, (state, action) => {
        state.partHistory = action.payload;
      })
      .addCase(markPartCompleted.fulfilled, (state, action) => {
        state.partHistory[action.payload] = 'completed';
      })
      .addCase(markPartInProgress.fulfilled, (state, action) => {
        state.partHistory[action.payload] = 'in_progress';
      })
      .addCase(resetBookPartHistory.fulfilled, state => {
        state.partHistory = {};
      });
  },
});

export const {
  setPlaying,
  setCurrentTrack,
  setQueue,
  setCurrentBook,
  setCurrentChapter,
  setTotalParts,
  setProgress,
  setDuration,
  setPlaybackRate,
  toggleShuffle,
  setRepeatMode,
  setSleepTimer,
  setVolume,
  setError,
  clearError,
  resetPlayer,
  setPartStatus,
} = playerSlice.actions;

export default playerSlice.reducer;
