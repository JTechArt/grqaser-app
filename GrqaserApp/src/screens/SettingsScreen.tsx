import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TextStyle,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  List,
  RadioButton,
  Button,
  Text,
  useTheme,
  ActivityIndicator,
  ProgressBar,
} from 'react-native-paper';
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
import {
  fetchManagedDatabases,
  loadNewDatabase,
  refreshDb,
  switchActiveDb,
  removeDb,
} from '../state/slices/databaseSlice';
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

function formatDate(iso: string | undefined): string {
  if (!iso) {
    return '';
  }
  try {
    const d = new Date(iso);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `Downloaded ${
      months[d.getMonth()]
    } ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return '';
  }
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

  const managedDatabases = useSelector(
    (s: RootState) => s.database.managedDatabases,
  );
  const isDownloading = useSelector((s: RootState) => s.database.isDownloading);
  const downloadProgress = useSelector(
    (s: RootState) => s.database.downloadProgress,
  );
  const dbError = useSelector((s: RootState) => s.database.error);
  const dbLoading = useSelector((s: RootState) => s.database.loading);

  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    dispatch(loadDownloadState());
    dispatch(fetchManagedDatabases());
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

  const handleLoadFromUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert(
        'Invalid URL',
        'Only http:// and https:// URLs are supported.',
      );
      return;
    }
    setUrlModalVisible(false);
    setUrlInput('');
    dispatch(loadNewDatabase(trimmed));
  }, [urlInput, dispatch]);

  const handleRefresh = useCallback(
    (dbId: string) => {
      dispatch(refreshDb(dbId));
    },
    [dispatch],
  );

  const handleSetActive = useCallback(
    (dbId: string) => {
      dispatch(switchActiveDb(dbId));
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (dbId: string, name: string) => {
      Alert.alert(
        'Remove Database',
        `Remove "${name}"? The database file will be deleted from this device.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => dispatch(removeDb(dbId)),
          },
        ],
      );
    },
    [dispatch],
  );

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Catalog Databases Section */}
      <List.Section>
        <List.Subheader>CATALOG DATABASES</List.Subheader>

        {managedDatabases.length === 0 && !dbLoading ? (
          <View style={styles.emptyDownloads}>
            <Text style={styles.hintText}>No catalog databases loaded</Text>
          </View>
        ) : (
          managedDatabases.map(db => (
            <View
              key={db.id}
              style={[styles.dbItem, db.isActive && styles.dbItemActive]}>
              <View style={styles.dbInfo}>
                <View style={styles.dbNameRow}>
                  <Text style={styles.dbName} numberOfLines={1}>
                    {db.displayName}
                  </Text>
                  {db.isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dbMeta}>
                  {formatBytes(db.fileSizeBytes)}
                  {db.downloadedAt ? ` · ${formatDate(db.downloadedAt)}` : ''}
                </Text>
              </View>
              <View style={styles.dbActions}>
                {db.isActive ? (
                  <Button
                    mode="text"
                    compact
                    onPress={() => handleRefresh(db.id)}
                    disabled={isDownloading || dbLoading}
                    icon="refresh"
                    textColor={appTheme.colors.primary}>
                    {''}
                  </Button>
                ) : (
                  <>
                    <Button
                      mode="text"
                      compact
                      onPress={() => handleSetActive(db.id)}
                      disabled={isDownloading || dbLoading}
                      textColor={appTheme.colors.primary}>
                      Set active
                    </Button>
                    <Button
                      mode="text"
                      compact
                      onPress={() => handleRemove(db.id, db.displayName)}
                      disabled={isDownloading || dbLoading}
                      icon="delete-outline"
                      textColor={appTheme.colors.error}>
                      {''}
                    </Button>
                  </>
                )}
              </View>
            </View>
          ))
        )}

        {isDownloading && (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={downloadProgress}
              color={appTheme.colors.primary}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              Downloading... {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        )}

        {dbLoading && !isDownloading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={appTheme.colors.primary} />
          </View>
        )}

        {dbError && <Text style={styles.errorText}>{dbError}</Text>}

        <Button
          mode="outlined"
          onPress={() => setUrlModalVisible(true)}
          disabled={isDownloading || dbLoading}
          style={styles.loadUrlBtn}
          textColor={appTheme.colors.primary}
          icon="download">
          Load New Database from URL
        </Button>

        <Text style={styles.hintText}>
          Load catalog databases from a public URL (e.g., GitHub). Refresh
          fetches a new version alongside the current one.
        </Text>
      </List.Section>

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

      {/* URL Input Modal */}
      <Modal
        visible={urlModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUrlModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: theme.colors.surface},
            ]}>
            <Text style={[styles.modalTitle, {color: appTheme.colors.text}]}>
              Load Database from URL
            </Text>
            <TextInput
              style={[
                styles.urlInput,
                {
                  color: appTheme.colors.text,
                  borderColor: appTheme.colors.outline,
                },
              ]}
              placeholder="https://example.com/catalog.db"
              placeholderTextColor={appTheme.colors.placeholder}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.modalActions}>
              <Button
                mode="text"
                onPress={() => {
                  setUrlModalVisible(false);
                  setUrlInput('');
                }}
                textColor={appTheme.colors.onSurface}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleLoadFromUrl}
                disabled={!urlInput.trim()}
                buttonColor={appTheme.colors.primary}
                textColor={appTheme.colors.onPrimary}>
                Load
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  emptyDownloads: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Database management styles
  dbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appTheme.colors.outline,
  },
  dbItemActive: {
    backgroundColor: appTheme.colors.accentLight,
  },
  dbInfo: {
    flex: 1,
    marginRight: 8,
  },
  dbNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dbName: {
    ...appTheme.typography.body1,
    color: appTheme.colors.text,
    fontWeight: '600',
    flexShrink: 1,
  } as TextStyle,
  activeBadge: {
    backgroundColor: appTheme.colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    ...appTheme.typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  } as TextStyle,
  dbMeta: {
    ...appTheme.typography.caption,
    color: appTheme.colors.onSurface,
    marginTop: 2,
  } as TextStyle,
  dbActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    ...appTheme.typography.caption,
    color: appTheme.colors.onSurface,
    marginTop: 4,
  } as TextStyle,

  loadingContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  errorText: {
    ...appTheme.typography.caption,
    color: appTheme.colors.error,
    paddingHorizontal: 16,
    paddingVertical: 4,
  } as TextStyle,

  loadUrlBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    borderColor: appTheme.colors.primary,
  },

  // Downloads styles
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    ...appTheme.shadows.medium,
  },
  modalTitle: {
    ...appTheme.typography.h3,
    marginBottom: 16,
  } as TextStyle,
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...appTheme.typography.body1,
    marginBottom: 16,
  } as TextStyle,
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

export default SettingsScreen;
