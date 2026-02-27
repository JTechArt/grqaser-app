/**
 * FavoritesScreen tests — Story 10.3 layout alignment and regressions.
 */

import React from 'react';
import renderer from 'react-test-renderer';
import {act} from 'react-test-renderer';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {store} from '../../src/state';
import {fetchBooksByIds} from '../../src/state/slices/booksSlice';
import FavoritesScreen from '../../src/screens/FavoritesScreen';

jest.mock('../../src/utils/bookGridLayout', () => ({
  useBookGridLayout: () => ({cardWidth: 150, numColumns: 2}),
  CARD_GAP: 12,
  CARD_MARGIN: 6,
  LIST_PADDING: 8,
  LIST_PADDING_BOTTOM: 24,
  EMPTY_MARGIN_TOP: 24,
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../src/components/LazyCoverImage', () => {
  const Rn = require('react');
  const {View} = require('react-native');
  return function LazyCoverImage() {
    return Rn.createElement(View, {testID: 'lazy-cover'});
  };
});
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
  return {
    Text: 'Text',
    Card: CardWithContent,
    Searchbar: View,
    ActivityIndicator: View,
    Button: View,
  };
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

const initialMetrics = {
  frame: {x: 0, y: 0, width: 320, height: 640},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

const TestWrapper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <Provider store={store}>
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {children}
    </SafeAreaProvider>
  </Provider>
);

describe('FavoritesScreen', () => {
  it('renders empty state when no favorites', () => {
    const tree = renderer.create(
      <TestWrapper>
        <FavoritesScreen />
      </TestWrapper>,
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
        <TestWrapper>
          <FavoritesScreen />
        </TestWrapper>,
      );
    });

    const json = tree!.toJSON();
    expect(json).toBeDefined();
    expect(JSON.stringify(json)).toContain('Favorite Book');
  });
});
