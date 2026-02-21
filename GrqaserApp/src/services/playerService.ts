/**
 * Player service: build track from book, start playback, sync with TrackPlayer.
 * Prefers local downloaded MP3 over streaming URL for offline playback.
 */
import TrackPlayer, {
  Capability,
  IOSCategory,
  IOSCategoryMode,
  State,
} from 'react-native-track-player';
import {store} from '../state';
import {
  setCurrentBook,
  setProgress,
  setDuration,
  setError,
  clearError,
  setPlaying,
} from '../state/slices/playerSlice';
import {addBookToLibrary} from '../state/slices/librarySlice';
import {getPlaybackPositions} from './preferencesStorage';
import {downloadManager} from './downloadManager';
import {resetStreamingPosition} from './playbackService';
import type {Book} from '../types/book';

/**
 * Resolve the playback URL for a book. If the book is downloaded locally,
 * returns the local file path; otherwise returns the streaming URL.
 */
async function resolveAudioUrl(book: Book): Promise<string | null> {
  const isDownloaded = await downloadManager.isBookDownloaded(book.id);
  if (isDownloaded) {
    const localPath = downloadManager.getLocalFilePath(book.id);
    return `file://${localPath}`;
  }
  return book.audioUrl?.trim() || null;
}

let setupPromise: Promise<void> | null = null;

async function ensurePlayerReady(): Promise<void> {
  if (!setupPromise) {
    setupPromise = TrackPlayer.setupPlayer({
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
      autoHandleInterruptions: true,
    })
      .catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        if (!/already been initialized|already initialized/i.test(message)) {
          throw error;
        }
      })
      .then(() =>
        TrackPlayer.updateOptions({
          progressUpdateEventInterval: 1,
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SeekTo,
            Capability.Stop,
          ],
          android: {
            alwaysPauseOnInterruption: true,
          },
        }),
      );
  }
  await setupPromise;
}

async function hasActiveTrack(): Promise<boolean> {
  const activeTrack = await TrackPlayer.getActiveTrack();
  return activeTrack != null;
}

export function bookToTrack(book: Book): {
  url: string;
  title: string;
  artist: string;
  id?: string;
  duration?: number;
  artwork?: string;
} {
  const url = book.audioUrl?.trim();
  if (!url) {
    throw new Error('Book has no audio URL');
  }
  return {
    url,
    title: book.title,
    artist: book.author,
    id: book.id,
    duration: book.duration,
    artwork: book.coverImage,
  };
}

/**
 * Load and play a book. Prefers local MP3 when downloaded; otherwise streams.
 * If offline and not downloaded, dispatches an appropriate error.
 */
export async function playBook(book: Book): Promise<boolean> {
  await ensurePlayerReady();
  store.dispatch(clearError());
  store.dispatch(addBookToLibrary(book.id));
  try {
    const url = await resolveAudioUrl(book);
    if (!url) {
      store.dispatch(
        setError(
          'This book is not available offline. Download it to listen without internet.',
        ),
      );
      return false;
    }

    const track = {
      id: book.id,
      url,
      title: book.title,
      artist: book.author,
      duration: book.duration,
      artwork: book.coverImage,
    };

    const positions = await getPlaybackPositions();
    const rawSavedPosition = positions[book.id] ?? 0;
    const trackDuration = Math.max(0, book.duration ?? 0);
    const savedPosition =
      trackDuration > 0
        ? Math.max(0, Math.min(rawSavedPosition, trackDuration - 1))
        : Math.max(0, rawSavedPosition);
    await TrackPlayer.reset();
    resetStreamingPosition();
    await TrackPlayer.add(track);
    if (savedPosition > 0) {
      await TrackPlayer.seekTo(savedPosition);
      store.dispatch(setProgress(savedPosition));
    } else {
      store.dispatch(setProgress(0));
    }
    store.dispatch(setCurrentBook(book));
    store.dispatch(setDuration(book.duration ?? 0));
    await TrackPlayer.play();
    const playbackState = await TrackPlayer.getPlaybackState();
    store.dispatch(
      setPlaying(
        playbackState?.state === State.Playing ||
          playbackState?.state === State.Buffering,
      ),
    );
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Playback failed';
    store.dispatch(setError(message));
    store.dispatch(setPlaying(false));
    return false;
  }
}

export async function togglePlayPause(): Promise<void> {
  try {
    await ensurePlayerReady();
    if (!(await hasActiveTrack())) {
      store.dispatch(setError('Open a book and tap Play first.'));
      store.dispatch(setPlaying(false));
      return;
    }
    const state = await TrackPlayer.getPlaybackState();
    if (state?.state === State.Playing) {
      await TrackPlayer.pause();
      store.dispatch(setPlaying(false));
    } else {
      await TrackPlayer.play();
      store.dispatch(setPlaying(true));
    }
    store.dispatch(clearError());
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Playback control failed';
    store.dispatch(setError(message));
    store.dispatch(setPlaying(false));
  }
}

export async function seekTo(positionSeconds: number): Promise<void> {
  try {
    await ensurePlayerReady();
    if (!(await hasActiveTrack())) {
      return;
    }
    await TrackPlayer.seekTo(Math.max(0, positionSeconds));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Seek failed';
    store.dispatch(setError(message));
  }
}
