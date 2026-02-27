jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn()}),
}));

const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

jest.mock('../../src/components/BookCard', () => 'BookCard');

import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Chip, Button, Searchbar} from 'react-native-paper';
import {PaperProvider} from 'react-native-paper';
import AdvancedSearchScreen from '../../src/screens/AdvancedSearchScreen';
import {theme} from '../../src/theme';

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

describe('AdvancedSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(selector =>
      selector({
        books: {
          advancedFilters: {
            authorIds: [1],
            categoryIds: [],
            durationRange: null,
            text: '',
          },
          advancedResults: [],
          advancedTotalCount: 0,
          advancedLoading: false,
          advancedError: null,
          authorOptions: [{id: 1, name: 'Author A', bookCount: 2}],
          categoryOptions: [{id: 2, name: 'Fiction', bookCount: 3}],
          filterOptionsLoading: false,
          filterOptionsError: null,
        },
      }),
    );
  });

  it('renders advanced search controls', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderer.create(
        <PaperProvider theme={theme}>
          <AdvancedSearchScreen />
        </PaperProvider>,
      );
    });
    const json = tree!.toJSON();
    expect(findTextContent(json, 'Apply Filters')).toBe(true);
    expect(findTextContent(json, 'Authors')).toBe(true);
    expect(findTextContent(json, 'Categories')).toBe(true);
    expect(findTextContent(json, 'Duration')).toBe(true);
  });

  it('dispatches filter option loading on mount', async () => {
    await act(async () => {
      renderer.create(
        <PaperProvider theme={theme}>
          <AdvancedSearchScreen />
        </PaperProvider>,
      );
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('supports multi-select toggle and apply action', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderer.create(
        <PaperProvider theme={theme}>
          <AdvancedSearchScreen />
        </PaperProvider>,
      );
    });
    mockDispatch.mockClear();

    const authorChip = tree!.root
      .findAllByType(Chip)
      .find(node => String(node.props.children).includes('Author A'));
    expect(authorChip).toBeDefined();

    await act(async () => {
      authorChip!.props.onPress();
    });
    expect(mockDispatch).toHaveBeenCalled();

    const searchbar = tree!.root.findByType(Searchbar);
    await act(async () => {
      searchbar.props.onChangeText('hello');
    });
    expect(mockDispatch).toHaveBeenCalled();

    const applyButton = tree!.root
      .findAllByType(Button)
      .find(node => String(node.props.children).includes('Apply Filters'));
    expect(applyButton).toBeDefined();

    await act(async () => {
      applyButton!.props.onPress();
    });
    expect(mockDispatch).toHaveBeenCalled();
  });
});
