import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {StackNavigationProp} from '@react-navigation/stack';
import {Searchbar, ActivityIndicator, Button} from 'react-native-paper';
import {RootStackParamList} from '../navigation/types';
import {RootState, AppDispatch} from '../state';
import {searchBooks, clearSearchError} from '../state/slices/booksSlice';
import BookCard from '../components/BookCard';
import {Book} from '../types/book';

type SearchScreenNavProp = StackNavigationProp<RootStackParamList, 'Search'>;

type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

const SearchScreen: React.FC = () => {
  const route = useRoute<SearchScreenRouteProp>();
  const navigation = useNavigation<SearchScreenNavProp>();
  const dispatch = useDispatch<AppDispatch>();
  const {width} = useWindowDimensions();
  const initialQuery = route.params?.initialQuery ?? '';
  const [query, setQuery] = useState(initialQuery);

  const {filteredBooks, searchLoading, searchError} = useSelector(
    (state: RootState) => state.books,
  );

  useEffect(() => {
    if (initialQuery.trim()) {
      dispatch(searchBooks(initialQuery));
      setQuery(initialQuery);
    }
  }, [initialQuery, dispatch]);

  const handleSearch = () => {
    if (query.trim()) {
      dispatch(searchBooks(query.trim()));
    }
  };

  const cardWidth = width * 0.45;
  const numColumns = Math.floor(width / (cardWidth + 12)) || 2;

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const renderBook = ({item}: {item: Book}) => (
    <View style={[styles.cardWrapper, {width: cardWidth}]}>
      <BookCard book={item} onPress={() => handleBookPress(item)} compact />
    </View>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search books, authors..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
        style={styles.searchBar}
      />
      <View style={styles.results}>
        {searchError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{searchError}</Text>
            <Button onPress={() => dispatch(clearSearchError())}>
              Dismiss
            </Button>
          </View>
        ) : searchLoading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredBooks}
            keyExtractor={item => item.id}
            renderItem={renderBook}
            key={numColumns}
            numColumns={numColumns}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              query.trim() ? (
                <Text style={styles.empty}>No books found.</Text>
              ) : (
                <Text style={styles.hint}>Enter a search term above.</Text>
              )
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  searchBar: {margin: 8},
  results: {flex: 1},
  loader: {marginTop: 24},
  errorBox: {padding: 16, alignItems: 'center'},
  errorText: {color: '#b00020', marginBottom: 8, textAlign: 'center'},
  listContent: {padding: 8, paddingBottom: 24},
  cardWrapper: {margin: 6},
  empty: {textAlign: 'center', marginTop: 24, fontSize: 16},
  hint: {textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666'},
});

export default SearchScreen;
