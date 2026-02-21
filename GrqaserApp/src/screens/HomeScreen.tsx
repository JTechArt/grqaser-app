import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {Text, Searchbar, ActivityIndicator, Banner} from 'react-native-paper';
import {StackNavigationProp} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import {RootStackParamList} from '../navigation/types';
import {RootState, AppDispatch} from '../state';
import {
  fetchBooks,
  setSearchQuery,
  clearError,
} from '../state/slices/booksSlice';
import {initializeDatabases} from '../state/slices/databaseSlice';
import {Book} from '../types/book';
import BookCard from '../components/BookCard';
import MiniPlayer from '../components/MiniPlayer';
import {theme} from '../theme';
import {Button} from 'react-native-paper';

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {books, filteredBooks, loading, error, searchQuery} = useSelector(
    (state: RootState) => state.books,
  );
  const {currentBook} = useSelector((state: RootState) => state.player);
  const {initialized: dbInitialized, error: dbError} = useSelector(
    (state: RootState) => state.database,
  );
  const favoritesCount = useSelector(
    (state: RootState) => state.books.favorites.length,
  );

  useEffect(() => {
    if (!dbInitialized) {
      dispatch(initializeDatabases()).then(action => {
        if (action.meta.requestStatus === 'fulfilled') {
          dispatch(fetchBooks());
        }
      });
    } else {
      dispatch(fetchBooks());
    }
  }, [dispatch, dbInitialized]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchBooks());
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const handleSearchPress = () => {
    navigation.navigate('Search', {initialQuery: searchQuery});
  };

  const displayError = dbError || error;

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.colors.accentLight, theme.colors.surface]}
      style={[styles.header, {paddingTop: insets.top + 20}]}>
      <View style={styles.headerContent}>
        <Text style={styles.appTitle}>Grqaser</Text>
        <Text style={styles.appSubtitle}>Book Lover</Text>
      </View>

      <Searchbar
        placeholder="Search for books, authors..."
        onChangeText={handleSearch}
        value={searchQuery}
        onPressIn={handleSearchPress}
        style={styles.searchBar}
        iconColor={theme.colors.primary}
        inputStyle={styles.searchInput}
      />
    </LinearGradient>
  );

  const audiobookCount = books.filter(b => b.type === 'audiobook').length;
  const ebookCount = books.filter(b => b.type === 'ebook').length;

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{audiobookCount}</Text>
        <Text style={styles.statLabel}>Audiobooks</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{ebookCount}</Text>
        <Text style={styles.statLabel}>E-books</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{favoritesCount}</Text>
        <Text style={styles.statLabel}>Favorites</Text>
      </View>
    </View>
  );

  const renderBooks = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Books</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No books yet. Pull down to refresh.
          </Text>
          <Text style={styles.emptyStateHint}>
            You can also load a catalog database from Settings.
          </Text>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsBtn}
            textColor={theme.colors.primary}
            icon="cog">
            Open Settings
          </Button>
        </View>
      ) : (
        <View style={styles.booksGrid}>
          {filteredBooks.slice(0, 6).map((book, index) => (
            <BookCard
              key={`${book.id}-${index}`}
              book={book}
              onPress={() => handleBookPress(book)}
            />
          ))}
        </View>
      )}
    </View>
  );

  const renderRecentBooks = () => {
    const recentBooks = books
      .filter(book => book.lastPlayedAt)
      .sort(
        (a, b) =>
          new Date(b.lastPlayedAt!).getTime() -
          new Date(a.lastPlayedAt!).getTime(),
      )
      .slice(0, 4);

    if (recentBooks.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentBooksContainer}>
          {recentBooks.map((book, index) => (
            <BookCard
              key={`${book.id}-${index}`}
              book={book}
              onPress={() => handleBookPress(book)}
              compact
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {displayError ? (
        <Banner
          visible={!!displayError}
          actions={[
            {
              label: 'Dismiss',
              onPress: () => dispatch(clearError()),
            },
          ]}
          icon="alert">
          {displayError}
        </Banner>
      ) : null}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderStats()}
        {renderRecentBooks()}
        {renderBooks()}
      </ScrollView>
      {currentBook && <MiniPlayer />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginTop: 4,
  },
  searchBar: {
    backgroundColor: theme.colors.surface,
    borderRadius: 25,
    elevation: 4,
  },
  searchInput: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurface,
    marginTop: 5,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  recentBooksContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  emptyStateHint: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginTop: 8,
    textAlign: 'center',
  },
  settingsBtn: {
    marginTop: 16,
    borderColor: theme.colors.primary,
  },
});

export default HomeScreen;
