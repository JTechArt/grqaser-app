import React from 'react';
import {Text, TouchableOpacity, StyleSheet} from 'react-native';
import {BookCategory} from '../types/book';

type Props = {
  category: BookCategory;
  onPress?: () => void;
};

const CategoryCard: React.FC<Props> = ({category, onPress}) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.name}>{category.name}</Text>
    <Text style={styles.count}>{category.bookCount} books</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
    minWidth: 120,
  },
  name: {fontSize: 16, fontWeight: '600'},
  count: {fontSize: 12, marginTop: 4, color: '#666'},
});

export default CategoryCard;
