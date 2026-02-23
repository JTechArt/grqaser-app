/**
 * Connection status banner. Shows "Network connection failed" when offline
 * and "Connection restored" briefly when back online (AC: 3, 4).
 */
import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {RootState} from '../state';
import {dismissRestored} from '../state/slices/networkStatusSlice';
import {theme} from '../theme';

const RESTORED_DISMISS_MS = 3000;

const ConnectionBanner: React.FC = () => {
  const dispatch = useDispatch();
  const isConnected = useSelector(
    (s: RootState) => s.networkStatus.isConnected,
  );
  const showRestored = useSelector(
    (s: RootState) => s.networkStatus.showRestored,
  );

  useEffect(() => {
    if (!showRestored) {
      return;
    }
    const t = setTimeout(
      () => dispatch(dismissRestored()),
      RESTORED_DISMISS_MS,
    );
    return () => clearTimeout(t);
  }, [showRestored, dispatch]);

  // Don't show anything while state is unknown or when online (unless showing restored)
  if (isConnected === null) {
    return null;
  }
  if (isConnected && !showRestored) {
    return null;
  }

  if (showRestored) {
    return (
      <View style={[styles.banner, styles.bannerRestored]}>
        <Icon name="wifi-check" size={20} color="#ffffff" />
        <Text style={styles.text}>Connection restored</Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, styles.bannerOffline]}>
      <Icon name="wifi-off" size={20} color="#ffffff" />
      <Text style={styles.text}>Network connection failed</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  bannerOffline: {
    backgroundColor: theme.colors.error,
  },
  bannerRestored: {
    backgroundColor: theme.colors.success,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ConnectionBanner;
