import React, {useEffect, useRef} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {store} from './src/state';
import type {RootState} from './src/state';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
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

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const themeMode = useSelector((s: RootState) => s.user.preferences.theme);
  const favorites = useSelector((s: RootState) => s.books.favorites);
  const prevFavoritesRef = useRef<string[]>([]);
  const prevThemeRef = useRef(themeMode);

  useEffect(() => {
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
    <PaperProvider theme={appTheme}>
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
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;
