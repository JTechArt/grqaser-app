jest.mock('react-native-fs');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../src/database/appMetaRepository', () => ({
  appMetaRepository: {
    getTotalDownloadSize: jest.fn().mockResolvedValue(180_000_000),
    getTotalDatabaseSize: jest.fn().mockResolvedValue(52_000_000),
    getDownloadedBookIds: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('../../src/database/catalogRepository', () => ({
  catalogRepository: {},
}));
jest.mock('../../src/services/storageService', () => ({
  storageService: {
    getStorageUsage: jest.fn().mockResolvedValue({
      allocatedBytes: 1_000_000_000,
      usedBytes: 248_000_000,
      percentage: 24.8,
      breakdown: {mp3s: 180_000_000, databases: 52_000_000, other: 16_000_000},
    }),
    getMobileDataUsage: jest.fn().mockResolvedValue({
      totalBytes: 1_200_000_000,
      period: 'This Month',
      breakdown: {
        streaming: 820_000_000,
        downloads: 340_000_000,
        dbUpdates: 40_000_000,
      },
    }),
  },
}));

import React from 'react';
import {Provider} from 'react-redux';
import {PaperProvider} from 'react-native-paper';
import {configureStore} from '@reduxjs/toolkit';
import renderer, {act} from 'react-test-renderer';
import SettingsScreen from '../../src/screens/SettingsScreen';

function createTestStore() {
  return configureStore({
    reducer: {
      user: () => ({preferences: {theme: 'light'}}),
      download: () => ({
        downloadingBooks: {},
        downloadedBookIds: [],
        totalStorageUsed: 0,
        loading: false,
        error: null,
      }),
      books: () => ({books: []}),
      database: () => ({
        managedDatabases: [],
        isDownloading: false,
        downloadProgress: 0,
        error: null,
        loading: false,
      }),
    },
  });
}

function renderScreen() {
  const store = createTestStore();
  return renderer.create(
    <Provider store={store}>
      <PaperProvider>
        <SettingsScreen />
      </PaperProvider>
    </Provider>,
  );
}

function findTextContent(
  tree:
    | renderer.ReactTestRendererJSON
    | renderer.ReactTestRendererJSON[]
    | null,
  search: string,
): boolean {
  if (!tree) {
    return false;
  }
  if (Array.isArray(tree)) {
    return tree.some(t => findTextContent(t, search));
  }
  if (typeof tree === 'string') {
    return tree.includes(search);
  }
  if (tree.children) {
    return tree.children.some((child: unknown) =>
      findTextContent(child as renderer.ReactTestRendererJSON, search),
    );
  }
  return false;
}

describe('SettingsScreen', () => {
  it('renders without crashing', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderScreen();
    });
    expect(tree).toBeTruthy();
  });

  it('contains Storage Usage section header', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderScreen();
    });
    const json = tree!.toJSON();
    expect(findTextContent(json, 'STORAGE USAGE')).toBe(true);
  });

  it('contains Mobile Data Usage section header', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderScreen();
    });
    const json = tree!.toJSON();
    expect(findTextContent(json, 'MOBILE DATA USAGE')).toBe(true);
  });

  it('contains General Settings section header', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderScreen();
    });
    const json = tree!.toJSON();
    expect(findTextContent(json, 'GENERAL SETTINGS')).toBe(true);
  });

  it('renders storage breakdown items', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderScreen();
    });

    // Wait for async state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const json = tree!.toJSON();
    expect(findTextContent(json, 'Downloaded MP3s')).toBe(true);
    expect(findTextContent(json, 'Databases')).toBe(true);
    expect(findTextContent(json, 'App Storage')).toBe(true);
  });

  it('renders mobile data breakdown items', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderScreen();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const json = tree!.toJSON();
    expect(findTextContent(json, 'Streaming')).toBe(true);
    expect(findTextContent(json, 'Downloads')).toBe(true);
    expect(findTextContent(json, 'DB Updates')).toBe(true);
  });

  it('sections appear in correct order', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderScreen();
    });
    const json = tree!.toJSON();
    const fullText = JSON.stringify(json);

    const storageIdx = fullText.indexOf('STORAGE USAGE');
    const dataIdx = fullText.indexOf('MOBILE DATA USAGE');
    const downloadsIdx = fullText.indexOf('Downloads');
    const catalogIdx = fullText.indexOf('CATALOG DATABASES');
    const generalIdx = fullText.indexOf('GENERAL SETTINGS');

    expect(storageIdx).toBeLessThan(dataIdx);
    expect(dataIdx).toBeLessThan(downloadsIdx);
    expect(downloadsIdx).toBeLessThan(catalogIdx);
    expect(catalogIdx).toBeLessThan(generalIdx);
  });
});
