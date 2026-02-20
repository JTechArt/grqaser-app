import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {ManagedDatabase} from '../../types/book';
import {
  initCatalogDb,
  initBundledCatalogDb,
} from '../../database/catalogRepository';
import {initAppMetaDb} from '../../database/appMetaRepository';
import {APP_META_DB} from '../../database/connection';
import {databaseManager} from '../../services/databaseManager';
import {fetchBooks} from './booksSlice';

interface DatabaseState {
  managedDatabases: ManagedDatabase[];
  activeDbId: string | null;
  activeDatabase: ManagedDatabase | null;
  isDownloading: boolean;
  downloadProgress: number;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: DatabaseState = {
  managedDatabases: [],
  activeDbId: null,
  activeDatabase: null,
  isDownloading: false,
  downloadProgress: 0,
  loading: false,
  error: null,
  initialized: false,
};

export const initializeDatabases = createAsyncThunk(
  'database/initialize',
  async (_, {dispatch, rejectWithValue}) => {
    try {
      await initAppMetaDb(APP_META_DB);
      await initBundledCatalogDb();
      await dispatch(fetchManagedDatabases()).unwrap();
      return true;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Database init failed';
      return rejectWithValue(msg);
    }
  },
);

export const fetchManagedDatabases = createAsyncThunk(
  'database/fetchManaged',
  async (_, {rejectWithValue}) => {
    try {
      const databases = await databaseManager.listManagedDatabases();
      const active = databases.find(db => db.isActive) ?? null;
      return {databases, active};
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to fetch databases';
      return rejectWithValue(msg);
    }
  },
);

export const loadNewDatabase = createAsyncThunk(
  'database/loadNew',
  async (url: string, {dispatch, rejectWithValue}) => {
    try {
      const entry = await databaseManager.loadDatabaseFromUrl(url, progress => {
        dispatch(setDownloadProgress(progress.fraction));
      });

      if (entry.isActive) {
        await initCatalogDb(entry.filePath);
        await dispatch(fetchBooks()).unwrap();
      }

      await dispatch(fetchManagedDatabases()).unwrap();
      return entry;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to load database';
      return rejectWithValue(msg);
    }
  },
);

export const refreshDb = createAsyncThunk(
  'database/refresh',
  async (dbId: string, {dispatch, rejectWithValue}) => {
    try {
      const entry = await databaseManager.refreshDatabase(dbId, progress => {
        dispatch(setDownloadProgress(progress.fraction));
      });
      await dispatch(fetchManagedDatabases()).unwrap();
      return entry;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to refresh database';
      return rejectWithValue(msg);
    }
  },
);

export const switchActiveDb = createAsyncThunk(
  'database/switchActive',
  async (dbId: string, {dispatch, rejectWithValue}) => {
    try {
      const db = await databaseManager.setActiveDatabase(dbId);
      await initCatalogDb(db.filePath);
      await dispatch(fetchBooks()).unwrap();
      await dispatch(fetchManagedDatabases()).unwrap();
      return db;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to switch database';
      return rejectWithValue(msg);
    }
  },
);

export const removeDb = createAsyncThunk(
  'database/remove',
  async (dbId: string, {dispatch, rejectWithValue}) => {
    try {
      await databaseManager.removeDatabase(dbId);
      await dispatch(fetchManagedDatabases()).unwrap();
      return dbId;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to remove database';
      return rejectWithValue(msg);
    }
  },
);

/** @deprecated Use switchActiveDb instead */
export const switchDatabase = createAsyncThunk(
  'database/switch',
  async (db: ManagedDatabase, {rejectWithValue}) => {
    try {
      await initCatalogDb(db.filePath);
      return db;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to switch database';
      return rejectWithValue(msg);
    }
  },
);

const databaseSlice = createSlice({
  name: 'database',
  initialState,
  reducers: {
    setActiveDatabase: (
      state,
      action: PayloadAction<ManagedDatabase | null>,
    ) => {
      state.activeDatabase = action.payload;
      state.activeDbId = action.payload?.id ?? null;
    },
    triggerReload: state => {
      state.initialized = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setDownloadProgress: (state, action: PayloadAction<number>) => {
      state.downloadProgress = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      // initializeDatabases
      .addCase(initializeDatabases.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeDatabases.fulfilled, state => {
        state.loading = false;
        state.initialized = true;
      })
      .addCase(initializeDatabases.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? 'Failed to initialize databases';
      })

      // fetchManagedDatabases
      .addCase(fetchManagedDatabases.fulfilled, (state, action) => {
        state.managedDatabases = action.payload.databases;
        state.activeDatabase = action.payload.active;
        state.activeDbId = action.payload.active?.id ?? null;
      })

      // loadNewDatabase
      .addCase(loadNewDatabase.pending, state => {
        state.isDownloading = true;
        state.downloadProgress = 0;
        state.error = null;
      })
      .addCase(loadNewDatabase.fulfilled, state => {
        state.isDownloading = false;
        state.downloadProgress = 0;
      })
      .addCase(loadNewDatabase.rejected, (state, action) => {
        state.isDownloading = false;
        state.downloadProgress = 0;
        state.error = (action.payload as string) ?? 'Failed to load database';
      })

      // refreshDb
      .addCase(refreshDb.pending, state => {
        state.isDownloading = true;
        state.downloadProgress = 0;
        state.error = null;
      })
      .addCase(refreshDb.fulfilled, state => {
        state.isDownloading = false;
        state.downloadProgress = 0;
      })
      .addCase(refreshDb.rejected, (state, action) => {
        state.isDownloading = false;
        state.downloadProgress = 0;
        state.error =
          (action.payload as string) ?? 'Failed to refresh database';
      })

      // switchActiveDb
      .addCase(switchActiveDb.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchActiveDb.fulfilled, state => {
        state.loading = false;
      })
      .addCase(switchActiveDb.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to switch database';
      })

      // removeDb
      .addCase(removeDb.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeDb.fulfilled, state => {
        state.loading = false;
      })
      .addCase(removeDb.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to remove database';
      })

      // legacy switchDatabase
      .addCase(switchDatabase.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchDatabase.fulfilled, (state, action) => {
        state.loading = false;
        state.activeDatabase = action.payload;
        state.activeDbId = action.payload.id;
      })
      .addCase(switchDatabase.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to switch database';
      });
  },
});

export const {
  setActiveDatabase,
  triggerReload,
  setLoading,
  setError,
  setDownloadProgress,
} = databaseSlice.actions;

export default databaseSlice.reducer;
