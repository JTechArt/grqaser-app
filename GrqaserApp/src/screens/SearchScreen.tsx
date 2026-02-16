import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {RouteProp, useRoute} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/types';

type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

const SearchScreen: React.FC = () => {
  const route = useRoute<SearchScreenRouteProp>();
  const initialQuery = route.params?.initialQuery ?? '';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Search</Text>
      {initialQuery ? (
        <Text style={styles.hint}>Initial query: {initialQuery}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  text: {fontSize: 18},
  hint: {fontSize: 14, marginTop: 8, color: '#666'},
});

export default SearchScreen;
