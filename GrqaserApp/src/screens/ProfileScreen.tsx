import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {List} from 'react-native-paper';
import {CompositeNavigationProp, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RootStackParamList, TabParamList} from '../navigation/types';
import {theme} from '../theme';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  StackNavigationProp<RootStackParamList, 'MainTabs'>
>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingTop: insets.top + 16}]}>
      <Text style={styles.title}>Profile</Text>
      <List.Section>
        <List.Item
          title="Settings"
          description="Preferences and app settings"
          // eslint-disable-next-line react/no-unstable-nested-components -- List.Item left render prop
          left={props => <List.Icon {...props} icon="cog" />}
          onPress={() => navigation.navigate('Settings')}
          style={styles.listItem}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  title: {
    fontSize: 24,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
    color: theme.colors.text,
  },
  listItem: {backgroundColor: 'transparent'},
});

export default ProfileScreen;
