/**
 * Player service: build track from book, start playback, sync with TrackPlayer.
 * Uses crawler-backed audio URL (book.audioUrl from main_audio_url).
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
import type {Book} from '../types/book';

export function bookToTrack(book: Book): {
  url: string;
  title: string;
  artist: string;
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
    duration: book.duration,
    artwork: book.coverImage,
  };
}

/**
 * Load and play a book. Uses book.audioUrl (crawler main_audio_url).
 * Dispatches setCurrentBook, clearError; on failure dispatches setError.
 */
export async function playBook(book: Book): Promise<void> {
  const url = book.audioUrl?.trim();
  if (!url) {
    store.dispatch(setError('No audio URL for this book'));
    return;
  }
  store.dispatch(clearError());
  try {
    const track = bookToTrack(book);
    await TrackPlayer.reset();
    await TrackPlayer.add(track);
    store.dispatch(setCurrentBook(book));
    store.dispatch(setProgress(0));
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
