import React, {useEffect, useRef} from 'react';
import {AppState, StatusBar, LogBox, View, StyleSheet} from 'react-native';
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
import ConnectionBanner from './src/components/ConnectionBanner';
import {startNetworkMonitor} from './src/services/networkMonitor';
import {setFavorites} from './src/state/slices/booksSlice';
import {updatePreferences} from './src/state/slices/userSlice';
import {initializeDatabases} from './src/state/slices/databaseSlice';
import {
  getFavorites,
  setFavoritesStorage,
  getThemePreference,
  setThemePreference,
} from './src/services/preferencesStorage';
import {clearCoverImageMemoryCache} from './src/services/imageCacheService';

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

const styles = StyleSheet.create({
  appWrap: {flex: 1},
  content: {flex: 1},
});

export const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const themeMode = useSelector((s: RootState) => s.user.preferences.theme);
  const favorites = useSelector((s: RootState) => s.books.favorites);
  const prevFavoritesRef = useRef<string[]>([]);
  const prevThemeRef = useRef(themeMode);

  useEffect(() => {
    const stop = startNetworkMonitor();
    return stop;
  }, []);

  useEffect(() => {
    // Fire-and-forget DB initialization so first UI render is never blocked.
    dispatch(initializeDatabases());
  }, [dispatch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        clearCoverImageMemoryCache();
      }
    });
    return () => sub.remove();
  }, []);

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
        <View style={styles.appWrap}>
          <ConnectionBanner />
          <View style={styles.content}>
            <TrackPlayerProvider>
              <RootNavigator />
            </TrackPlayerProvider>
          </View>
        </View>
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
