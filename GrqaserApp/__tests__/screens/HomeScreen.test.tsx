import React from 'react';
import renderer, {act} from 'react-test-renderer';
import HomeScreen from '../../src/screens/HomeScreen';

const mockDispatch = jest.fn(() => Promise.resolve({}));
const mockNavigate = jest.fn();

const mockFetchBooksPage = jest.fn(payload => ({
  type: 'books/fetchBooksPage',
  payload,
}));
const mockFetchCatalogStats = jest.fn(() => ({
  type: 'books/fetchCatalogStats',
}));
const mockFetchBooksByIds = jest.fn((ids: string[]) => ({
  type: 'books/fetchBooksByIds',
  payload: ids,
}));
const mockSetSearchQuery = jest.fn((query: string) => ({
  type: 'books/setSearchQuery',
  payload: query,
}));
const mockClearError = jest.fn(() => ({type: 'books/clearError'}));
const mockInitializeDatabases = jest.fn(() => ({
  type: 'database/initialize',
}));
const mockSetDatabaseError = jest.fn((value: string | null) => ({
  type: 'database/setError',
  payload: value,
}));

let mockState: any;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector(mockState),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('../../src/theme', () => ({
  theme: {
    colors: {
      primary: '#0d9488',
      surface: '#ffffff',
      background: '#f8fafc',
      text: '#0f172a',
      onSurface: '#64748b',
      accentLight: '#ccfbf1',
      error: '#dc2626',
    },
  },
}));

jest.mock('../../src/state/slices/booksSlice', () => ({
  fetchBooksPage: (payload: unknown) => mockFetchBooksPage(payload),
  fetchCatalogStats: () => mockFetchCatalogStats(),
  fetchBooksByIds: (ids: string[]) => mockFetchBooksByIds(ids),
  setSearchQuery: (query: string) => mockSetSearchQuery(query),
  clearError: () => mockClearError(),
}));

jest.mock('../../src/state/slices/databaseSlice', () => ({
  initializeDatabases: () => mockInitializeDatabases(),
  setError: (value: string | null) => mockSetDatabaseError(value),
}));

jest.mock('../../src/components/BookCard', () => 'BookCard');

jest.mock('react-native-paper', () => {
  const ReactMod = require('react');
  const {Text, View, TouchableOpacity, TextInput} = require('react-native');

  const Button = ({
    children,
    onPress,
    testID,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    testID?: string;
  }) =>
    ReactMod.createElement(
      TouchableOpacity,
      {onPress, testID},
      ReactMod.createElement(Text, null, children),
    );

  return {
    Text,
    Searchbar: ({value, onChangeText}: any) =>
      ReactMod.createElement(TextInput, {value, onChangeText}),
    ActivityIndicator: () => ReactMod.createElement(View, null),
    Banner: ({children}: {children: React.ReactNode}) =>
      ReactMod.createElement(View, null, children),
    Button,
  };
});

beforeEach(() => {
  mockDispatch.mockClear();
  mockNavigate.mockClear();
  mockFetchBooksPage.mockClear();
  mockFetchCatalogStats.mockClear();
  mockFetchBooksByIds.mockClear();
  mockSetSearchQuery.mockClear();
  mockClearError.mockClear();
  mockInitializeDatabases.mockClear();
  mockSetDatabaseError.mockClear();

  mockState = {
    books: {
      booksById: {},
      filteredBooks: [],
      loading: false,
      error: null,
      searchQuery: '',
      catalogStats: null,
      recentlyPlayed: [],
      favorites: [],
    },
    database: {
      initialized: false,
      error: null,
    },
  };
});

describe('HomeScreen startup initialization flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading UI and does not fetch books before db initialization', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    expect(
      tree!.root.findByProps({testID: 'catalog-loading-text'}),
    ).toBeTruthy();
    expect(mockFetchBooksPage).not.toHaveBeenCalled();
    expect(mockFetchCatalogStats).not.toHaveBeenCalled();
    tree.unmount();
  });

  it('fetches books and stats when db is initialized', () => {
    mockState.database.initialized = true;
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    expect(mockFetchBooksPage).toHaveBeenCalledWith({limit: 20, offset: 0});
    expect(mockFetchCatalogStats).toHaveBeenCalledTimes(1);
    tree.unmount();
  });

  it('renders db error state with retry action', () => {
    mockState.database.error = 'init failed';

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    expect(
      tree!.root.findByProps({testID: 'catalog-error-title'}),
    ).toBeTruthy();

    const retryButton = tree!.root.findByProps({
      testID: 'catalog-retry-button',
    });
    act(() => {
      retryButton.props.onPress();
    });

    expect(mockSetDatabaseError).toHaveBeenCalledWith(null);
    expect(mockInitializeDatabases).toHaveBeenCalledTimes(1);
    tree.unmount();
  });
});
