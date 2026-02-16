import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {Track} from 'react-native-track-player';
import {Book} from '../../types/book';

interface PlayerState {
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: Track[];
  currentBook: Book | null;
  currentChapter: number;
  progress: number;
  duration: number;
  playbackRate: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'track' | 'playlist';
  sleepTimer: number | null;
  volume: number;
  error: string | null;
}

const initialState: PlayerState = {
  isPlaying: false,
  currentTrack: null,
  queue: [],
  currentBook: null,
  currentChapter: 0,
  progress: 0,
  duration: 0,
  playbackRate: 1.0,
  isShuffled: false,
  repeatMode: 'off',
  sleepTimer: null,
  volume: 1.0,
  error: null,
};

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
      state.progress = 0;
      state.duration = 0;
      state.error = null;
    },
  },
});

export const {
  setPlaying,
  setCurrentTrack,
  setQueue,
  setCurrentBook,
  setCurrentChapter,
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
} = playerSlice.actions;

export default playerSlice.reducer;
