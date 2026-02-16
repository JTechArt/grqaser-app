import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {List} from 'react-native-paper';
import {CompositeNavigationProp, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {RootStackParamList, TabParamList} from '../navigation/types';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  StackNavigationProp<RootStackParamList, 'MainTabs'>
>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <List.Section>
        <List.Item
          title="Settings"
          description="Preferences and app settings"
          // eslint-disable-next-line react/no-unstable-nested-components -- List.Item left render prop
          left={props => <List.Icon {...props} icon="cog" />}
          onPress={() => navigation.navigate('Settings' as never)}
          style={styles.listItem}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, paddingTop: 16},
  title: {
    fontSize: 24,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listItem: {backgroundColor: 'transparent'},
});

export default ProfileScreen;
