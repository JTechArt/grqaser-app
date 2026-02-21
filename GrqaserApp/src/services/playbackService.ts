/**
 * Playback service for react-native-track-player.
 * Handles remote events (lock screen, notification, BT) and runs in background.
 */
import TrackPlayer, {Event} from 'react-native-track-player';
import {store} from '../state';
import {setError, setPlaying} from '../state/slices/playerSlice';
import {syncPlayProgress} from '../state/slices/booksSlice';
import {savePlaybackPosition} from './preferencesStorage';
import {storageService} from './storageService';

const POSITION_SAVE_INTERVAL_MS = 10000;
const ESTIMATED_BITRATE_BYTES_PER_SEC = 16000; // ~128kbps MP3
let lastPositionSaveAt = 0;
let lastStreamingPosition = 0;

export function resetStreamingPosition(): void {
  lastStreamingPosition = 0;
}

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

  // Interruptions (e.g. phone calls): pause/duck and resume when ended
  TrackPlayer.addEventListener(Event.RemoteDuck, ev => {
    if (ev.permanent) {
      TrackPlayer.reset();
      store.dispatch(setPlaying(false));
      return;
    }
    if (ev.paused) {
      TrackPlayer.pause();
      store.dispatch(setPlaying(false));
    } else {
      TrackPlayer.play();
      store.dispatch(setPlaying(true));
    }
  });

  // Persist playback position per book (throttled) and track streaming data
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async ev => {
    const now = Date.now();
    if (now - lastPositionSaveAt < POSITION_SAVE_INTERVAL_MS) {
      return;
    }
    const track = await TrackPlayer.getActiveTrack();
    const bookId = track?.id as string | undefined;
    if (bookId && typeof ev.position === 'number') {
      lastPositionSaveAt = now;
      savePlaybackPosition(bookId, ev.position)
        .then(() => store.dispatch(syncPlayProgress()))
        .catch(() => {});

      const url = track?.url as string | undefined;
      const isStreaming = url != null && !url.startsWith('file://');
      if (isStreaming && ev.position > lastStreamingPosition) {
        const delta = ev.position - lastStreamingPosition;
        const estimatedBytes = Math.round(
          delta * ESTIMATED_BITRATE_BYTES_PER_SEC,
        );
        storageService
          .trackDataUsage('streaming', estimatedBytes)
          .catch(() => {});
      }
      lastStreamingPosition = ev.position;
    }
  });
}
