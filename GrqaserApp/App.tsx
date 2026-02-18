import React, {useEffect, useRef} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {store} from './src/state';
import type {RootState} from './src/state';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {getAppTheme} from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';
import TrackPlayerProvider from './src/components/TrackPlayerProvider';
import {setFavorites} from './src/state/slices/booksSlice';
import {updatePreferences} from './src/state/slices/userSlice';
import {
  getFavorites,
  setFavoritesStorage,
  getThemePreference,
  setThemePreference,
} from './src/services/preferencesStorage';

LogBox.ignoreLogs(['Required dispatch_sync to load constants']);

const ROOT_STYLE = {flex: 1} as const;

type PaperIconProps = {
  name: unknown;
  color?: string;
  size: number;
  direction: 'rtl' | 'ltr';
  testID?: string;
};

const renderPaperIcon = ({
  name,
  color,
  size,
  direction,
  testID,
}: PaperIconProps) => (
  <MaterialCommunityIcons
    allowFontScaling={false}
    name={
      typeof name === 'string' && name.trim().length > 0
        ? name
        : 'help-circle-outline'
    }
    color={color}
    size={size}
    testID={testID}
    style={{
      transform: [{scaleX: direction === 'rtl' ? -1 : 1}],
      lineHeight: size,
    }}
  />
);

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const themeMode = useSelector((s: RootState) => s.user.preferences.theme);
  const favorites = useSelector((s: RootState) => s.books.favorites);
  const prevFavoritesRef = useRef<string[]>([]);
  const prevThemeRef = useRef(themeMode);

  useEffect(() => {
    if (typeof MaterialCommunityIcons.loadFont === 'function') {
      MaterialCommunityIcons.loadFont().catch(() => {});
    }
    getFavorites().then(ids => dispatch(setFavorites(ids)));
    getThemePreference().then(mode =>
      dispatch(updatePreferences({theme: mode})),
    );
  }, [dispatch]);

  useEffect(() => {
    if (favorites !== prevFavoritesRef.current) {
      prevFavoritesRef.current = favorites;
      setFavoritesStorage(favorites).catch(() => {});
    }
  }, [favorites]);

  useEffect(() => {
    if (prevThemeRef.current !== themeMode) {
      prevThemeRef.current = themeMode;
      setThemePreference(themeMode).catch(() => {});
    }
  }, [themeMode]);

  const appTheme = getAppTheme(themeMode);
  const isDark = themeMode === 'dark';

  return (
    <PaperProvider
      theme={appTheme}
      settings={{
        icon: renderPaperIcon,
      }}>
      <NavigationContainer>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={appTheme.colors.primary}
        />
        <TrackPlayerProvider>
          <RootNavigator />
        </TrackPlayerProvider>
      </NavigationContainer>
    </PaperProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={ROOT_STYLE}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;
