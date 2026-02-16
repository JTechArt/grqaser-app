import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme} from '../theme';
import type {RootState} from '../state';

type Props = {
  onPress?: () => void;
};

const MiniPlayer: React.FC<Props> = ({onPress}) => {
  const currentBook = useSelector((s: RootState) => s.player.currentBook);
  const isPlaying = useSelector((s: RootState) => s.player.isPlaying);

  if (!currentBook) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={styles.content}>
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={theme.colors.primary}
        />
        <Text style={styles.title} numberOfLines={1}>
          {currentBook.title}
        </Text>
        <Icon name="chevron-up" size={24} color={theme.colors.onSurface} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline || '#e0e0e0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    ...theme.typography.body2,
    color: theme.colors.text,
  },
});

export default MiniPlayer;
