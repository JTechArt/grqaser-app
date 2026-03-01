/**
 * Persist preferences to AsyncStorage (playback positions, favorites, theme).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PLAYBACK_POSITIONS = '@grqaser/playback_positions';
const KEY_FAVORITES = '@grqaser/favorites';
const KEY_THEME = '@grqaser/theme';
const KEY_PLAYBACK_SPEED = '@grqaser/playback_speed';

export type ThemeMode = 'light' | 'dark' | 'auto';

/** Single-file books: position in seconds. Multi-part: chapter index + position in that chapter + totalChapters for display %. */
export type PlaybackPosition =
  | number
  | {chapterIndex: number; position: number; totalChapters?: number};

export interface PlaybackPositions {
  [bookId: string]: PlaybackPosition;
}

export async function getPlaybackPositions(): Promise<PlaybackPositions> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PLAYBACK_POSITIONS);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as PlaybackPositions;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function setPlaybackPositions(
  positions: PlaybackPositions,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY_PLAYBACK_POSITIONS,
      JSON.stringify(positions),
    );
  } catch {
    // ignore
  }
}

/** Get position as seconds for backward compatibility (single-file or legacy). */
export function positionToSeconds(
  pos: PlaybackPosition | undefined,
  _totalDuration?: number,
): number {
  if (pos == null) return 0;
  if (typeof pos === 'number') return Math.max(0, pos);
  return Math.max(0, pos.position);
}

export async function savePlaybackPosition(
  bookId: string,
  positionSeconds: number,
  chapterIndex?: number,
  totalChapters?: number,
): Promise<void> {
  const positions = await getPlaybackPositions();
  if (chapterIndex != null && chapterIndex >= 0) {
    positions[bookId] = {
      chapterIndex,
      position: positionSeconds,
      totalChapters: totalChapters ?? 1,
    };
  } else {
    positions[bookId] = positionSeconds;
  }
  await setPlaybackPositions(positions);
}

/** Get saved position for resume. Returns { chapterIndex, position } for multi-part, or position for single. */
export async function getSavedPosition(
  bookId: string,
): Promise<{chapterIndex: number; position: number}> {
  const positions = await getPlaybackPositions();
  const raw = positions[bookId];
  if (raw == null) return {chapterIndex: 0, position: 0};
  if (typeof raw === 'number') return {chapterIndex: 0, position: raw};
  return {
    chapterIndex: Math.max(0, raw.chapterIndex),
    position: Math.max(0, raw.position),
  };
}

/** Convert PlaybackPositions to Record<bookId, positionSeconds> for display. Uses duration and totalChapters for multi-part. */
export function playbackPositionsToSeconds(
  positions: PlaybackPositions,
  getBookDuration: (bookId: string) => number | undefined,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [bookId, raw] of Object.entries(positions)) {
    if (raw == null) continue;
    if (typeof raw === 'number') {
      result[bookId] = raw;
    } else {
      const duration = getBookDuration(bookId) ?? 0;
      const totalCh = raw.totalChapters ?? 1;
      if (totalCh > 1 && duration > 0) {
        result[bookId] =
          raw.chapterIndex * (duration / totalCh) + raw.position;
      } else {
        result[bookId] = raw.position;
      }
    }
  }
  return result;
}

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_FAVORITES);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setFavoritesStorage(bookIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_FAVORITES, JSON.stringify(bookIds));
  } catch {
    // ignore
  }
}

export async function getThemePreference(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(KEY_THEME);
    if (raw === 'light' || raw === 'dark' || raw === 'auto') {
      return raw;
    }
    return 'light';
  } catch {
    return 'light';
  }
}

export async function setThemePreference(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_THEME, mode);
  } catch {
    // ignore
  }
}

const DEFAULT_PLAYBACK_SPEED = 1;

export async function getPlaybackSpeed(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PLAYBACK_SPEED);
    if (raw == null) {
      return DEFAULT_PLAYBACK_SPEED;
    }
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) && value >= 0.5 && value <= 2
      ? value
      : DEFAULT_PLAYBACK_SPEED;
  } catch {
    return DEFAULT_PLAYBACK_SPEED;
  }
}

export async function savePlaybackSpeed(speed: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PLAYBACK_SPEED, String(speed));
  } catch {
    // ignore
  }
}
