import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextStyle,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector, useDispatch} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme} from '../theme';
import type {RootState, AppDispatch} from '../state';
import {dismissBanner, cancelDownload} from '../state/slices/downloadSlice';

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function computeProgress(progress: {
  bytesWritten: number;
  contentLength: number;
  fraction: number;
  overallFraction?: number;
  currentFileIndex?: number;
  totalFiles?: number;
  completedFiles?: number;
}): {pct: number; statusText: string} {
  const isMultiFile =
    progress.totalFiles != null && progress.totalFiles > 1;

  if (isMultiFile) {
    const completed = progress.completedFiles ?? 0;
    const total = progress.totalFiles!;
    const currentFile = (progress.currentFileIndex ?? 0) + 1;

    let pct: number;
    if (progress.overallFraction != null && progress.overallFraction > 0) {
      pct = Math.round(progress.overallFraction * 100);
    } else {
      pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    let statusText = `Part ${currentFile} of ${total}`;
    if (progress.bytesWritten > 0) {
      statusText += ` · ${formatBytes(progress.bytesWritten)}`;
    }
    return {pct, statusText};
  }

  if (progress.contentLength > 0) {
    return {
      pct: Math.round(progress.fraction * 100),
      statusText: `${formatBytes(progress.bytesWritten)} / ${formatBytes(progress.contentLength)}`,
    };
  }

  if (progress.bytesWritten > 0) {
    return {
      pct: -1,
      statusText: `${formatBytes(progress.bytesWritten)} downloaded`,
    };
  }

  return {pct: 0, statusText: 'Starting…'};
}

const DownloadProgressBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  const downloadingBooks = useSelector(
    (s: RootState) => s.download.downloadingBooks,
  );
  const bannerDismissed = useSelector(
    (s: RootState) => s.download.bannerDismissed,
  );
  const booksById = useSelector((s: RootState) => s.books.booksById);

  const handleDismiss = useCallback(() => {
    dispatch(dismissBanner());
  }, [dispatch]);

  const handleCancelPress = useCallback(
    (bookId: string, title: string) => {
      Alert.alert(
        'Cancel Download',
        `Stop downloading "${title}"?`,
        [
          {text: 'Keep Downloading', style: 'cancel'},
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: () => dispatch(cancelDownload(bookId)),
          },
        ],
      );
    },
    [dispatch],
  );

  const entries = Object.entries(downloadingBooks);
  if (entries.length === 0 || bannerDismissed) {
    return null;
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top + theme.spacing.sm}]}>
      <TouchableOpacity
        onPress={handleDismiss}
        style={[styles.closeBtn, {top: insets.top + 4}]}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        activeOpacity={0.6}>
        <Icon name="chevron-up" size={20} color={theme.colors.onSurface} />
      </TouchableOpacity>

      {entries.map(([bookId, progress]) => {
        const book = booksById[bookId];
        const title = book?.title ?? bookId;
        const {pct, statusText} = computeProgress(progress);

        return (
          <TouchableOpacity
            key={bookId}
            style={styles.item}
            activeOpacity={0.8}
            onLongPress={() => handleCancelPress(bookId, title)}
            delayLongPress={600}>
            <Icon
              name="download"
              size={18}
              color={theme.colors.primary}
              style={styles.icon}
            />
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.barTrack}>
                  {pct >= 0 ? (
                    <View
                      style={[
                        styles.barFill,
                        {width: `${Math.max(pct, 2)}%`},
                      ]}
                    />
                  ) : (
                    <View style={[styles.barFill, styles.barIndeterminate]} />
                  )}
                </View>
                <Text style={styles.pct}>
                  {pct >= 0 ? `${pct}%` : '…'}
                </Text>
              </View>
              <Text style={styles.statusText} numberOfLines={1}>
                {statusText}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  closeBtn: {
    position: 'absolute',
    right: 8,
    zIndex: 10,
    padding: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 28,
    gap: 10,
  },
  icon: {marginTop: 2},
  info: {flex: 1},
  title: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 3,
  } as TextStyle,
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  barIndeterminate: {
    width: '40%',
  },
  pct: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  } as TextStyle,
  statusText: {
    fontSize: 10,
    color: theme.colors.onSurface,
  } as TextStyle,
});

export default DownloadProgressBanner;
