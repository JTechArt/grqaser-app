import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface UserPreferences {
  language: string;
  playbackSpeed: number;
  autoPlay: boolean;
  downloadOverWifi: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
}

interface UserState {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  } | null;
  preferences: UserPreferences;
  statistics: {
    totalListeningTime: number;
    booksCompleted: number;
    favoriteBooks: number;
    lastActive: string;
  };
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  isAuthenticated: false,
  user: null,
  preferences: {
    language: 'hy',
    playbackSpeed: 1.0,
    autoPlay: true,
    downloadOverWifi: true,
    notifications: true,
    theme: 'auto',
    fontSize: 'medium',
  },
  statistics: {
    totalListeningTime: 0,
    booksCompleted: 0,
    favoriteBooks: 0,
    lastActive: new Date().toISOString(),
  },
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setUser: (state, action: PayloadAction<UserState['user']>) => {
      state.user = action.payload;
    },
    updatePreferences: (
      state,
      action: PayloadAction<Partial<UserPreferences>>,
    ) => {
      state.preferences = {...state.preferences, ...action.payload};
    },
    updateStatistics: (
      state,
      action: PayloadAction<Partial<UserState['statistics']>>,
    ) => {
      state.statistics = {...state.statistics, ...action.payload};
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
    },
    incrementListeningTime: (state, action: PayloadAction<number>) => {
      state.statistics.totalListeningTime += action.payload;
    },
    incrementBooksCompleted: state => {
      state.statistics.booksCompleted += 1;
    },
    updateLastActive: state => {
      state.statistics.lastActive = new Date().toISOString();
    },
  },
});

export const {
  setAuthenticated,
  setUser,
  updatePreferences,
  updateStatistics,
  setLoading,
  setError,
  clearError,
  logout,
  incrementListeningTime,
  incrementBooksCompleted,
  updateLastActive,
} = userSlice.actions;

export default userSlice.reducer;
