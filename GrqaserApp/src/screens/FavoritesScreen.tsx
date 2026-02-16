import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const FavoritesScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Favorites</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  text: {fontSize: 18},
});

export default FavoritesScreen;
