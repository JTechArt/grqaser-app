/**
 * Component test for BookCard — key UI for browse/list and play flow entry.
 * Story 5.2 — key components and flows.
 */

import React from 'react';
import renderer from 'react-test-renderer';
import {Book} from '../../src/types/book';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-fast-image', () => {
  const F = function () {
    return null;
  };
  (F as any).resizeMode = {cover: 'cover'};
  return {__esModule: true, default: F};
});
jest.mock('react-native-paper', () => {
  const {View} = require('react-native');
  const CardWithContent = Object.assign(View, {Content: View});
  return {
    Text: 'Text',
    Card: CardWithContent,
  };
});
jest.mock('../../src/theme', () => ({
  theme: {
    colors: {
      primary: '#0d9488',
      error: '#dc3545',
    },
  },
}));

import BookCard from '../../src/components/BookCard';

const mockBook: Book = {
  id: '1',
  title: 'Test Book',
  author: 'Test Author',
  language: 'en',
  type: 'audiobook',
  category: 'Fiction',
};

describe('BookCard', () => {
  it('renders with minimal book (placeholder cover)', () => {
    const onPress = jest.fn();
    const tree = renderer.create(
      <BookCard book={mockBook} onPress={onPress} />,
    );
    expect(tree).toBeDefined();
    expect(tree.toJSON()).toBeDefined();
  });

  it('renders in compact mode', () => {
    const onPress = jest.fn();
    const tree = renderer.create(
      <BookCard book={mockBook} onPress={onPress} compact />,
    );
    expect(tree.toJSON()).toBeDefined();
  });

  it('calls onPress with book when pressed', () => {
    const onPress = jest.fn();
    const tree = renderer.create(
      <BookCard book={mockBook} onPress={onPress} />,
    );
    const touchable = tree.root.findByProps({activeOpacity: 0.7});
    touchable.props.onPress();
    expect(onPress).toHaveBeenCalledWith(mockBook);
  });

  it('renders with cover image when book.coverImage set', () => {
    const bookWithCover: Book = {
      ...mockBook,
      coverImage: 'https://example.com/cover.jpg',
    };
    const tree = renderer.create(
      <BookCard book={bookWithCover} onPress={jest.fn()} />,
    );
    expect(tree.toJSON()).toBeDefined();
  });
});
