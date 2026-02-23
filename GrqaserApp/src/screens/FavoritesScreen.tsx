import React, {useEffect} from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import type {RootState} from '../state';
import type {AppDispatch} from '../state';
import {fetchBooksByIds} from '../state/slices/booksSlice';
import BookCard from '../components/BookCard';
import {useBookGridLayout} from '../utils/bookGridLayout';
import type {Book} from '../types/book';
import type {RootStackParamList} from '../navigation/types';
import type {StackNavigationProp} from '@react-navigation/stack';

type NavProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const dispatch = useDispatch<AppDispatch>();
  const {cardWidth, numColumns} = useBookGridLayout();
  const {booksById, favorites} = useSelector((s: RootState) => s.books);

  useEffect(() => {
    if (favorites.length > 0) {
      dispatch(fetchBooksByIds(favorites));
    }
  }, [dispatch, favorites]);

  const favoriteBooks = favorites
    .map(id => booksById[id])
    .filter((b): b is Book => b != null);

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const renderBook = ({item}: {item: Book}) => (
    <View style={[styles.cardWrapper, {width: cardWidth}]}>
      <BookCard book={item} onPress={() => handleBookPress(item)} compact />
    </View>
  );

  if (favoriteBooks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the heart on a book to add it here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favoriteBooks}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderBook}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  listContent: {padding: 8, paddingBottom: 24},
  cardWrapper: {margin: 6},
  emptyContainer: {
    paddingTop: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default FavoritesScreen;
