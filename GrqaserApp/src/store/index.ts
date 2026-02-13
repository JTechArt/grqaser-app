import { configureStore } from '@reduxjs/toolkit';
import booksReducer from './slices/booksSlice';
import playerReducer from './slices/playerSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    books: booksReducer,
    player: playerReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['player/setTrack', 'player/setQueue'],
        ignoredPaths: ['player.currentTrack', 'player.queue'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
