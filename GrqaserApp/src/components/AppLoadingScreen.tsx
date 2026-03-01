import React from 'react';
import {StyleSheet, View} from 'react-native';
import {ActivityIndicator, Button, Text} from 'react-native-paper';
import {theme} from '../theme';

type AppLoadingScreenProps = {
  error?: string | null;
  onRetry?: () => void;
};

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  error,
  onRetry,
}) => {
  const hasError = !!error;

  return (
    <View style={styles.container}>
      {hasError ? (
        <>
          <Text style={styles.errorTitle} testID="catalog-error-title">
            Failed to load catalog.
          </Text>
          <Text style={styles.errorBody}>
            Please check your connection and try again.
          </Text>
          {onRetry ? (
            <Button
              mode="contained"
              onPress={onRetry}
              style={styles.retryButton}
              testID="catalog-retry-button">
              Retry
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText} testID="catalog-loading-text">
            Loading catalog...
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.onSurface,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.error,
    textAlign: 'center',
  },
  errorBody: {
    marginTop: 8,
    textAlign: 'center',
    color: theme.colors.onSurface,
  },
  retryButton: {
    marginTop: 14,
  },
});

export default AppLoadingScreen;
