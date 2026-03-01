/**
 * Player service: build track from book, start playback, sync with TrackPlayer.
 * Prefers local downloaded MP3 over streaming URL for offline playback.
 * Supports multi-part books (100+ MP3s): adds all parts to queue, shows current part, allows skip.
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
  setCurrentChapter,
  setTotalParts,
  setProgress,
  setDuration,
  setError,
  clearError,
  setPlaying,
  setPlaybackRate,
} from '../state/slices/playerSlice';
import {addBookToLibrary} from '../state/slices/librarySlice';
import {getSavedPosition, getPlaybackSpeed} from './preferencesStorage';
import {downloadManager} from './downloadManager';
import {resetStreamingPosition} from './playbackService';
import {catalogRepository} from '../database/catalogRepository';
import type {Book} from '../types/book';

const TRACK_ID_PREFIX = '__grq_';

/** Resolve playback URL for a part. For downloaded: local file; else streaming URL. */
async function resolvePartUrl(
  bookId: string,
  url: string,
  chapterIndex?: number,
  totalParts?: number,
): Promise<string> {
  const isDownloaded = await downloadManager.isBookDownloaded(bookId);
  if (isDownloaded) {
    const localPath = downloadManager.getLocalFilePath(bookId, chapterIndex);
    return `file://${localPath}`;
  }
  return url.trim();
}

let setupPromise: Promise<void> | null = null;

async function ensurePlayerReady(): Promise<void> {
  if (!setupPromise) {
    setupPromise = TrackPlayer.setupPlayer({
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
      autoHandleInterruptions: true,
      // Buffer more for large audiobook files to reduce playback errors
      minBuffer: 30,
      maxBuffer: 120,
      playBuffer: 5,
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
 * Supports multi-part books: adds all parts to queue, restores last position (part + offset).
 * If offline and not downloaded, dispatches an appropriate error.
 */
export async function playBook(book: Book): Promise<boolean> {
  await ensurePlayerReady();
  store.dispatch(clearError());
  store.dispatch(addBookToLibrary(book.id));
  try {
    const audioData = await catalogRepository.getAudioUrls(book.id);
    const urls = audioData.urls;
    if (urls.length === 0) {
      store.dispatch(
        setError(
          'This book is not available offline. Download it to listen without internet.',
        ),
      );
      return false;
    }

    const tracks: Array<{
      id: string;
      url: string;
      title: string;
      artist: string;
      duration?: number;
      artwork?: string;
    }> = [];
    const totalParts = urls.length;
    const partDuration =
      totalParts > 0 && book.duration != null
        ? Math.floor(book.duration / totalParts)
        : undefined;

    for (let i = 0; i < urls.length; i++) {
      const resolvedUrl = await resolvePartUrl(
        book.id,
        urls[i],
        totalParts > 1 ? i : undefined,
        totalParts,
      );
      if (!resolvedUrl) {
        store.dispatch(
          setError(
            'This book is not available offline. Download it to listen without internet.',
          ),
        );
        return false;
      }
      tracks.push({
        id: `${TRACK_ID_PREFIX}${book.id}_ch${i}`,
        url: resolvedUrl,
        title:
          totalParts > 1 ? `${book.title} (Part ${i + 1}/${totalParts})` : book.title,
        artist: book.author,
        duration: partDuration,
        artwork: book.coverImage,
      });
    }

    const {chapterIndex, position} = await getSavedPosition(book.id);
    const safeChapterIndex = Math.min(
      Math.max(0, chapterIndex),
      totalParts - 1,
    );
    const savedPos = Math.max(0, position);

    await TrackPlayer.reset();
    resetStreamingPosition();
    await TrackPlayer.add(tracks);
    store.dispatch(setCurrentBook(book));
    store.dispatch(setCurrentChapter(safeChapterIndex));
    store.dispatch(setTotalParts(totalParts));
    store.dispatch(setDuration(book.duration ?? 0));

    if (safeChapterIndex > 0) {
      await TrackPlayer.skip(safeChapterIndex);
    }
    if (savedPos > 0) {
      await TrackPlayer.seekTo(savedPos);
      store.dispatch(setProgress(savedPos));
    } else {
      store.dispatch(setProgress(0));
    }

    await TrackPlayer.play();
    const savedSpeed = await getPlaybackSpeed();
    await TrackPlayer.setRate(savedSpeed);
    store.dispatch(setPlaybackRate(savedSpeed));
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

/**
 * Set playback speed (rate). Affects current and future playback until changed.
 */
export async function setPlaybackSpeed(speed: number): Promise<void> {
  try {
    await ensurePlayerReady();
    await TrackPlayer.setRate(speed);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Speed change failed';
    store.dispatch(setError(message));
  }
}

/** Skip to the next part (chapter). No-op if already on last part. */
export async function skipToNextPart(): Promise<void> {
  try {
    await ensurePlayerReady();
    const queue = await TrackPlayer.getQueue();
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    if (
      currentIndex == null ||
      currentIndex < 0 ||
      currentIndex >= queue.length - 1
    ) {
      return;
    }
    await TrackPlayer.skipToNext();
    store.dispatch(setCurrentChapter(currentIndex + 1));
    store.dispatch(setProgress(0));
    store.dispatch(clearError());
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Skip failed';
    store.dispatch(setError(message));
  }
}

/** Skip to the previous part (chapter). No-op if already on first part. */
export async function skipToPreviousPart(): Promise<void> {
  try {
    await ensurePlayerReady();
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    if (currentIndex == null || currentIndex <= 0) {
      return;
    }
    await TrackPlayer.skipToPrevious();
    store.dispatch(setCurrentChapter(currentIndex - 1));
    store.dispatch(setProgress(0));
    store.dispatch(clearError());
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Skip failed';
    store.dispatch(setError(message));
  }
}

/** Parse track id to extract bookId and chapterIndex. Returns null if not our format. */
export function parseTrackId(
  trackId: string,
): {bookId: string; chapterIndex: number} | null {
  if (!trackId.startsWith(TRACK_ID_PREFIX)) return null;
  const rest = trackId.slice(TRACK_ID_PREFIX.length);
  const idx = rest.lastIndexOf('_ch');
  if (idx < 0) return null;
  const bookId = rest.slice(0, idx);
  const chNum = parseInt(rest.slice(idx + 3), 10);
  return {
    bookId,
    chapterIndex: Number.isNaN(chNum) ? 0 : chNum,
  };
}
