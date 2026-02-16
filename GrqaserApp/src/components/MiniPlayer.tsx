import React from 'react';
import {Text, TouchableOpacity, StyleSheet} from 'react-native';

type Props = {
  title?: string;
  onPress?: () => void;
};

const MiniPlayer: React.FC<Props> = ({title, onPress}) => (
  <TouchableOpacity
    style={styles.container}
    onPress={onPress}
    activeOpacity={0.8}>
    <Text style={styles.text} numberOfLines={1}>
      {title ?? 'Mini Player'}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  text: {fontSize: 14},
});

export default MiniPlayer;
