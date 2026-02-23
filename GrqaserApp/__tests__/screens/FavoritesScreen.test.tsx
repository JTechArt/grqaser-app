/**
 * FavoritesScreen tests — Story 10.3 layout alignment and regressions.
 */

import React from 'react';
import renderer from 'react-test-renderer';
import {act} from 'react-test-renderer';
import {Provider} from 'react-redux';
import {store} from '../../src/state';
import {fetchBooksByIds} from '../../src/state/slices/booksSlice';
import FavoritesScreen from '../../src/screens/FavoritesScreen';
import {Book} from '../../src/types/book';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../src/theme', () => ({
  theme: {
    colors: {
      primary: '#0d9488',
      error: '#dc3545',
      onSurface: '#64748b',
      surface: '#ffffff',
    },
  },
}));
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
  return {Text: 'Text', Card: CardWithContent};
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn()}),
}));
jest.mock('../../src/services/booksApi', () => ({
  booksApi: {
    getBooksByIds: jest.fn().mockImplementation((ids: string[]) =>
      Promise.resolve(
        ids.map(id => ({
          id,
          title: 'Favorite Book',
          author: 'Author',
          language: 'en',
          type: 'audiobook',
          category: 'Fiction',
        })),
      ),
    ),
  },
}));
jest.mock('../../src/services/preferencesStorage', () => ({
  getPlaybackPositions: jest.fn().mockResolvedValue({}),
}));

const mockBook: Book = {
  id: 'b1',
  title: 'Favorite Book',
  author: 'Author',
  language: 'en',
  type: 'audiobook',
  category: 'Fiction',
};

describe('FavoritesScreen', () => {
  it('renders empty state when no favorites', () => {
    const tree = renderer.create(
      <Provider store={store}>
        <FavoritesScreen />
      </Provider>,
    );
    const json = tree.toJSON();
    expect(json).toBeDefined();
    expect(JSON.stringify(json)).toContain('No favorites yet');
    expect(JSON.stringify(json)).toContain('Tap the heart');
  });

  it('renders FlatList with BookCards when favorites exist', async () => {
    store.dispatch({type: 'books/toggleFavorite', payload: 'b1'});
    await store.dispatch(fetchBooksByIds(['b1']));

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <Provider store={store}>
          <FavoritesScreen />
        </Provider>,
      );
    });

    const json = tree!.toJSON();
    expect(json).toBeDefined();
    expect(JSON.stringify(json)).toContain('Favorite Book');
  });
});
