import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  LayoutChangeEvent,
  TextStyle,
  Modal,
  FlatList,
  ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector, useDispatch} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useProgress} from 'react-native-track-player';
import {theme} from '../theme';
import {formatTime} from '../utils/formatters';
import LazyCoverImage from '../components/LazyCoverImage';
import {
  togglePlayPause,
  seekTo,
  setPlaybackSpeed as setPlaybackSpeedService,
  skipToNextPart,
  skipToPreviousPart,
  skipToPart,
} from '../services/playerService';
import {
  getPlaybackSpeed,
  savePlaybackSpeed,
} from '../services/preferencesStorage';
import AudioSpeedControl from '../components/AudioSpeedControl';
import {
  setPlaybackRate,
  resetBookPartHistory,
  type PartStatus,
} from '../state/slices/playerSlice';
import type {RootState} from '../state';
import type {AppDispatch} from '../state';

const COVER_SIZE = 240;
const SEEK_BAR_HEIGHT = 40;

function getPartStatusIcon(
  status: PartStatus | undefined,
  isCurrent: boolean,
): {name: string; color: string} {
  if (isCurrent) {
    return {name: 'play-circle', color: theme.colors.primary};
  }
  switch (status) {
    case 'completed':
      return {name: 'check-circle', color: theme.colors.success};
    case 'in_progress':
      return {name: 'progress-clock', color: theme.colors.warning};
    default:
      return {name: 'circle-outline', color: theme.colors.onSurface};
  }
}

function getPartStatusLabel(
  status: PartStatus | undefined,
  isCurrent: boolean,
): string {
  if (isCurrent) {
    return 'Playing';
  }
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Not Started';
  }
}

const PlayerScreen: React.FC = () => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const currentBook = useSelector((s: RootState) => s.player.currentBook);
  const currentChapter = useSelector((s: RootState) => s.player.currentChapter);
  const isPlaying = useSelector((s: RootState) => s.player.isPlaying);
  const playerError = useSelector((s: RootState) => s.player.error);
  const playbackRate = useSelector((s: RootState) => s.player.playbackRate);
  const totalParts = useSelector((s: RootState) => s.player.totalParts ?? 1);
  const partHistory = useSelector((s: RootState) => s.player.partHistory);
  const {position, duration} = useProgress(1000);
  const hasMultipleParts = totalParts > 1;
  const [seekBarWidth, setSeekBarWidth] = useState(
    width - theme.spacing.lg * 2,
  );
  const [partSelectorVisible, setPartSelectorVisible] = useState(false);

  useEffect(() => {
    getPlaybackSpeed().then(speed => dispatch(setPlaybackRate(speed)));
  }, [dispatch]);

  const handleSpeedChange = useCallback(
    async (speed: number) => {
      dispatch(setPlaybackRate(speed));
      await setPlaybackSpeedService(speed);
      await savePlaybackSpeed(speed);
    },
    [dispatch],
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
      const displayDur =
        duration > 0 ? duration : (currentBook?.duration ?? 0) || 1;
      const fraction = Math.max(0, Math.min(1, x / seekBarWidth));
      seekTo(fraction * displayDur);
    },
    [seekBarWidth, duration, currentBook?.duration],
  );

  const handleSkipBack = useCallback(() => {
    const next = Math.max(0, position - 10);
    seekTo(next);
  }, [position]);

  const handleSkipForward = useCallback(() => {
    const maxDuration = duration > 0 ? duration : currentBook?.duration ?? 0;
    const next = Math.min(maxDuration || 0, position + 10);
    seekTo(next);
  }, [position, duration, currentBook?.duration]);

  const handleGoToBookDetail = useCallback(() => {
    if (currentBook) {
      (
        navigation as unknown as {
          navigate: (screen: string, params?: Record<string, unknown>) => void;
        }
      ).navigate('BookDetail', {book: currentBook});
    }
  }, [currentBook, navigation]);

  const handleSelectPart = useCallback(
    async (partIndex: number) => {
      setPartSelectorVisible(false);
      if (partIndex !== currentChapter) {
        await skipToPart(partIndex);
      }
    },
    [currentChapter],
  );

  const handleResetHistory = useCallback(() => {
    if (currentBook) {
      dispatch(resetBookPartHistory(currentBook.id));
    }
  }, [currentBook, dispatch]);

  const completedCount = Object.values(partHistory).filter(
    s => s === 'completed',
  ).length;

  const displayDuration =
    duration > 0 ? duration : (currentBook?.duration ?? 0) || 1;
  const displayPosition = duration > 0 ? position : 0;
  const seekFraction =
    displayDuration > 0 ? displayPosition / displayDuration : 0;

  if (!currentBook) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.centered,
            {paddingTop: insets.top + theme.spacing.lg},
          ]}>
          <Icon name="headphones" size={64} color={theme.colors.onSurface} />
          <Text style={styles.emptyTitle}>No book playing</Text>
          <Text style={styles.emptySubtext}>
            Open a book and tap Play to start listening.
          </Text>
        </View>
      </View>
    );
  }

  const partsData = Array.from({length: totalParts}, (_, i) => i);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + theme.spacing.lg},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Tappable link to book detail */}
        <TouchableOpacity
          onPress={handleGoToBookDetail}
          style={styles.bookDetailLink}
          activeOpacity={0.7}>
          <Icon
            name="book-open-variant"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.bookDetailLinkText} numberOfLines={1}>
            View Book Details
          </Text>
          <Icon
            name="chevron-right"
            size={16}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.coverWrapper}>
          <LazyCoverImage
            uri={currentBook.coverImage}
            style={[
              styles.cover,
              {
                width: Math.min(COVER_SIZE, width - 48),
                height: Math.min(COVER_SIZE, width - 48),
              },
            ]}
            placeholderText={currentBook.title.substring(0, 2).toUpperCase()}
            priority="high"
          />
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

        {hasMultipleParts && (
          <View style={styles.partSection}>
            <View style={styles.partRow}>
              <TouchableOpacity
                onPress={skipToPreviousPart}
                style={styles.partNavButton}
                disabled={currentChapter <= 0}>
                <Icon
                  name="skip-previous"
                  size={24}
                  color={
                    currentChapter <= 0
                      ? theme.colors.outline
                      : theme.colors.onSurface
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPartSelectorVisible(true)}
                style={styles.partTouchable}
                activeOpacity={0.7}>
                <Text style={styles.partText}>
                  Part {currentChapter + 1} of {totalParts}
                </Text>
                <Icon
                  name="menu"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.partMenuIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={skipToNextPart}
                style={styles.partNavButton}
                disabled={currentChapter >= totalParts - 1}>
                <Icon
                  name="skip-next"
                  size={24}
                  color={
                    currentChapter >= totalParts - 1
                      ? theme.colors.outline
                      : theme.colors.onSurface
                  }
                />
              </TouchableOpacity>
            </View>
            {completedCount > 0 && (
              <Text style={styles.completedText}>
                {completedCount} of {totalParts} parts completed
              </Text>
            )}
          </View>
        )}

        <View style={styles.progressSection}>
          <TouchableOpacity
            style={styles.seekBarContainer}
            onLayout={handleSeekBarLayout}
            onPress={handleSeek}
            activeOpacity={1}>
            <View style={[styles.seekBarTrack, {width: seekBarWidth}]}>
              <View
                style={[
                  styles.seekBarFill,
                  {width: seekBarWidth * seekFraction},
                ]}
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
            <Icon name="rewind" size={28} color={theme.colors.onSurface} />
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

        <View style={styles.speedSection}>
          <AudioSpeedControl
            currentSpeed={playbackRate}
            onSpeedChange={handleSpeedChange}
            disabled={!currentBook}
          />
        </View>
      </ScrollView>

      {/* Part Selector Modal */}
      <Modal
        visible={partSelectorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPartSelectorVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {paddingBottom: insets.bottom + 16},
            ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Part</Text>
              <TouchableOpacity
                onPress={() => setPartSelectorVisible(false)}
                style={styles.modalCloseButton}>
                <Icon
                  name="close"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            </View>

            {completedCount > 0 && (
              <View style={styles.modalHistoryRow}>
                <Text style={styles.modalHistoryText}>
                  {completedCount} of {totalParts} completed
                </Text>
                <TouchableOpacity onPress={handleResetHistory}>
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={partsData}
              keyExtractor={item => String(item)}
              renderItem={({item: partIndex}) => {
                const isCurrent = partIndex === currentChapter;
                const status = partHistory[partIndex];
                const iconInfo = getPartStatusIcon(status, isCurrent);
                const statusLabel = getPartStatusLabel(status, isCurrent);
                return (
                  <TouchableOpacity
                    style={[
                      styles.partItem,
                      isCurrent && styles.partItemActive,
                    ]}
                    onPress={() => handleSelectPart(partIndex)}
                    activeOpacity={0.7}>
                    <Icon
                      name={iconInfo.name}
                      size={22}
                      color={iconInfo.color}
                    />
                    <View style={styles.partItemInfo}>
                      <Text
                        style={[
                          styles.partItemTitle,
                          isCurrent && styles.partItemTitleActive,
                        ]}>
                        Part {partIndex + 1}
                      </Text>
                      <Text style={styles.partItemStatus}>{statusLabel}</Text>
                    </View>
                    {isCurrent && (
                      <Icon
                        name="volume-high"
                        size={18}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
              style={styles.partList}
            />
          </View>
        </View>
      </Modal>
    </View>
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

  // Book detail link
  bookDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}10`,
  },
  bookDetailLinkText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  } as TextStyle,

  coverWrapper: {marginBottom: 24},
  cover: {borderRadius: theme.borderRadius.lg},
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
    width: '100%',
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    flex: 1,
  } as TextStyle,

  // Part navigation
  partSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  partNavButton: {
    padding: 8,
  },
  partTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  partText: {
    ...theme.typography.body2,
    color: theme.colors.onSurface,
    minWidth: 80,
    textAlign: 'center',
  } as TextStyle,
  partMenuIcon: {
    marginLeft: 2,
  },
  completedText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    marginTop: 6,
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
  speedSection: {
    width: '100%',
    marginTop: 8,
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

  // Part selector modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 8,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  } as TextStyle,
  modalCloseButton: {
    padding: 4,
  },
  modalHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 8,
  },
  modalHistoryText: {
    ...theme.typography.caption,
    color: theme.colors.success,
  } as TextStyle,
  resetText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
  } as TextStyle,
  partList: {
    paddingHorizontal: theme.spacing.lg,
  },
  partItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    gap: 12,
    marginBottom: 2,
  } as ViewStyle,
  partItemActive: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  partItemInfo: {
    flex: 1,
  },
  partItemTitle: {
    ...theme.typography.body2,
    color: theme.colors.text,
  } as TextStyle,
  partItemTitleActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  } as TextStyle,
  partItemStatus: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
    marginTop: 2,
  } as TextStyle,
});

export default PlayerScreen;
