/**
 * Network monitor service. Subscribes to NetInfo and periodically
 * re-checks connection state (e.g. every 10s) for AC4.
 *
 * NetInfo is temporarily disabled (native module issues with RN 0.72 / newer Xcode).
 * App assumes connected; ConnectionBanner offline detection will not show.
 * TODO: Re-enable when @react-native-community/netinfo is compatible.
 */
import {store} from '../state';
import {setConnected} from '../state/slices/networkStatusSlice';

const USE_NETINFO = false; // Set true when netinfo native module works

export function startNetworkMonitor(): () => void {
  if (!USE_NETINFO) {
    store.dispatch(setConnected(true));
    return () => {};
  }

  const NetInfo = require('@react-native-community/netinfo').default;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const handleState = (state: {isConnected?: boolean | null; type?: string; isInternetReachable?: boolean | null}) => {
    const connected =
      state.isConnected !== false &&
      state.type !== 'none' &&
      !(state.type === 'unknown' && state.isInternetReachable === false);
    store.dispatch(setConnected(!!connected));
  };

  NetInfo.fetch().then(handleState).catch(() => store.dispatch(setConnected(true)));
  const unsubscribe = NetInfo.addEventListener(handleState);
  intervalId = setInterval(() => NetInfo.fetch().then(handleState).catch(() => {}), 10000);

  return () => {
    unsubscribe();
    if (intervalId) clearInterval(intervalId);
  };
}
