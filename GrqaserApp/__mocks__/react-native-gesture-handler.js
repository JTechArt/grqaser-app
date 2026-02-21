/**
 * Mock for react-native-gesture-handler so App.test.tsx can run in Jest
 * without native TurboModule (RNGestureHandlerModule).
 */
const React = require('react');
const {View} = require('react-native');

const GestureHandlerRootView = props => React.createElement(View, props);
GestureHandlerRootView.displayName = 'GestureHandlerRootView';

module.exports = {
  GestureHandlerRootView,
  default: {
    GestureHandlerRootView,
  },
};
