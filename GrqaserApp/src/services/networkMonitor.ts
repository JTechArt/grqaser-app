/**
 * Network monitor service. Subscribes to NetInfo and periodically
 * re-checks connection state (e.g. every 10s) for AC4.
 */
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {store} from '../state';
import {setConnected} from '../state/slices/networkStatusSlice';

const PING_INTERVAL_MS = 10000; // 10 seconds per story

let intervalId: ReturnType<typeof setInterval> | null = null;

function isConnected(state: NetInfoState): boolean {
  if (state.isConnected == null) {
    return false;
  }
  if (!state.isConnected) {
    return false;
  }
  if (state.type === 'none') {
    return false;
  }
  if (state.type === 'unknown' && state.isInternetReachable === false) {
    return false;
  }
  return true;
}

function handleState(state: NetInfoState): void {
  const connected = isConnected(state);
  store.dispatch(setConnected(connected));
}

export function startNetworkMonitor(): () => void {
  NetInfo.fetch().then(handleState);
  const unsubscribe = NetInfo.addEventListener(handleState);

  if (intervalId) {
    clearInterval(intervalId);
  }
  intervalId = setInterval(() => {
    NetInfo.fetch().then(handleState);
  }, PING_INTERVAL_MS);

  return () => {
    unsubscribe();
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}
