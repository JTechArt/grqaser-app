import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/types';

type CategoryScreenRouteProp = RouteProp<RootStackParamList, 'Category'>;

type Props = {route: CategoryScreenRouteProp};

const CategoryScreen: React.FC<Props> = ({route}) => (
  <View style={styles.container}>
    <Text style={styles.text}>
      {route.params?.category?.name ?? 'Category'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  text: {fontSize: 18},
});

export default CategoryScreen;
