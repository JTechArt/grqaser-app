import {configureStore} from '@reduxjs/toolkit';
import booksReducer from './slices/booksSlice';
import playerReducer from './slices/playerSlice';
import userReducer from './slices/userSlice';
import databaseReducer from './slices/databaseSlice';
import downloadReducer from './slices/downloadSlice';
import libraryReducer from './slices/librarySlice';

export const store = configureStore({
  reducer: {
    books: booksReducer,
    player: playerReducer,
    user: userReducer,
    database: databaseReducer,
    download: downloadReducer,
    library: libraryReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['player/setTrack', 'player/setQueue'],
        ignoredPaths: ['player.currentTrack', 'player.queue'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
