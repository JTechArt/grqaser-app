/**
 * @format
 */

import 'react-native';
import React from 'react';

// Mock native/ESM deps so App loads in Jest without native binary or ESM transform
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const {View} = require('react-native');
  const Icon = (props: unknown) => React.createElement(View, props);
  (Icon as any).loadFont = jest.fn().mockResolvedValue(undefined);
  return Icon;
});

jest.mock('../src/navigation/RootNavigator', () => {
  const React = require('react');
  const {View} = require('react-native');
  return function MockRootNavigator() {
    return React.createElement(View, {testID: 'root-navigator'});
  };
});

jest.mock('../src/components/TrackPlayerProvider', () => {
  const React = require('react');
  const {View} = require('react-native');
  return function MockTrackPlayerProvider({children}: {children?: React.ReactNode}) {
    return React.createElement(View, null, children);
  };
});

import App from '../App';

// Note: import explicitly to use the types shiped with jest.
import {it} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<App />);
});
