/**
 * @format
 */

import 'react-native';
import React from 'react';
import renderer, {act} from 'react-test-renderer';

const mockDispatch = jest.fn();
const mockInitializeDatabases = jest.fn(() => ({type: 'database/initialize'}));
const baseState = {
  user: {preferences: {theme: 'light'}},
  books: {favorites: []},
  networkStatus: {isConnected: true, showRestored: false},
};

jest.mock('react-redux', () => {
  const ReactMod = require('react');
  return {
    Provider: ({children}: {children: React.ReactNode}) =>
      ReactMod.createElement(ReactMod.Fragment, null, children),
    useDispatch: () => mockDispatch,
    useSelector: (selector: (state: unknown) => unknown) => selector(baseState),
  };
});

// Mock native/ESM deps so App loads in Jest without native binary or ESM transform
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const ReactMod = require('react');
  const {View} = require('react-native');
  const Icon = (props: unknown) => ReactMod.createElement(View, props);
  (Icon as any).loadFont = jest.fn().mockResolvedValue(undefined);
  return Icon;
});

jest.mock('../src/navigation/RootNavigator', () => {
  const ReactMod = require('react');
  const {View} = require('react-native');
  return function MockRootNavigator() {
    return ReactMod.createElement(View, {testID: 'root-navigator'});
  };
});

jest.mock('../src/components/TrackPlayerProvider', () => {
  const ReactMod = require('react');
  const {View} = require('react-native');
  return function MockTrackPlayerProvider({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    return ReactMod.createElement(View, null, children);
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('../src/services/preferencesStorage', () => ({
  getFavorites: jest.fn(() => new Promise(() => {})),
  setFavoritesStorage: jest.fn().mockResolvedValue(undefined),
  getThemePreference: jest.fn(() => new Promise(() => {})),
  setThemePreference: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/state/slices/databaseSlice', () => ({
  initializeDatabases: () => mockInitializeDatabases(),
}));

import {AppContent} from '../App';

beforeEach(() => {
  mockDispatch.mockClear();
  mockInitializeDatabases.mockClear();
});

it('dispatches initializeDatabases on mount', async () => {
  await act(async () => {
    renderer.create(<AppContent />);
  });

  expect(mockInitializeDatabases).toHaveBeenCalledTimes(1);
  expect(mockDispatch).toHaveBeenCalledWith({type: 'database/initialize'});
});
