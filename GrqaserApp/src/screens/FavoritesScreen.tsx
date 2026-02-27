import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import {Searchbar} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {RootState} from '../state';
import type {AppDispatch} from '../state';
import {fetchBooksByIds} from '../state/slices/booksSlice';
import BookCard from '../components/BookCard';
import {useBookGridLayout} from '../utils/bookGridLayout';
import {theme} from '../theme';
import type {Book} from '../types/book';
import type {RootStackParamList} from '../navigation/types';
import type {StackNavigationProp} from '@react-navigation/stack';

type NavProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const {cardWidth, numColumns} = useBookGridLayout();
  const {booksById, favorites} = useSelector((s: RootState) => s.books);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (favorites.length > 0) {
      dispatch(fetchBooksByIds(favorites));
    }
  }, [dispatch, favorites]);

  const favoriteBooks = useMemo(
    () =>
      favorites.map(id => booksById[id]).filter((b): b is Book => b != null),
    [favorites, booksById],
  );

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return favoriteBooks;
    }
    const q = searchQuery.trim().toLowerCase();
    return favoriteBooks.filter(
      b =>
        b.title.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q),
    );
  }, [favoriteBooks, searchQuery]);

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const renderBook = ({item}: {item: Book}) => (
    <View style={[styles.cardWrapper, {width: cardWidth}]}>
      <BookCard book={item} onPress={() => handleBookPress(item)} compact />
    </View>
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top + 8}]}>
      <Searchbar
        placeholder="Search favorites..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchBar}
      />
      {favoriteBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the heart on a book to add it here.
          </Text>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptySubtext}>
            No favorites match "{searchQuery.trim()}".
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderBook}
          key={numColumns}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  searchBar: {marginHorizontal: 8, marginBottom: 8},
  listContent: {padding: 8, paddingBottom: 24},
  cardWrapper: {margin: 6},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.onSurface,
  },
});

export default FavoritesScreen;
