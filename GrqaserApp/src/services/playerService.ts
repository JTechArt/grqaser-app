/**
 * Player service: build track from book, start playback, sync with TrackPlayer.
 * Prefers local downloaded MP3 over streaming URL for offline playback.
 */
import TrackPlayer from 'react-native-track-player';
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

/**
 * Load and play a book. Prefers local MP3 when downloaded; otherwise streams.
 * If offline and not downloaded, dispatches an appropriate error.
 */
export async function playBook(book: Book): Promise<void> {
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
      return;
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
    const savedPosition = positions[book.id] ?? 0;
    await TrackPlayer.reset();
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
    store.dispatch(setPlaying(true));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Playback failed';
    store.dispatch(setError(message));
    store.dispatch(setPlaying(false));
  }
}

export async function togglePlayPause(): Promise<void> {
  const state = await TrackPlayer.getPlaybackState();
  if (state?.state === 'playing') {
    await TrackPlayer.pause();
    store.dispatch(setPlaying(false));
  } else {
    await TrackPlayer.play();
    store.dispatch(setPlaying(true));
  }
}

export async function seekTo(positionSeconds: number): Promise<void> {
  await TrackPlayer.seekTo(positionSeconds);
}
