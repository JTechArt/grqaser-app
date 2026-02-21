/**
 * Unit tests for playerSlice — play/pause state, current book, queue, progress.
 * Story 5.2 — critical path (play a book) coverage.
 */

jest.mock('react-native-track-player', () => ({}));

import reducer, {
  setPlaying,
  setCurrentTrack,
  setQueue,
  setCurrentBook,
  setProgress,
  setDuration,
  setPlaybackRate,
  toggleShuffle,
  setRepeatMode,
  setError,
  clearError,
  resetPlayer,
} from '../../../src/state/slices/playerSlice';
import {Book} from '../../../src/types/book';

const mockBook: Book = {
  id: '1',
  title: 'Test Audiobook',
  author: 'Test Author',
  language: 'en',
  type: 'audiobook',
  category: 'Fiction',
};

const mockTrack = {
  id: '1',
  url: 'https://example.com/audio.mp3',
  title: 'Test Audiobook',
  artist: 'Test Author',
};

describe('playerSlice', () => {
  const initialState = reducer(undefined, {type: 'unknown'});

  it('returns initial state', () => {
    expect(initialState.isPlaying).toBe(false);
    expect(initialState.currentBook).toBeNull();
    expect(initialState.currentTrack).toBeNull();
    expect(initialState.queue).toEqual([]);
    expect(initialState.progress).toBe(0);
    expect(initialState.duration).toBe(0);
    expect(initialState.playbackRate).toBe(1.0);
    expect(initialState.error).toBeNull();
  });

  describe('setPlaying', () => {
    it('sets isPlaying to true', () => {
      const state = reducer(initialState, setPlaying(true));
      expect(state.isPlaying).toBe(true);
    });
    it('sets isPlaying to false', () => {
      const state = reducer(initialState, setPlaying(false));
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('setCurrentBook', () => {
    it('sets current book for playback', () => {
      const state = reducer(initialState, setCurrentBook(mockBook));
      expect(state.currentBook).toEqual(mockBook);
    });
  });

  describe('setCurrentTrack', () => {
    it('sets current track', () => {
      const state = reducer(initialState, setCurrentTrack(mockTrack as any));
      expect(state.currentTrack).toEqual(mockTrack);
    });
  });

  describe('setQueue', () => {
    it('sets playback queue', () => {
      const queue = [mockTrack as any];
      const state = reducer(initialState, setQueue(queue));
      expect(state.queue).toEqual(queue);
    });
  });

  describe('setProgress / setDuration', () => {
    it('updates progress and duration', () => {
      let state = reducer(initialState, setProgress(120));
      expect(state.progress).toBe(120);
      state = reducer(state, setDuration(3600));
      expect(state.duration).toBe(3600);
    });
  });

  describe('setPlaybackRate', () => {
    it('sets playback rate', () => {
      const state = reducer(initialState, setPlaybackRate(1.5));
      expect(state.playbackRate).toBe(1.5);
    });
  });

  describe('toggleShuffle', () => {
    it('toggles isShuffled', () => {
      const state1 = reducer(initialState, toggleShuffle());
      expect(state1.isShuffled).toBe(true);
      const state2 = reducer(state1, toggleShuffle());
      expect(state2.isShuffled).toBe(false);
    });
  });

  describe('setRepeatMode', () => {
    it('sets repeat mode', () => {
      const state = reducer(initialState, setRepeatMode('track'));
      expect(state.repeatMode).toBe('track');
    });
  });

  describe('setError / clearError', () => {
    it('sets and clears error', () => {
      let state = reducer(initialState, setError('Playback failed'));
      expect(state.error).toBe('Playback failed');
      state = reducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('resetPlayer', () => {
    it('resets to initial playback state (critical path: stop/clear)', () => {
      let state = reducer(initialState, setPlaying(true));
      state = reducer(state, setCurrentBook(mockBook));
      state = reducer(state, setProgress(100));
      state = reducer(state, resetPlayer());
      expect(state.isPlaying).toBe(false);
      expect(state.currentBook).toBeNull();
      expect(state.currentTrack).toBeNull();
      expect(state.queue).toEqual([]);
      expect(state.progress).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.error).toBeNull();
    });
  });
});
