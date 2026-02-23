import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextStyle,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import {StackNavigationProp} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {RootState, AppDispatch} from '../state';
import type {RootStackParamList} from '../navigation/types';
import type {Book} from '../types/book';
import {
  fetchLibraryEntries,
  removeBookFromLibrary,
} from '../state/slices/librarySlice';
import {syncPlayProgress, fetchBooksByIds} from '../state/slices/booksSlice';
import {theme} from '../theme';
import {formatDuration} from '../utils/formatters';
import LazyCoverImage from '../components/LazyCoverImage';

type NavProp = StackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'in_progress' | 'downloaded';

const FILTERS: {key: FilterType; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'in_progress', label: 'In Progress'},
  {key: 'downloaded', label: 'Downloads'},
];

/** Placeholder row when a download has started but book details aren't loaded yet */
interface DownloadPlaceholder {
  id: string;
  placeholder: true;
  downloadPct: number;
}

type LibraryListItem = Book | DownloadPlaceholder;

function isPlaceholder(item: LibraryListItem): item is DownloadPlaceholder {
  return 'placeholder' in item && item.placeholder === true;
}

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const booksById = useSelector((s: RootState) => s.books.booksById);
  const libraryBookIds = useSelector(
    (s: RootState) => s.library.libraryBookIds,
  );
  const libraryEntries = useSelector(
    (s: RootState) => s.library.libraryEntries,
  );
  const libraryLoading = useSelector((s: RootState) => s.library.loading);
  const libraryError = useSelector((s: RootState) => s.library.error);
  const downloadedBookIds = useSelector(
    (s: RootState) => s.download.downloadedBookIds,
  );
  const downloadingBooks = useSelector(
    (s: RootState) => s.download.downloadingBooks,
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchLibraryEntries());
      dispatch(syncPlayProgress());
    }, [dispatch]),
  );

  const downloadingBookIds = useMemo(
    () => Object.keys(downloadingBooks),
    [downloadingBooks],
  );

  useEffect(() => {
    const idsToLoad = new Set(libraryBookIds);
    downloadingBookIds.forEach(id => idsToLoad.add(id));
    if (idsToLoad.size > 0) {
      dispatch(fetchBooksByIds(Array.from(idsToLoad)));
    }
  }, [dispatch, libraryBookIds, downloadingBookIds]);

  const libraryBooks = useMemo(() => {
    return libraryBookIds
      .map(id => booksById[id])
      .filter((b): b is Book => b != null);
  }, [booksById, libraryBookIds]);

  const IN_PROGRESS_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const filteredBooks = useMemo(() => {
    switch (activeFilter) {
      case 'in_progress': {
        const now = Date.now();
        const cutoff = now - IN_PROGRESS_DAYS_MS;
        const openedRecently = new Set(
          libraryEntries
            .filter(e => new Date(e.lastOpenedAt).getTime() >= cutoff)
            .map(e => e.bookId),
        );
        return libraryBooks.filter(b => openedRecently.has(b.id));
      }
      case 'downloaded': {
        const downloadedSet = new Set(downloadedBookIds);
        const downloadingSet = new Set(downloadingBookIds);
        const inLibraryDownloadedOrDownloading = libraryBooks.filter(
          b => downloadedSet.has(b.id) || downloadingSet.has(b.id),
        );
        const onlyDownloadingBooks = downloadingBookIds
          .filter(id => !libraryBookIds.includes(id))
          .map(id => booksById[id])
          .filter((b): b is Book => b != null);
        const placeholders: DownloadPlaceholder[] = downloadingBookIds
          .filter(id => booksById[id] == null)
          .map(id => {
            const prog = downloadingBooks[id];
            const pct =
              prog && prog.contentLength > 0
                ? Math.round(prog.fraction * 100)
                : 0;
            return {id, placeholder: true as const, downloadPct: pct};
          });
        return [
          ...inLibraryDownloadedOrDownloading,
          ...onlyDownloadingBooks,
          ...placeholders,
        ];
      }
      default:
        return libraryBooks;
    }
  }, [
    libraryBooks,
    libraryEntries,
    activeFilter,
    downloadedBookIds,
    downloadingBookIds,
    downloadingBooks,
    libraryBookIds,
    booksById,
  ]);

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const handleRemove = (bookId: string) => {
    dispatch(removeBookFromLibrary(bookId));
  };

  const renderFilterPill = ({key, label}: {key: FilterType; label: string}) => {
    const isActive = activeFilter === key;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.pill, isActive && styles.pillActive]}
        onPress={() => setActiveFilter(key)}
        activeOpacity={0.7}>
        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({item}: {item: LibraryListItem}) => {
    if (isPlaceholder(item)) {
      return (
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <View style={[styles.coverWrap, styles.coverPlaceholder]}>
              <View style={styles.downloadProgressOverlay}>
                <Text style={styles.downloadProgressText}>
                  {item.downloadPct}%
                </Text>
                <Text style={styles.downloadProgressSubtext}>Downloading…</Text>
              </View>
            </View>
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>
                Loading…
              </Text>
            </View>
          </View>
        </View>
      );
    }

    const book = item;
    const isDownloaded = downloadedBookIds.includes(book.id);
    const downloadProgress = downloadingBooks[book.id];
    const isDownloading = downloadProgress != null;
    const downloadPct =
      isDownloading && downloadProgress.contentLength > 0
        ? Math.round(downloadProgress.fraction * 100)
        : isDownloading ? 0 : null;
    const progressPct =
      book.playProgress != null && book.duration != null && book.duration > 0
        ? Math.round((book.playProgress / book.duration) * 100)
        : null;

    return (
      <View style={styles.cardWrap}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleBookPress(book)}
          activeOpacity={0.7}>
          <View style={styles.coverWrap}>
            <LazyCoverImage
              uri={book.coverImage}
              style={styles.cover}
              compact
              placeholderText={book.title.substring(0, 2).toUpperCase()}
              priority="normal"
            />
            {isDownloading && (
              <View style={styles.downloadProgressOverlay} pointerEvents="none">
                <Text style={styles.downloadProgressText}>
                  {downloadPct !== null ? `${downloadPct}%` : '…'}
                </Text>
                <Text style={styles.downloadProgressSubtext}>Downloading</Text>
              </View>
            )}
            {isDownloaded && !isDownloading && (
              <View style={styles.downloadedBadge}>
                <Icon name="arrow-down" size={12} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {book.author}
            </Text>
            {(book.duration != null || progressPct != null) && (
              <Text style={styles.duration}>
                {book.duration != null && book.duration > 0
                  ? formatDuration(book.duration)
                  : ''}
                {progressPct != null ? ` · ${progressPct}%` : ''}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        {libraryBookIds.includes(book.id) && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemove(book.id)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="close" size={16} color={theme.colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, {paddingTop: insets.top + 16}]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSubtitle}>Your reading & listening</Text>
        </View>
        <View style={styles.sectionButtonsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillRow}>
            {FILTERS.map(renderFilterPill)}
          </ScrollView>
        </View>
      </View>
      {libraryError ? (
        <View style={styles.errorContainer}>
          <Icon
            name="alert-circle-outline"
            size={32}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{libraryError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchLibraryEntries())}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : libraryLoading && libraryBookIds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : libraryBookIds.length > 0 && libraryBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptyText, styles.loadingBooksText]}>
            Loading books…
          </Text>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="bookshelf" size={48} color={theme.colors.onSurface} />
          <Text style={styles.emptyText}>
            {activeFilter === 'all'
              ? 'Your library is empty. Open a book to add it here.'
              : `No ${FILTERS.find(
                  f => f.key === activeFilter,
                )?.label.toLowerCase()} books.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks as LibraryListItem[]}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
};

const SECTION_BUTTONS_HEIGHT = 52;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  headerRow: {
    flexShrink: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
  } as TextStyle,
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
    marginTop: 2,
  } as TextStyle,
  sectionButtonsWrap: {
    height: SECTION_BUTTONS_HEIGHT,
    flexShrink: 0,
  },
  pillScroll: {
    flexGrow: 0,
    height: SECTION_BUTTONS_HEIGHT,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    minHeight: SECTION_BUTTONS_HEIGHT,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    minWidth: 96,
    flexShrink: 0,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
    fontWeight: '500',
  } as TextStyle,
  pillTextActive: {
    color: '#ffffff',
  },
  list: {paddingHorizontal: 20, paddingBottom: 24},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    ...theme.typography.body1,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginTop: 16,
  } as TextStyle,
  cardWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    paddingRight: 40,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  coverWrap: {
    position: 'relative',
    width: 80,
    height: 110,
  },
  cover: {
    width: 80,
    height: 110,
    borderTopLeftRadius: theme.borderRadius.md,
    borderBottomLeftRadius: theme.borderRadius.md,
  },
  coverPlaceholder: {
    width: 80,
    height: 110,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: theme.borderRadius.md,
    borderBottomLeftRadius: theme.borderRadius.md,
  },
  downloadProgressText: {
    ...theme.typography.h2,
    color: '#ffffff',
    fontWeight: '700',
  } as TextStyle,
  downloadProgressSubtext: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  } as TextStyle,
  downloadedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBooksText: {
    marginTop: 12,
  } as TextStyle,
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.body1,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  } as TextStyle,
  author: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
  } as TextStyle,
  duration: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
    marginTop: 4,
  } as TextStyle,
  removeBtn: {
    position: 'absolute',
    top: '50%',
    right: 8,
    transform: [{translateY: -14}],
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  } as TextStyle,
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryBtnText: {
    ...theme.typography.button,
    color: '#ffffff',
  } as TextStyle,
});

export default LibraryScreen;
