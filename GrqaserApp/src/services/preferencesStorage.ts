/**
 * Persist preferences to AsyncStorage (playback positions, favorites, theme).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PLAYBACK_POSITIONS = '@grqaser/playback_positions';
const KEY_FAVORITES = '@grqaser/favorites';
const KEY_THEME = '@grqaser/theme';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface PlaybackPositions {
  [bookId: string]: number;
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

export async function savePlaybackPosition(
  bookId: string,
  positionSeconds: number,
): Promise<void> {
  const positions = await getPlaybackPositions();
  positions[bookId] = positionSeconds;
  await setPlaybackPositions(positions);
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
