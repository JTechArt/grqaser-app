import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
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
import {syncPlayProgress} from '../state/slices/booksSlice';
import {theme} from '../theme';
import {formatDuration} from '../utils/formatters';

type NavProp = StackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'in_progress' | 'favorites' | 'downloaded';

const FILTERS: {key: FilterType; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'in_progress', label: 'In progress'},
  {key: 'favorites', label: 'Favorites'},
  {key: 'downloaded', label: 'Downloaded'},
];

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const books = useSelector((s: RootState) => s.books.books);
  const libraryBookIds = useSelector(
    (s: RootState) => s.library.libraryBookIds,
  );
  const libraryLoading = useSelector((s: RootState) => s.library.loading);
  const libraryError = useSelector((s: RootState) => s.library.error);
  const favoriteIds = useSelector((s: RootState) => s.books.favorites);
  const downloadedBookIds = useSelector(
    (s: RootState) => s.download.downloadedBookIds,
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchLibraryEntries());
      dispatch(syncPlayProgress());
    }, [dispatch]),
  );

  const libraryBooks = useMemo(() => {
    const bookMap = new Map(books.map(b => [b.id, b]));
    return libraryBookIds
      .map(id => bookMap.get(id))
      .filter((b): b is Book => b != null);
  }, [books, libraryBookIds]);

  const filteredBooks = useMemo(() => {
    switch (activeFilter) {
      case 'in_progress':
        return libraryBooks.filter(b => {
          if (b.playProgress == null || b.playProgress <= 0) return false;
          if (b.duration != null && b.duration > 0) {
            return b.playProgress < b.duration;
          }
          return true;
        });
      case 'favorites':
        return libraryBooks.filter(b => favoriteIds.includes(b.id));
      case 'downloaded':
        return libraryBooks.filter(b => downloadedBookIds.includes(b.id));
      default:
        return libraryBooks;
    }
  }, [libraryBooks, activeFilter, favoriteIds, downloadedBookIds]);

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

  const renderItem = ({item}: {item: Book}) => {
    const isDownloaded = downloadedBookIds.includes(item.id);
    const progressPct =
      item.playProgress != null && item.duration != null && item.duration > 0
        ? Math.round((item.playProgress / item.duration) * 100)
        : null;

    return (
      <View style={styles.cardWrap}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleBookPress(item)}
          activeOpacity={0.7}>
          <View style={styles.coverWrap}>
            {item.coverImage ? (
              <Image source={{uri: item.coverImage}} style={styles.cover} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Icon
                  name="book-open-variant"
                  size={28}
                  color={theme.colors.onSurface}
                />
              </View>
            )}
            {isDownloaded && (
              <View style={styles.downloadedBadge}>
                <Icon name="arrow-down" size={12} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {item.author}
            </Text>
            {(item.duration != null || progressPct != null) && (
              <Text style={styles.duration}>
                {item.duration != null && item.duration > 0
                  ? formatDuration(item.duration)
                  : ''}
                {progressPct != null ? ` · ${progressPct}%` : ''}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(item.id)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="close" size={16} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 16}]}>
        <Text style={styles.headerTitle}>Library</Text>
        <Text style={styles.headerSubtitle}>Your reading & listening</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillRow}>
        {FILTERS.map(renderFilterPill)}
      </ScrollView>
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
          data={filteredBooks}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
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
  pillScroll: {
    flexGrow: 0,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
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
