/**
 * Playback service for react-native-track-player.
 * Handles remote events (lock screen, notification, BT) and runs in background.
 */
import TrackPlayer, {Event} from 'react-native-track-player';
import {store} from '../state';
import {setError, setPlaying} from '../state/slices/playerSlice';

export async function PlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
    store.dispatch(setPlaying(true));
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
    store.dispatch(setPlaying(false));
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(
    Event.RemoteSeek,
    ev => ev.position != null && TrackPlayer.seekTo(ev.position),
  );
  TrackPlayer.addEventListener(Event.PlaybackError, ev => {
    store.dispatch(setError(ev?.message ?? 'Playback error'));
    store.dispatch(setPlaying(false));
  });
}
