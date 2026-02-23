/**
 * Network connection status slice. Used for offline support and
 * connection status UI (AC: 3, 4).
 */
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface NetworkStatusState {
  isConnected: boolean | null;
  /** When we transitioned from offline -> online, briefly show restored message */
  showRestored: boolean;
}

const initialState: NetworkStatusState = {
  isConnected: null,
  showRestored: false,
};

const networkStatusSlice = createSlice({
  name: 'networkStatus',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean | null>) => {
      const wasOffline = state.isConnected === false;
      state.isConnected = action.payload;
      // When we go from offline to online, show "restored" briefly
      if (wasOffline && action.payload === true) {
        state.showRestored = true;
      } else if (action.payload !== true) {
        state.showRestored = false;
      }
    },
    dismissRestored: state => {
      state.showRestored = false;
    },
  },
});

export const {setConnected, dismissRestored} = networkStatusSlice.actions;
export default networkStatusSlice.reducer;
