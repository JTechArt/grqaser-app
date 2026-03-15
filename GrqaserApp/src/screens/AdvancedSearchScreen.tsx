import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, FlatList, ScrollView} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {StackNavigationProp} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {
  Button,
  Chip,
  Searchbar,
  ActivityIndicator,
  Checkbox,
  List,
} from 'react-native-paper';
import {RootState, AppDispatch} from '../state';
import {RootStackParamList} from '../navigation/types';
import {
  advancedSearchBooks,
  fetchAdvancedFilterOptions,
  fetchBooksByIds,
  setAdvancedFilters,
  clearAdvancedSearchError,
  ADVANCED_SEARCH_LIMIT,
} from '../state/slices/booksSlice';
import {Book, AdvancedSearchFilters, CatalogFilterOption} from '../types/book';
import BookCard from '../components/BookCard';
import {useBookGridLayout} from '../utils/bookGridLayout';
import {theme} from '../theme';

type AdvancedSearchNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AdvancedSearch'
>;

const DURATION_OPTIONS: {
  label: string;
  value: NonNullable<AdvancedSearchFilters['durationRange']>;
}[] = [
  {label: '<30 min', value: '<30'},
  {label: '<1 hour', value: '30-60'},
  {label: '1-2 hours', value: '60-120'},
  {label: '2-5 hours', value: '120-300'},
  {label: '5+ hours', value: '300+'},
];

function toggleValue(values: number[], value: number): number[] {
  return values.includes(value)
    ? values.filter(v => v !== value)
    : [...values, value];
}

const AdvancedSearchScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<AdvancedSearchNavigationProp>();
  const {cardWidth, numColumns} = useBookGridLayout();
  const [authorQuery, setAuthorQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<
    'authors' | 'categories' | null
  >(null);
  const {
    advancedFilters,
    advancedResults,
    advancedTotalCount,
    advancedLoading,
    advancedError,
    authorOptions,
    categoryOptions,
    filterOptionsLoading,
    filterOptionsError,
    favorites,
    booksById,
  } = useSelector((state: RootState) => state.books);

  useEffect(() => {
    if (
      !filterOptionsLoading &&
      authorOptions.length === 0 &&
      categoryOptions.length === 0
    ) {
      dispatch(fetchAdvancedFilterOptions());
    }
  }, [
    dispatch,
    filterOptionsLoading,
    authorOptions.length,
    categoryOptions.length,
  ]);

  useEffect(() => {
    if (
      advancedResults.length === 0 &&
      advancedFilters.text.trim() === '' &&
      advancedFilters.authorIds.length === 0 &&
      advancedFilters.categoryIds.length === 0 &&
      advancedFilters.durationRange == null
    ) {
      dispatch(advancedSearchBooks({page: 1, limit: ADVANCED_SEARCH_LIMIT}));
    }
  }, [
    dispatch,
    advancedResults.length,
    advancedFilters.text,
    advancedFilters.authorIds.length,
    advancedFilters.categoryIds.length,
    advancedFilters.durationRange,
  ]);

  useEffect(() => {
    if (favorites.length === 0) {
      return;
    }

    const missingFavoriteIds = favorites.filter(id => booksById[id] == null);
    if (missingFavoriteIds.length > 0) {
      dispatch(fetchBooksByIds(missingFavoriteIds));
    }
  }, [dispatch, favorites, booksById]);

  const onApplyFilters = () => {
    dispatch(advancedSearchBooks({page: 1, limit: ADVANCED_SEARCH_LIMIT}));
  };

  const onBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const updateFilters = (payload: Partial<AdvancedSearchFilters>) => {
    dispatch(setAdvancedFilters(payload));
  };

  const getSelectedSummary = (
    selected: number[],
    options: CatalogFilterOption[],
  ) => {
    if (selected.length === 0) {
      return 'All';
    }

    const selectedNames = options
      .filter(option => selected.includes(option.id))
      .map(option => option.name);

    if (selectedNames.length === 0) {
      return `${selected.length} selected`;
    }

    if (selectedNames.length <= 2) {
      return selectedNames.join(', ');
    }

    return `${selectedNames.slice(0, 2).join(', ')} +${selectedNames.length - 2}`;
  };

  const featuredAuthorOptions = useMemo(() => {
    const optionsByName = new Map(authorOptions.map(option => [option.name, option]));
    const usedNames = new Set<string>();
    const featured: CatalogFilterOption[] = [];

    favorites.forEach(bookId => {
      const favoriteBook = booksById[bookId];
      const authorName = favoriteBook?.author?.trim();
      if (!authorName || usedNames.has(authorName)) {
        return;
      }
      const option = optionsByName.get(authorName);
      if (option) {
        featured.push(option);
        usedNames.add(authorName);
      }
    });

    if (featured.length < 10) {
      authorOptions
        .slice()
        .sort((a, b) =>
          b.bookCount !== a.bookCount
            ? b.bookCount - a.bookCount
            : a.name.localeCompare(b.name),
        )
        .forEach(option => {
          if (featured.length >= 10 || usedNames.has(option.name)) {
            return;
          }
          featured.push(option);
          usedNames.add(option.name);
        });
    }

    return featured.slice(0, 10);
  }, [authorOptions, favorites, booksById]);

  const matchedAuthorOptions = useMemo(() => {
    const query = authorQuery.trim().toLowerCase();
    if (query.length < 2) {
      return featuredAuthorOptions;
    }

    return authorOptions
      .filter(option => option.name.toLowerCase().includes(query))
      .sort((a, b) =>
        b.bookCount !== a.bookCount
          ? b.bookCount - a.bookCount
          : a.name.localeCompare(b.name),
      )
      .slice(0, 20);
  }, [authorOptions, authorQuery, featuredAuthorOptions]);

  const renderAuthorSelect = () => (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>Authors</Text>
      <List.Accordion
        title={`${advancedFilters.authorIds.length} selected`}
        description={getSelectedSummary(
          advancedFilters.authorIds,
          authorOptions,
        )}
        expanded={expandedSection === 'authors'}
        onPress={() =>
          setExpandedSection(current => (current === 'authors' ? null : 'authors'))
        }
        style={styles.multiSelectBox}
        titleStyle={styles.multiSelectTitle}
        descriptionStyle={styles.multiSelectDescription}>
        <View style={styles.authorSearchArea}>
          <Searchbar
            placeholder="Type 2+ letters to search authors"
            value={authorQuery}
            onChangeText={setAuthorQuery}
            style={styles.authorSearchBar}
          />
          <Text style={styles.helperText}>
            {authorQuery.trim().length >= 2
              ? 'Showing matching authors'
              : 'Showing up to 10 authors from favorites, then top authors'}
          </Text>
        </View>
        {matchedAuthorOptions.map(option => {
          const isSelected = advancedFilters.authorIds.includes(option.id);
          return (
            <Checkbox.Item
              key={option.id}
              label={`${option.name} (${option.bookCount})`}
              status={isSelected ? 'checked' : 'unchecked'}
              onPress={() =>
                updateFilters({
                  authorIds: toggleValue(advancedFilters.authorIds, option.id),
                })
              }
              style={styles.multiSelectOption}
              labelStyle={styles.multiSelectOptionLabel}
            />
          );
        })}
        {matchedAuthorOptions.length === 0 ? (
          <Text style={styles.emptyOptionText}>No authors match your search.</Text>
        ) : null}
      </List.Accordion>
    </View>
  );

  const renderMultiSelect = (
    title: string,
    section: 'authors' | 'categories',
    selected: number[],
    options: CatalogFilterOption[],
    onToggle: (id: number) => void,
  ) => (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{title}</Text>
      <List.Accordion
        title={`${selected.length} selected`}
        description={getSelectedSummary(selected, options)}
        expanded={expandedSection === section}
        onPress={() =>
          setExpandedSection(current => (current === section ? null : section))
        }
        style={styles.multiSelectBox}
        titleStyle={styles.multiSelectTitle}
        descriptionStyle={styles.multiSelectDescription}>
        {options.map(option => {
          const isSelected = selected.includes(option.id);
          return (
            <Checkbox.Item
              key={option.id}
              label={`${option.name} (${option.bookCount})`}
              status={isSelected ? 'checked' : 'unchecked'}
              onPress={() => onToggle(option.id)}
              style={styles.multiSelectOption}
              labelStyle={styles.multiSelectOptionLabel}
            />
          );
        })}
      </List.Accordion>
    </View>
  );

  const renderBook = ({item}: {item: Book}) => (
    <View style={[styles.cardWrapper, {width: cardWidth}]}>
      <BookCard book={item} onPress={() => onBookPress(item)} compact />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={advancedResults}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderBook}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={styles.resultsContent}
        ListHeaderComponent={
          <View style={styles.filtersPanel}>
            <Searchbar
              placeholder="Search title, description, author..."
              value={advancedFilters.text}
              onChangeText={text => updateFilters({text})}
              onSubmitEditing={onApplyFilters}
              style={styles.searchBar}
            />

            {renderAuthorSelect()}

            {renderMultiSelect(
              'Categories',
              'categories',
              advancedFilters.categoryIds,
              categoryOptions,
              id =>
                updateFilters({
                  categoryIds: toggleValue(advancedFilters.categoryIds, id),
                }),
            )}

            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Duration</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.durationWrap}>
                {DURATION_OPTIONS.map(option => (
                  <Chip
                    key={option.value}
                    mode={
                      advancedFilters.durationRange === option.value
                        ? 'flat'
                        : 'outlined'
                    }
                    selected={advancedFilters.durationRange === option.value}
                    onPress={() =>
                      updateFilters({
                        durationRange:
                          advancedFilters.durationRange === option.value
                            ? null
                            : option.value,
                      })
                    }
                    style={styles.chip}>
                    {option.label}
                  </Chip>
                ))}
              </ScrollView>
            </View>

            <Button
              mode="contained"
              icon="filter-check"
              onPress={onApplyFilters}
              style={styles.applyButton}>
              Apply Filters
            </Button>

            {filterOptionsLoading ? (
              <ActivityIndicator style={styles.loader} />
            ) : null}
            {filterOptionsError ? (
              <Text style={styles.errorText}>{filterOptionsError}</Text>
            ) : null}
            {advancedError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{advancedError}</Text>
                <Button onPress={() => dispatch(clearAdvancedSearchError())}>
                  Dismiss
                </Button>
              </View>
            ) : null}
            <Text style={styles.resultCount}>
              {advancedTotalCount} books found
            </Text>
          </View>
        }
        ListEmptyComponent={
          advancedLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <Text style={styles.emptyText}>
              No books matched these filters.
            </Text>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filtersPanel: {
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  searchBar: {
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
  },
  filterBlock: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  authorSearchArea: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  authorSearchBar: {
    backgroundColor: '#eef2f7',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.secondary,
  },
  multiSelectBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  multiSelectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  multiSelectDescription: {
    color: theme.colors.secondary,
  },
  multiSelectOption: {
    paddingHorizontal: 8,
  },
  multiSelectOptionLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  emptyOptionText: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    color: theme.colors.secondary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  durationWrap: {
    paddingRight: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  applyButton: {
    marginTop: 4,
    marginBottom: 10,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  resultsContent: {
    padding: 8,
    paddingBottom: 24,
  },
  cardWrapper: {
    margin: 6,
  },
  loader: {
    marginVertical: 12,
  },
  errorBox: {
    alignItems: 'center',
    marginBottom: 10,
  },
  errorText: {
    color: '#b00020',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    color: theme.colors.onSurface,
  },
});

export default AdvancedSearchScreen;
