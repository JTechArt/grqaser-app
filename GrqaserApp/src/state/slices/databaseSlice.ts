import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {ManagedDatabase} from '../../types/book';
import {
  initCatalogDb,
  initBundledCatalogDb,
} from '../../database/catalogRepository';
import {initAppMetaDb} from '../../database/appMetaRepository';
import {APP_META_DB} from '../../database/connection';

interface DatabaseState {
  activeDatabase: ManagedDatabase | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: DatabaseState = {
  activeDatabase: null,
  loading: false,
  error: null,
  initialized: false,
};

export const initializeDatabases = createAsyncThunk(
  'database/initialize',
  async (_, {rejectWithValue}) => {
    try {
      await initAppMetaDb(APP_META_DB);
      await initBundledCatalogDb();
      return true;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Database init failed';
      return rejectWithValue(msg);
    }
  },
);

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
  },
  extraReducers: builder => {
    builder
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
      .addCase(switchDatabase.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchDatabase.fulfilled, (state, action) => {
        state.loading = false;
        state.activeDatabase = action.payload;
      })
      .addCase(switchDatabase.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Failed to switch database';
      });
  },
});

export const {setActiveDatabase, triggerReload, setLoading, setError} =
  databaseSlice.actions;

export default databaseSlice.reducer;
