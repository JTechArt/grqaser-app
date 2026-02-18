import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TextStyle} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import type {RootState} from '../state';
import type {AppDispatch} from '../state';
import {fetchBooks} from '../state/slices/booksSlice';
import BookCard from '../components/BookCard';
import {theme} from '../theme';
import type {Book} from '../types/book';
import type {RootStackParamList} from '../navigation/types';
import type {StackNavigationProp} from '@react-navigation/stack';

type NavProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const dispatch = useDispatch<AppDispatch>();
  const {books, favorites} = useSelector((s: RootState) => s.books);

  useEffect(() => {
    dispatch(fetchBooks());
  }, [dispatch]);

  const favoriteBooks = books.filter((b: Book) => favorites.includes(b.id));

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  if (favoriteBooks.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyTitle}>No favorites yet</Text>
        <Text style={styles.emptySubtext}>
          Tap the heart on a book to add it here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {favoriteBooks.map((book: Book, index) => (
          <BookCard
            key={`${book.id}-${index}`}
            book={book}
            onPress={handleBookPress}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  content: {padding: theme.spacing.md, paddingBottom: 32},
  centered: {justifyContent: 'center', alignItems: 'center'},
  emptyTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
  } as TextStyle,
  emptySubtext: {
    ...theme.typography.body2,
    color: theme.colors.onSurface,
    marginTop: 8,
    textAlign: 'center',
  } as TextStyle,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
});

export default FavoritesScreen;
