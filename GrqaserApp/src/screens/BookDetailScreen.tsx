import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/types';

type BookDetailScreenRouteProp = RouteProp<RootStackParamList, 'BookDetail'>;

type Props = {route: BookDetailScreenRouteProp};

const BookDetailScreen: React.FC<Props> = ({route}) => (
  <View style={styles.container}>
    <Text style={styles.text}>
      {route.params?.book?.title ?? 'Book Details'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  text: {fontSize: 18},
});

export default BookDetailScreen;
