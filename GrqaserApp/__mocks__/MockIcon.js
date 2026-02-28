const React = require('react');
const {View} = require('react-native');
const MockIcon = props =>
  React.createElement(View, {...props, testID: 'mock-icon'});
module.exports = {default: MockIcon};
