/**
 * SQLite connection module. Abstracts database open/close behind a clean
 * interface so a future migration to another DB engine only touches this file.
 *
 * Bundling a pre-populated catalog DB:
 *   Android — place the .db file in android/app/src/main/assets/
 *   iOS     — add the .db file to the Xcode project (Copy Bundle Resources)
 * Then call openBundledDatabase(filename) which uses createFromLocation to
 * copy from assets on first launch automatically.
 *
 * iOS: react-native-sqlite-storage looks for createFromLocation "1" in
 * Bundle/www/; we use "~fileName" so it looks in the bundle root (no www).
 * Downloaded DBs: the plugin appends "name" to a base dir; we pass
 * location "Documents" and the path relative to Documents so the path matches.
 */
import SQLite from 'react-native-sqlite-storage';
import RNFS from 'react-native-fs';

SQLite.enablePromise(true);

export interface DatabaseConnection {
  db: SQLite.SQLiteDatabase;
  close(): Promise<void>;
}

/**
 * Open a SQLite database at the given path. For paths under the app Documents
 * directory (e.g. downloaded DBs), we pass location 'Documents' and the
 * relative path so the native plugin opens the correct file on both iOS and Android.
 */
export async function openDatabase(
  filePath: string,
): Promise<DatabaseConnection> {
  const docs = RNFS.DocumentDirectoryPath;
  const isUnderDocuments =
    filePath === docs || filePath.startsWith(docs + '/');
  const name = isUnderDocuments
    ? filePath.slice(docs.length + 1)
    : filePath;
  const location = isUnderDocuments ? 'Documents' : 'default';

  const db = await SQLite.openDatabase({
    name,
    location,
  });
  return {
    db,
    close: () => db.close(),
  };
}

/**
 * Open a pre-bundled database from app assets. Opens the bundle file read-only
 * so we always use the actual bundle content (avoids using a stale/corrupt copy
 * that may have been written to Library/LocalDatabase on a previous run).
 * Uses "~fileName" so iOS looks in the bundle root (not www/).
 */
export async function openBundledDatabase(
  fileName: string,
): Promise<DatabaseConnection> {
  const db = await SQLite.openDatabase({
    name: fileName,
    createFromLocation: `~${fileName}`,
    location: 'default',
    readOnly: true,
  });
  return {
    db,
    close: () => db.close(),
  };
}

export const DEFAULT_CATALOG_DB = 'grqaser.db';
export const APP_META_DB = 'grqaser_app_meta.db';
