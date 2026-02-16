import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, RefreshControl} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {Text, Searchbar, ActivityIndicator, Banner} from 'react-native-paper';
import {StackNavigationProp} from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';

import {RootStackParamList} from '../navigation/types';
import {RootState, AppDispatch} from '../state';
import {
  fetchBooks,
  fetchCategories,
  setSearchQuery,
  clearError,
} from '../state/slices/booksSlice';
import {Book, BookCategory} from '../types/book';
import BookCard from '../components/BookCard';
import CategoryCard from '../components/CategoryCard';
import MiniPlayer from '../components/MiniPlayer';
import {theme} from '../theme';

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  // theme from '../theme' used for consistency; useTheme() would shadow import
  const [refreshing, setRefreshing] = useState(false);
  const [_searchVisible, _setSearchVisible] = useState(false);

  const {books, filteredBooks, categories, loading, error, searchQuery} =
    useSelector((state: RootState) => state.books);

  const {currentBook} = useSelector((state: RootState) => state.player);

  useEffect(() => {
    dispatch(fetchBooks());
    dispatch(fetchCategories());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([dispatch(fetchBooks()), dispatch(fetchCategories())]);
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const handleCategoryPress = (category: BookCategory) => {
    navigation.navigate('Category', {category});
  };

  const handleSearchPress = () => {
    navigation.navigate('Search', {initialQuery: searchQuery});
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
      style={styles.header}>
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

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{books.length}</Text>
        <Text style={styles.statLabel}>Total Books</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>
          {books.filter(book => book.type === 'audiobook').length}
        </Text>
        <Text style={styles.statLabel}>Audiobooks</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>
          {books.filter(book => book.type === 'ebook').length}
        </Text>
        <Text style={styles.statLabel}>E-books</Text>
      </View>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.seeAllText}>See All</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}>
        {categories.slice(0, 6).map(category => (
          <CategoryCard
            key={category.id}
            category={category}
            onPress={() => handleCategoryPress(category)}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderBooks = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Books</Text>
        <Text style={styles.seeAllText}>See All</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No books yet. Pull down to refresh.
          </Text>
        </View>
      ) : (
        <View style={styles.booksGrid}>
          {filteredBooks.slice(0, 6).map(book => (
            <BookCard
              key={book.id}
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
          <Text style={styles.seeAllText}>See All</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentBooksContainer}>
          {recentBooks.map(book => (
            <BookCard
              key={book.id}
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
      {error ? (
        <Banner
          visible={!!error}
          actions={[
            {
              label: 'Dismiss',
              onPress: () => dispatch(clearError()),
            },
          ]}
          icon="alert">
          {error}
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
        {renderCategories()}
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchBar: {
    backgroundColor: 'white',
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
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
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
});

export default HomeScreen;
