/**
 * SQLite connection module. Abstracts database open/close behind a clean
 * interface so a future migration to another DB engine only touches this file.
 *
 * Bundling a pre-populated catalog DB:
 *   Android — place the .db file in android/app/src/main/assets/
 *   iOS     — add the .db file to the Xcode project (Copy Bundle Resources)
 * Then call openBundledDatabase(filename) which uses createFromLocation to
 * copy from assets on first launch automatically.
 */
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export interface DatabaseConnection {
  db: SQLite.SQLiteDatabase;
  close(): Promise<void>;
}

/**
 * Open a SQLite database at the given path in the default documents location.
 */
export async function openDatabase(
  filePath: string,
): Promise<DatabaseConnection> {
  const db = await SQLite.openDatabase({
    name: filePath,
    location: 'default',
  });
  return {
    db,
    close: () => db.close(),
  };
}

/**
 * Open a pre-bundled database from app assets. On first launch the file is
 * copied from Android assets / iOS bundle to a writable location automatically.
 */
export async function openBundledDatabase(
  fileName: string,
): Promise<DatabaseConnection> {
  const db = await SQLite.openDatabase({
    name: fileName,
    createFromLocation: 1,
    location: 'default',
  });
  return {
    db,
    close: () => db.close(),
  };
}

export const DEFAULT_CATALOG_DB = 'grqaser.db';
export const APP_META_DB = 'grqaser_app_meta.db';
