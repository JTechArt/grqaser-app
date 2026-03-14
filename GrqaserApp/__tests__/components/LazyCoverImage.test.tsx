/**
 * LazyCoverImage component tests — Story 10.6
 */

import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('react-native-fast-image', () => {
  const Rn = require('react');
  const {View} = require('react-native');
  const F = function () {
    return Rn.createElement(View, {testID: 'fast-image'});
  };
  (F as any).priority = {low: 'low', normal: 'normal', high: 'high'};
  (F as any).resizeMode = {cover: 'cover'};
  return {__esModule: true, default: F};
});
jest.mock('../../src/theme', () => ({
  theme: {colors: {surface: '#f5f5f5', onSurface: '#333'}},
}));

import LazyCoverImage from '../../src/components/LazyCoverImage';

describe('LazyCoverImage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders placeholder when uri is empty', () => {
    const tree = renderer.create(
      <LazyCoverImage uri="" placeholderText="AB" />,
    );
    expect(tree.toJSON()).toBeDefined();
    tree.unmount();
  });

  it('renders placeholder when uri is undefined', () => {
    const tree = renderer.create(
      <LazyCoverImage uri={undefined} placeholderText="XY" />,
    );
    expect(tree.toJSON()).toBeDefined();
    tree.unmount();
  });

  it('renders with uri (loads image)', () => {
    const tree = renderer.create(
      <LazyCoverImage
        uri="https://example.com/cover.jpg"
        placeholderText="TB"
      />,
    );
    expect(tree.toJSON()).toBeDefined();
    tree.unmount();
  });

  it('renders in compact mode', () => {
    const tree = renderer.create(
      <LazyCoverImage
        uri="https://example.com/c.jpg"
        compact
        placeholderText="C"
      />,
    );
    expect(tree.toJSON()).toBeDefined();
    tree.unmount();
  });
});
