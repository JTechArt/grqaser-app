import React from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import {Text, Card} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';

import {Book} from '../types/book';
import {theme} from '../theme';
import {formatDuration} from '../utils/formatters';

const {width} = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with margins

interface BookCardProps {
  book: Book;
  onPress: (book: Book) => void;
  compact?: boolean;
  showProgress?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  onPress,
  compact = false,
  showProgress = false,
}) => {
  // Use app theme from theme module (avoids shadowing imported theme)

  const handlePress = () => {
    onPress(book);
  };

  const renderCover = () => {
    if (book.coverImage) {
      return (
        <FastImage
          source={{uri: book.coverImage}}
          style={[styles.cover, compact && styles.coverCompact]}
          resizeMode={FastImage.resizeMode.cover}
        />
      );
    }

    return (
      <View
        style={[
          styles.cover,
          compact && styles.coverCompact,
          styles.placeholderCover,
        ]}>
        <Text style={styles.placeholderText}>
          {book.title.substring(0, 2).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderProgress = () => {
    if (!showProgress || !book.playProgress || !book.duration) {
      return null;
    }

    const progress = (book.playProgress / book.duration) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    );
  };

  const renderTypeIcon = () => {
    const iconName =
      book.type === 'audiobook' ? 'headphones' : 'book-open-variant';
    const iconColor =
      book.type === 'audiobook' ? theme.colors.primary : theme.colors.secondary;

    return (
      <View style={[styles.typeIcon, {backgroundColor: iconColor}]}>
        <Icon name={iconName} size={12} color="white" />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Card style={[styles.card, compact && styles.cardCompact]}>
        <View style={styles.coverContainer}>
          {renderCover()}
          {renderTypeIcon()}
          {book.isFavorite && (
            <View style={styles.favoriteIcon}>
              <Icon name="heart" size={16} color={theme.colors.error} />
            </View>
          )}
        </View>

        <Card.Content style={styles.content}>
          <Text
            style={[styles.title, compact && styles.titleCompact]}
            numberOfLines={2}
            ellipsizeMode="tail">
            {book.title}
          </Text>

          <Text
            style={[styles.author, compact && styles.authorCompact]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {book.author}
          </Text>

          {book.duration && (
            <Text style={[styles.duration, compact && styles.durationCompact]}>
              {formatDuration(book.duration)}
            </Text>
          )}

          {renderProgress()}

          {book.rating && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={12} color={theme.colors.secondary} />
              <Text style={styles.ratingText}>{book.rating.toFixed(1)}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    marginBottom: 15,
  },
  containerCompact: {
    width: 120,
    marginRight: 15,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
  },
  cardCompact: {
    borderRadius: 8,
    elevation: 2,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  coverCompact: {
    height: 80,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  placeholderCover: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  typeIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  titleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  author: {
    fontSize: 12,
    color: theme.colors.onSurface,
    marginBottom: 6,
  },
  authorCompact: {
    fontSize: 10,
    marginBottom: 4,
  },
  duration: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  durationCompact: {
    fontSize: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: theme.colors.surface,
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: theme.colors.onSurface,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 10,
    color: theme.colors.onSurface,
    marginLeft: 4,
  },
});

export default BookCard;
