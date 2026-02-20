import React, {useEffect, useMemo} from 'react';
import {View, StyleSheet, Alert, TextStyle} from 'react-native';
import {List, RadioButton, Button, Text, useTheme} from 'react-native-paper';
import {useSelector, useDispatch} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {RootState, AppDispatch} from '../state';
import {updatePreferences} from '../state/slices/userSlice';
import {setThemePreference} from '../services/preferencesStorage';
import {
  cleanupBook,
  cleanupAll,
  loadDownloadState,
} from '../state/slices/downloadSlice';
import type {ThemeMode} from '../theme';
import {theme as appTheme} from '../theme';

const THEME_OPTIONS: {value: ThemeMode; label: string}[] = [
  {value: 'light', label: 'Light'},
  {value: 'dark', label: 'Dark'},
  {value: 'auto', label: 'System (auto)'},
];

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const themeMode = useSelector((s: RootState) => s.user.preferences.theme);
  const downloadedBookIds = useSelector(
    (s: RootState) => s.download.downloadedBookIds,
  );
  const totalStorageUsed = useSelector(
    (s: RootState) => s.download.totalStorageUsed,
  );
  const books = useSelector((s: RootState) => s.books.books);

  useEffect(() => {
    dispatch(loadDownloadState());
  }, [dispatch]);

  const downloadedBooks = useMemo(
    () => books.filter(b => downloadedBookIds.includes(b.id)),
    [books, downloadedBookIds],
  );

  const handleThemeChange = (value: ThemeMode) => {
    dispatch(updatePreferences({theme: value}));
    setThemePreference(value).catch(() => {});
  };

  const handleCleanBook = (bookId: string, title: string) => {
    Alert.alert(
      'Remove Downloads',
      `Remove all downloaded MP3s for "${title}"? Playback will fall back to streaming.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch(cleanupBook(bookId)),
        },
      ],
    );
  };

  const handleCleanAll = () => {
    Alert.alert(
      'Remove All Downloads',
      'Remove all downloaded MP3 files? Playback will fall back to streaming when online.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: () => dispatch(cleanupAll()),
        },
      ],
    );
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Downloads Section */}
      <List.Section>
        <List.Subheader>Downloads</List.Subheader>
        {downloadedBooks.length === 0 ? (
          <View style={styles.emptyDownloads}>
            <Text style={styles.hintText}>No downloaded MP3s</Text>
          </View>
        ) : (
          <>
            {downloadedBooks.map(book => (
              <View key={book.id} style={styles.downloadItem}>
                <View style={styles.downloadInfo}>
                  <Text style={styles.downloadTitle} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <Text style={styles.downloadSize}>{book.author}</Text>
                </View>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => handleCleanBook(book.id, book.title)}
                  textColor={appTheme.colors.error}
                  style={styles.cleanBtn}>
                  Clean
                </Button>
              </View>
            ))}
            <View style={styles.storageRow}>
              <Icon
                name="harddisk"
                size={16}
                color={appTheme.colors.onSurface}
              />
              <Text style={styles.storageText}>
                Total: {formatBytes(totalStorageUsed)}
              </Text>
            </View>
            <Button
              mode="outlined"
              onPress={handleCleanAll}
              textColor={appTheme.colors.error}
              style={styles.cleanAllBtn}
              icon="delete-outline">
              Clean All Downloads
            </Button>
          </>
        )}
        <Text style={styles.hintText}>
          Remove downloaded MP3s to free storage. Playback falls back to
          streaming when online.
        </Text>
      </List.Section>

      {/* Appearance Section */}
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <RadioButton.Group
          onValueChange={v => handleThemeChange(v as ThemeMode)}
          value={themeMode}>
          {THEME_OPTIONS.map(opt => (
            <RadioButton.Item
              key={opt.value}
              label={opt.label}
              value={opt.value}
              color={theme.colors.primary}
            />
          ))}
        </RadioButton.Group>
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  emptyDownloads: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  downloadInfo: {
    flex: 1,
    marginRight: 12,
  },
  downloadTitle: {
    ...appTheme.typography.body1,
    color: appTheme.colors.text,
    fontWeight: '600',
  } as TextStyle,
  downloadSize: {
    ...appTheme.typography.caption,
    color: appTheme.colors.onSurface,
  } as TextStyle,
  cleanBtn: {
    borderColor: appTheme.colors.error,
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  storageText: {
    ...appTheme.typography.caption,
    color: appTheme.colors.onSurface,
  } as TextStyle,
  cleanAllBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    borderColor: appTheme.colors.error,
  },
  hintText: {
    ...appTheme.typography.caption,
    color: appTheme.colors.onSurface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  } as TextStyle,
});

export default SettingsScreen;
