jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

import React from 'react';
import renderer from 'react-test-renderer';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import networkStatusReducer from '../../src/state/slices/networkStatusSlice';
import ConnectionBanner from '../../src/components/ConnectionBanner';

function createStore(
  overrides: {isConnected?: boolean | null; showRestored?: boolean} = {},
) {
  return configureStore({
    reducer: {
      networkStatus: networkStatusReducer,
    },
    preloadedState: {
      networkStatus: {
        isConnected: overrides.isConnected ?? null,
        showRestored: overrides.showRestored ?? false,
      },
    },
  } as any);
}

describe('ConnectionBanner', () => {
  function findText(
    tree: renderer.ReactTestRendererJSON | null,
    text: string,
  ): boolean {
    if (!tree) {
      return false;
    }
    if (typeof tree === 'string') {
      return tree.includes(text);
    }
    if (tree.children) {
      return tree.children.some((c: unknown) =>
        findText(c as renderer.ReactTestRendererJSON, text),
      );
    }
    return false;
  }

  it('renders nothing when isConnected is null', () => {
    const store = createStore({isConnected: null});
    const tree = renderer.create(
      <Provider store={store}>
        <ConnectionBanner />
      </Provider>,
    );
    const json = tree.toJSON();
    expect(findText(json, 'Network connection failed')).toBe(false);
    expect(findText(json, 'Connection restored')).toBe(false);
    tree.unmount();
  });

  it('renders nothing when online and not showRestored', () => {
    const store = createStore({isConnected: true, showRestored: false});
    const tree = renderer.create(
      <Provider store={store}>
        <ConnectionBanner />
      </Provider>,
    );
    const json = tree.toJSON();
    expect(findText(json, 'Network connection failed')).toBe(false);
    expect(findText(json, 'Connection restored')).toBe(false);
    tree.unmount();
  });

  it('shows offline banner when isConnected is false', () => {
    const store = createStore({isConnected: false});
    const tree = renderer.create(
      <Provider store={store}>
        <ConnectionBanner />
      </Provider>,
    );
    const json = tree.toJSON();
    expect(findText(json, 'Network connection failed')).toBe(true);
    tree.unmount();
  });

  it('shows restored banner when showRestored is true', () => {
    const store = createStore({isConnected: true, showRestored: true});
    const tree = renderer.create(
      <Provider store={store}>
        <ConnectionBanner />
      </Provider>,
    );
    const json = tree.toJSON();
    expect(findText(json, 'Connection restored')).toBe(true);
    tree.unmount(); // cleanup clears the 3s timeout
  });
});
