import React from 'react';
import {View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import PlayerScreen from '../screens/PlayerScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import CategoryScreen from '../screens/CategoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MiniPlayer from '../components/MiniPlayer';

// Types
import {RootStackParamList, TabParamList} from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function getTabIconName(routeName: string, focused: boolean): string {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Library':
      return focused ? 'library' : 'library-outline';
    case 'Player':
      return focused ? 'play-circle' : 'play-circle-outline';
    case 'Favorites':
      return focused ? 'heart' : 'heart-outline';
    case 'Profile':
      return focused ? 'account' : 'account-outline';
    default:
      return 'circle';
  }
}

interface TabBarIconProps {
  routeName: string;
  focused: boolean;
  color: string;
  size: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({
  routeName,
  focused,
  color,
  size,
}) => (
  <Icon name={getTabIconName(routeName, focused)} size={size} color={color} />
);

const TabNavigator: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <View style={{flex: 1}}>
      <Tab.Navigator
        screenOptions={({route}) => ({
          // Arrow here is RN's tabBarIcon API; TabBarIcon is stable (no new component type)
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({focused, color, size}) => (
            <TabBarIcon
              routeName={route.name}
              focused={focused}
              color={color}
              size={size}
            />
          ),
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurface,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerShown: false,
        })}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{tabBarLabel: 'Home'}}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{tabBarLabel: 'Library'}}
        />
        <Tab.Screen
          name="Player"
          component={PlayerScreen}
          options={{tabBarLabel: 'Player'}}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{tabBarLabel: 'Favorites'}}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{tabBarLabel: 'Profile'}}
        />
      </Tab.Navigator>
      <MiniPlayer
        onPress={() =>
          (
            navigation as unknown as {
              navigate: (a: string, b?: {screen: string}) => void;
            }
          ).navigate('MainTabs', {screen: 'Player'})
        }
      />
    </View>
  );
};

const RootNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="BookDetail"
        component={BookDetailScreen}
        options={({route}) => ({
          title: route.params?.book?.title || 'Book Details',
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search Books',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Category"
        component={CategoryScreen}
        options={({route}) => ({
          title: route.params?.category?.name || 'Category',
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
