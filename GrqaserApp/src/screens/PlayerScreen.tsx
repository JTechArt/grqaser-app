import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  TouchableOpacity,
  LayoutChangeEvent,
  TextStyle,
} from 'react-native';
import {useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useProgress} from 'react-native-track-player';
import {theme} from '../theme';
import {formatTime} from '../utils/formatters';
import {togglePlayPause, seekTo} from '../services/playerService';
import type {RootState} from '../state';

const COVER_SIZE = 240;
const SEEK_BAR_HEIGHT = 40;

const PlayerScreen: React.FC = () => {
  const {width} = useWindowDimensions();
  const currentBook = useSelector((s: RootState) => s.player.currentBook);
  const isPlaying = useSelector((s: RootState) => s.player.isPlaying);
  const playerError = useSelector((s: RootState) => s.player.error);
  const {position, duration} = useProgress(1000);
  const [seekBarWidth, setSeekBarWidth] = useState(
    width - theme.spacing.lg * 2,
  );

  const handlePlayPause = useCallback(() => {
    togglePlayPause();
  }, []);

  const handleSeekBarLayout = useCallback((e: LayoutChangeEvent) => {
    setSeekBarWidth(e.nativeEvent.layout.width);
  }, []);

  const handleSeek = useCallback(
    (ev: {nativeEvent: {locationX: number}}) => {
      const x = ev.nativeEvent.locationX;
      if (seekBarWidth <= 0) {
        return;
      }
      const displayDuration =
        duration > 0 ? duration : (currentBook?.duration ?? 0) || 1;
      const fraction = Math.max(0, Math.min(1, x / seekBarWidth));
      seekTo(fraction * displayDuration);
    },
    [seekBarWidth, duration, currentBook?.duration],
  );

  const handleSkipBack = useCallback(() => {
    const next = Math.max(0, position - 10);
    seekTo(next);
  }, [position]);

  const handleSkipForward = useCallback(() => {
    const maxDuration = duration > 0 ? duration : (currentBook?.duration ?? 0);
    const next = Math.min(maxDuration || 0, position + 10);
    seekTo(next);
  }, [position, duration, currentBook?.duration]);

  const displayDuration =
    duration > 0 ? duration : (currentBook?.duration ?? 0) || 1;
  const displayPosition = duration > 0 ? position : 0;
  const seekFraction =
    displayDuration > 0 ? displayPosition / displayDuration : 0;

  if (!currentBook) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Icon name="headphones" size={64} color={theme.colors.onSurface} />
          <Text style={styles.emptyTitle}>No book playing</Text>
          <Text style={styles.emptySubtext}>
            Open a book and tap Play to start listening.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.coverWrapper}>
        {currentBook.coverImage ? (
          <Image
            source={{uri: currentBook.coverImage}}
            style={[
              styles.cover,
              {
                width: Math.min(COVER_SIZE, width - 48),
                height: Math.min(COVER_SIZE, width - 48),
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.coverPlaceholder,
              {
                width: Math.min(COVER_SIZE, width - 48),
                height: Math.min(COVER_SIZE, width - 48),
              },
            ]}>
            <Icon
              name="book-open-variant"
              size={56}
              color={theme.colors.onSurface}
            />
            <Text style={styles.coverPlaceholderText}>
              {currentBook.title.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {currentBook.title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {currentBook.author}
      </Text>

      {playerError ? (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={styles.errorText}>{playerError}</Text>
        </View>
      ) : null}

      <View style={styles.progressSection}>
        <TouchableOpacity
          style={styles.seekBarContainer}
          onLayout={handleSeekBarLayout}
          onPress={handleSeek}
          activeOpacity={1}>
          <View style={[styles.seekBarTrack, {width: seekBarWidth}]}>
            <View
              style={[styles.seekBarFill, {width: seekBarWidth * seekFraction}]}
            />
          </View>
        </TouchableOpacity>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(displayDuration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handleSkipBack}
          style={styles.secondaryControl}
          activeOpacity={0.8}>
          <Icon
            name="rewind"
            size={28}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePlayPause}
          style={styles.playPauseButton}
          activeOpacity={0.8}>
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={34}
            color={theme.colors.onPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSkipForward}
          style={styles.secondaryControl}
          activeOpacity={0.8}>
          <Icon
            name="fast-forward"
            size={28}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 48,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: 16,
  } as TextStyle,
  emptySubtext: {
    ...theme.typography.body2,
    color: theme.colors.onSurface,
    marginTop: 8,
    textAlign: 'center',
  } as TextStyle,
  coverWrapper: {marginBottom: 24},
  cover: {borderRadius: theme.borderRadius.lg},
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  coverPlaceholderText: {
    marginTop: 8,
    fontSize: 24,
    color: theme.colors.onSurface,
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  } as TextStyle,
  author: {
    ...theme.typography.body1,
    color: theme.colors.onSurface,
    marginBottom: 16,
  } as TextStyle,
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    flex: 1,
  } as TextStyle,
  progressSection: {width: '100%', marginBottom: 24},
  seekBarContainer: {
    width: '100%',
    height: SEEK_BAR_HEIGHT,
    justifyContent: 'center',
  },
  seekBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  seekBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
  } as TextStyle,
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  secondaryControl: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
});

export default PlayerScreen;
