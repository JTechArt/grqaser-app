import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextStyle,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {RootState} from '../state';
import type {RootStackParamList} from '../navigation/types';
import type {Book} from '../types/book';
import {theme} from '../theme';

type NavProp = StackNavigationProp<RootStackParamList>;

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const books = useSelector((s: RootState) => s.books.books);
  const favoriteIds = useSelector((s: RootState) => s.books.favorites);
  const downloadedBookIds = useSelector(
    (s: RootState) => s.download.downloadedBookIds,
  );

  const favoriteBooks = useMemo(
    () => books.filter(b => favoriteIds.includes(b.id)),
    [books, favoriteIds],
  );

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const renderItem = ({item}: {item: Book}) => {
    const isDownloaded = downloadedBookIds.includes(item.id);
    return (
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
        </View>
      </TouchableOpacity>
    );
  };

  if (favoriteBooks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="bookshelf" size={48} color={theme.colors.onSurface} />
        <Text style={styles.emptyText}>
          Your library is empty. Mark books as favorites to see them here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favoriteBooks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  list: {padding: 16},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    ...theme.typography.body1,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginTop: 16,
  } as TextStyle,
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
    overflow: 'hidden',
  },
  coverWrap: {
    position: 'relative',
    width: 72,
    height: 100,
  },
  cover: {
    width: 72,
    height: 100,
    borderTopLeftRadius: theme.borderRadius.md,
    borderBottomLeftRadius: theme.borderRadius.md,
  },
  coverPlaceholder: {
    width: 72,
    height: 100,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
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
});

export default LibraryScreen;
