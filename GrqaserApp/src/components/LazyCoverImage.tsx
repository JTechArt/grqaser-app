/**
 * Lazy-loaded book cover image with placeholder.
 * Uses FastImage for caching; loads only when component mounts (visible in list).
 * Shows placeholder until image loads. Supports memory cleanup via imageCacheService.
 *
 * Story 10.6: Book Cover Images — Lazy Load and Memory Cleanup
 */

import React, {useState, useCallback} from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';

import {theme} from '../theme';

export interface LazyCoverImageProps {
  uri: string | undefined;
  style?: ViewStyle;
  /** Compact size (e.g. 80x110) vs normal card size */
  compact?: boolean;
  /** Placeholder text (e.g. book initials) */
  placeholderText?: string;
  /** Priority for list items; use low for off-screen buffer */
  priority?: 'low' | 'normal' | 'high';
}

const LazyCoverImage: React.FC<LazyCoverImageProps> = ({
  uri,
  style,
  compact = false,
  placeholderText,
  priority = 'normal',
}) => {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const priorityMap = {
    low: FastImage.priority.low,
    normal: FastImage.priority.normal,
    high: FastImage.priority.high,
  };

  if (!uri || uri.trim() === '') {
    return (
      <View
        style={[
          styles.placeholder,
          compact && styles.placeholderCompact,
          style,
        ]}>
        {placeholderText ? (
          <Text
            style={[
              styles.placeholderText,
              compact && styles.placeholderTextCompact,
            ]}>
            {placeholderText}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <View
        style={[
          styles.placeholder,
          compact && styles.placeholderCompact,
          styles.placeholderBehind,
        ]}>
        {placeholderText ? (
          <Text
            style={[
              styles.placeholderText,
              compact && styles.placeholderTextCompact,
            ]}>
            {placeholderText}
          </Text>
        ) : null}
      </View>
      <FastImage
        source={{
          uri,
          priority: priorityMap[priority],
        }}
        style={[
          styles.image,
          compact && styles.imageCompact,
          !loaded && styles.imageHidden,
        ]}
        resizeMode={FastImage.resizeMode.cover}
        onLoad={handleLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  containerCompact: {
    height: 80,
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderCompact: {
    // same, size comes from container
  },
  placeholderBehind: {
    zIndex: 0,
  },
  placeholderText: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholderTextCompact: {
    fontSize: 14,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  imageCompact: {
    // same
  },
  imageHidden: {
    opacity: 0,
  },
});

export default LazyCoverImage;
