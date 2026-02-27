import React, {useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, ScrollView} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {StackNavigationProp} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {Button, Chip, Searchbar, ActivityIndicator} from 'react-native-paper';
import {RootState, AppDispatch} from '../state';
import {RootStackParamList} from '../navigation/types';
import {
  advancedSearchBooks,
  fetchAdvancedFilterOptions,
  setAdvancedFilters,
  clearAdvancedSearchError,
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
  } = useSelector((state: RootState) => state.books);

  useEffect(() => {
    dispatch(fetchAdvancedFilterOptions());
  }, [dispatch]);

  useEffect(() => {
    if (
      advancedResults.length === 0 &&
      advancedFilters.text.trim() === '' &&
      advancedFilters.authorIds.length === 0 &&
      advancedFilters.categoryIds.length === 0 &&
      advancedFilters.durationRange == null
    ) {
      dispatch(advancedSearchBooks({page: 1, limit: 100}));
    }
  }, [
    dispatch,
    advancedResults.length,
    advancedFilters.text,
    advancedFilters.authorIds.length,
    advancedFilters.categoryIds.length,
    advancedFilters.durationRange,
  ]);

  const onApplyFilters = () => {
    dispatch(advancedSearchBooks({page: 1, limit: 100}));
  };

  const onBookPress = (book: Book) => {
    navigation.navigate('BookDetail', {book});
  };

  const updateFilters = (payload: Partial<AdvancedSearchFilters>) => {
    dispatch(setAdvancedFilters(payload));
  };

  const renderMultiSelect = (
    title: string,
    selected: number[],
    options: CatalogFilterOption[],
    onToggle: (id: number) => void,
  ) => (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>
        {title} ({selected.length} selected)
      </Text>
      <View style={styles.chipsWrap}>
        {options.map(option => (
          <Chip
            key={option.id}
            mode={selected.includes(option.id) ? 'flat' : 'outlined'}
            selected={selected.includes(option.id)}
            onPress={() => onToggle(option.id)}
            style={styles.chip}>
            {option.name} ({option.bookCount})
          </Chip>
        ))}
      </View>
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

            {renderMultiSelect(
              'Authors',
              advancedFilters.authorIds,
              authorOptions,
              id =>
                updateFilters({
                  authorIds: toggleValue(advancedFilters.authorIds, id),
                }),
            )}

            {renderMultiSelect(
              'Categories',
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
            <Text style={styles.resultCount}>{advancedTotalCount} books found</Text>
          </View>
        }
        ListEmptyComponent={
          advancedLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <Text style={styles.emptyText}>No books matched these filters.</Text>
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
