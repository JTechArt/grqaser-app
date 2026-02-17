import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  TextStyle,
} from 'react-native';
import {RouteProp, useNavigation} from '@react-navigation/native';
import {useSelector, useDispatch} from 'react-redux';
import {Button, IconButton} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {toggleFavorite} from '../state/slices/booksSlice';
import {RootStackParamList} from '../navigation/types';
import {theme} from '../theme';
import {formatDuration} from '../utils/formatters';
import {playBook} from '../services/playerService';
import type {RootState} from '../state';

type BookDetailScreenRouteProp = RouteProp<RootStackParamList, 'BookDetail'>;

type Props = {route: BookDetailScreenRouteProp};

const COVER_ASPECT = 1.4;
const COVER_MAX_HEIGHT = 280;

const BookDetailScreen: React.FC<Props> = ({route}) => {
  const {width} = useWindowDimensions();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const playerError = useSelector((s: RootState) => s.player.error);
  const favoriteIds = useSelector((s: RootState) => s.books.favorites);
  const book = route.params?.book;
  const isFavorite = book ? favoriteIds.includes(book.id) : false;

  if (!book) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No book selected.</Text>
        </View>
      </View>
    );
  }

  const coverWidth = width;
  const coverHeight = Math.min(width / COVER_ASPECT, COVER_MAX_HEIGHT);
  const canPlay = book.type === 'audiobook' && book.audioUrl?.trim();

  const onPlayPress = () => {
    if (!canPlay) {
      return;
    }
    playBook(book).then(() => {
      (
        navigation as unknown as {
          navigate: (a: string, b?: {screen: string}) => void;
        }
      ).navigate('MainTabs', {screen: 'Player'});
    });
  };

  const ratingChip =
    book.rating != null ? (
      <View style={styles.chip}>
        <Icon name="star" size={14} color={theme.colors.primary} />
        <Text style={styles.chipText}>{book.rating.toFixed(1)}</Text>
      </View>
    ) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.coverContainer, {height: coverHeight}]}>
        {book.coverImage ? (
          <Image
            source={{uri: book.coverImage}}
            style={[styles.cover, {width: coverWidth, height: coverHeight}]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.coverPlaceholder,
              {width: coverWidth, height: coverHeight},
            ]}>
            <Icon
              name="book-open-variant"
              size={64}
              color={theme.colors.onSurface}
            />
            <Text style={styles.coverPlaceholderText}>
              {book.title.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{book.title}</Text>
          <IconButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            size={28}
            iconColor={isFavorite ? theme.colors.error : theme.colors.onSurface}
            onPress={() => book && dispatch(toggleFavorite(book.id))}
          />
        </View>
        <Text style={styles.author}>{book.author}</Text>
        <View style={styles.row}>
          {book.duration != null && book.duration > 0 && (
            <View style={styles.chip}>
              <Icon
                name="clock-outline"
                size={14}
                color={theme.colors.onSurface}
              />
              <Text style={styles.chipText}>
                {formatDuration(book.duration)}
              </Text>
            </View>
          )}
          {book.category ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{book.category}</Text>
            </View>
          ) : null}
          {ratingChip}
        </View>
        {book.description ? (
          <Text style={styles.description}>{book.description}</Text>
        ) : null}
        {playerError ? (
          <Text style={styles.errorText}>{playerError}</Text>
        ) : null}
        <Button
          mode="contained"
          onPress={onPlayPress}
          icon="play"
          disabled={!canPlay}
          style={styles.playButton}
          contentStyle={styles.playButtonContent}>
          Play
        </Button>
        {!canPlay && book.type === 'audiobook' ? (
          <Text style={styles.playHint}>
            No audio URL available for this book.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  content: {paddingBottom: 32},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {fontSize: 16, color: theme.colors.onSurface},
  coverContainer: {width: '100%', backgroundColor: theme.colors.surface},
  cover: {width: '100%', height: '100%'},
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  coverPlaceholderText: {
    marginTop: 8,
    fontSize: 24,
    color: theme.colors.onSurface,
  },
  meta: {padding: theme.spacing.lg},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    flex: 1,
  } as TextStyle,
  author: {
    ...theme.typography.body1,
    color: theme.colors.onSurface,
    marginBottom: 12,
  } as TextStyle,
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    marginHorizontal: -4,
  } as const,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
  } as TextStyle,
  description: {
    ...theme.typography.body2,
    color: theme.colors.text,
    marginBottom: 24,
  } as TextStyle,
  playButton: {marginBottom: 8},
  playButtonContent: {paddingVertical: 6},
  playHint: {
    ...theme.typography.caption,
    color: theme.colors.onSurface,
  } as TextStyle,
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    marginBottom: 12,
  } as TextStyle,
});

export default BookDetailScreen;
