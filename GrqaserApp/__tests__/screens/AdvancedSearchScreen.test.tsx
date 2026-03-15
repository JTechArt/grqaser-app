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
import {Button, Searchbar, List, Checkbox} from 'react-native-paper';
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
          authorOptions: [
            {id: 1, name: 'Author A', bookCount: 2},
            {id: 2, name: 'Author B', bookCount: 5},
            {id: 3, name: 'Another Author', bookCount: 1},
          ],
          categoryOptions: [{id: 2, name: 'Fiction', bookCount: 3}],
          filterOptionsLoading: false,
          filterOptionsError: null,
          favorites: ['fav-1'],
          booksById: {
            'fav-1': {
              id: 'fav-1',
              title: 'Favorite Book',
              author: 'Author A',
              language: 'hy',
              type: 'audiobook',
              category: 'Fiction',
            },
          },
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
    mockUseSelector.mockImplementation(selector =>
      selector({
        books: {
          advancedFilters: {
            authorIds: [],
            categoryIds: [],
            durationRange: null,
            text: '',
          },
          advancedResults: [],
          advancedTotalCount: 0,
          advancedLoading: false,
          advancedError: null,
          authorOptions: [],
          categoryOptions: [],
          filterOptionsLoading: false,
          filterOptionsError: null,
          favorites: [],
          booksById: {},
        },
      }),
    );
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

    const accordions = tree!.root.findAllByType(List.Accordion);
    expect(accordions).toHaveLength(2);

    await act(async () => {
      accordions[0].props.onPress();
    });

    const authorOption = tree!.root
      .findAllByType(Checkbox.Item)
      .find(node => node.props.label === 'Author A (2)');
    expect(authorOption).toBeDefined();

    await act(async () => {
      authorOption!.props.onPress();
    });
    expect(mockDispatch).toHaveBeenCalled();

    const searchbars = tree!.root.findAllByType(Searchbar);
    await act(async () => {
      searchbars[0].props.onChangeText('hello');
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

  it('shows featured authors by default and switches to matched authors after 2 letters', async () => {
    let tree: renderer.ReactTestRenderer | null = null;
    await act(async () => {
      tree = renderer.create(
        <PaperProvider theme={theme}>
          <AdvancedSearchScreen />
        </PaperProvider>,
      );
    });

    const accordions = tree!.root.findAllByType(List.Accordion);
    await act(async () => {
      accordions[0].props.onPress();
    });

    let authorOptions = tree!.root
      .findAllByType(Checkbox.Item)
      .map(node => node.props.label);
    expect(authorOptions).toContain('Author A (2)');
    expect(authorOptions).toContain('Author B (5)');

    const searchbars = tree!.root.findAllByType(Searchbar);
    await act(async () => {
      searchbars[1].props.onChangeText('an');
    });

    authorOptions = tree!.root
      .findAllByType(Checkbox.Item)
      .map(node => node.props.label);
    expect(authorOptions).toContain('Another Author (1)');
    expect(authorOptions).not.toContain('Author B (5)');
  });
});
