jest.mock('react-native-sqlite-storage');

const {
  __mockExecuteSql: mockExecuteSql,
  __mockClose: mockClose,
  __mockTransaction: mockTransaction,
  __mockOpenDatabase: mockOpenDatabase,
} = require('react-native-sqlite-storage');

import {
  appMetaRepository,
  initAppMetaDb,
  closeAppMetaDb,
} from '../../src/database/appMetaRepository';
import {ManagedDatabase, DownloadedMp3} from '../../src/types/book';

function makeRows(items: Record<string, unknown>[]) {
  return [
    {
      rows: {
        length: items.length,
        item: (i: number) => items[i],
      },
    },
  ];
}

const sampleDbRow = {
  id: 'db-1',
  display_name: 'My Database',
  source_url: 'https://example.com/db.sqlite',
  file_path: '/data/db.sqlite',
  file_size_bytes: 1024000,
  downloaded_at: '2026-01-01T00:00:00Z',
  is_active: 1,
};

const sampleManagedDb: ManagedDatabase = {
  id: 'db-1',
  displayName: 'My Database',
  sourceUrl: 'https://example.com/db.sqlite',
  filePath: '/data/db.sqlite',
  fileSizeBytes: 1024000,
  downloadedAt: '2026-01-01T00:00:00Z',
  isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

async function initDb() {
  mockExecuteSql
    .mockResolvedValueOnce([{rows: {length: 0}}])
    .mockResolvedValueOnce([{rows: {length: 0}}])
    .mockResolvedValueOnce([{rows: {length: 0}}]);
  await initAppMetaDb('meta.db');
}

const sampleMp3Row = {
  id: 'book-1',
  book_id: 'book-1',
  chapter_index: null,
  file_path: '/data/mp3/book-1/book-1.mp3',
  file_size_bytes: 5000,
  downloaded_at: '2026-02-20T10:00:00Z',
  audio_url: 'https://example.com/book-1.mp3',
};

describe('appMetaRepository', () => {
  describe('initAppMetaDb', () => {
    it('opens database and creates all three tables', async () => {
      await initDb();
      expect(mockOpenDatabase).toHaveBeenCalledWith(
        expect.objectContaining({name: 'meta.db'}),
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS managed_databases'),
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS downloaded_mp3s'),
      );
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS library_entries'),
      );
    });
  });

  describe('listDatabases', () => {
    it('returns all managed databases', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleDbRow]));

      const dbs = await appMetaRepository.listDatabases();
      expect(dbs).toHaveLength(1);
      expect(dbs[0].id).toBe('db-1');
      expect(dbs[0].displayName).toBe('My Database');
      expect(dbs[0].isActive).toBe(true);
    });
  });

  describe('getActiveDatabase', () => {
    it('returns the active database', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleDbRow]));

      const db = await appMetaRepository.getActiveDatabase();
      expect(db).not.toBeNull();
      expect(db!.id).toBe('db-1');
      expect(db!.isActive).toBe(true);
    });

    it('returns null when no active database', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const db = await appMetaRepository.getActiveDatabase();
      expect(db).toBeNull();
    });
  });

  describe('setActiveDatabase', () => {
    it('deactivates all then activates specified ID via transaction', async () => {
      await initDb();

      const txExec = jest.fn().mockResolvedValue([{rows: {length: 0}}]);
      mockTransaction.mockImplementationOnce(async (cb: Function) => {
        await cb({executeSql: txExec});
      });

      await appMetaRepository.setActiveDatabase('db-1');

      expect(txExec).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = 0'),
      );
      expect(txExec).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = 1'),
        ['db-1'],
      );
    });
  });

  describe('addDatabase', () => {
    it('inserts a managed database entry', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.addDatabase(sampleManagedDb);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        [
          'db-1',
          'My Database',
          'https://example.com/db.sqlite',
          '/data/db.sqlite',
          1024000,
          '2026-01-01T00:00:00Z',
          1,
        ],
      );
    });
  });

  describe('removeDatabase', () => {
    it('deletes the specified database entry', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.removeDatabase('db-1');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM managed_databases'),
        ['db-1'],
      );
    });
  });

  describe('getDatabaseById', () => {
    it('returns a single database entry', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleDbRow]));

      const db = await appMetaRepository.getDatabaseById('db-1');
      expect(db).not.toBeNull();
      expect(db!.displayName).toBe('My Database');
    });
  });

  // --- downloaded_mp3s CRUD tests ---

  describe('insertDownloadedMp3', () => {
    it('inserts a download record', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      const entry: DownloadedMp3 = {
        id: 'book-1',
        bookId: 'book-1',
        filePath: '/data/mp3/book-1/book-1.mp3',
        fileSizeBytes: 5000,
        downloadedAt: '2026-02-20T10:00:00Z',
        sourceUrl: 'https://example.com/book-1.mp3',
      };

      await appMetaRepository.insertDownloadedMp3(entry);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO downloaded_mp3s'),
        [
          'book-1',
          'book-1',
          null,
          '/data/mp3/book-1/book-1.mp3',
          5000,
          '2026-02-20T10:00:00Z',
          'https://example.com/book-1.mp3',
        ],
      );
    });
  });

  describe('getDownloadsByBookId', () => {
    it('returns downloads for a specific book', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleMp3Row]));

      const downloads = await appMetaRepository.getDownloadsByBookId('book-1');
      expect(downloads).toHaveLength(1);
      expect(downloads[0].bookId).toBe('book-1');
      expect(downloads[0].sourceUrl).toBe('https://example.com/book-1.mp3');
    });
  });

  describe('getAllDownloads', () => {
    it('returns all download records', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(
        makeRows([
          sampleMp3Row,
          {...sampleMp3Row, id: 'book-2', book_id: 'book-2'},
        ]),
      );

      const downloads = await appMetaRepository.getAllDownloads();
      expect(downloads).toHaveLength(2);
    });
  });

  describe('deleteDownloadsByBookId', () => {
    it('deletes downloads for a specific book', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.deleteDownloadsByBookId('book-1');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM downloaded_mp3s WHERE book_id'),
        ['book-1'],
      );
    });
  });

  describe('deleteAllDownloadRecords', () => {
    it('deletes all download records', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.deleteAllDownloadRecords();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'DELETE FROM downloaded_mp3s',
      );
    });
  });

  describe('getTotalDownloadSize', () => {
    it('returns total size of all downloads', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([{total: 15000}]));

      const total = await appMetaRepository.getTotalDownloadSize();
      expect(total).toBe(15000);
    });
  });

  describe('getDownloadedBookIds', () => {
    it('returns distinct book IDs of downloads', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(
        makeRows([{book_id: 'book-1'}, {book_id: 'book-2'}]),
      );

      const ids = await appMetaRepository.getDownloadedBookIds();
      expect(ids).toEqual(['book-1', 'book-2']);
    });
  });

  // --- library_entries CRUD tests ---

  describe('addToLibrary', () => {
    it('inserts a library entry with upsert', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.addToLibrary('book-1');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO library_entries'),
        expect.arrayContaining(['book-1']),
      );
    });
  });

  describe('removeFromLibrary', () => {
    it('deletes a library entry', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);

      await appMetaRepository.removeFromLibrary('book-1');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM library_entries'),
        ['book-1'],
      );
    });
  });

  describe('getLibraryEntries', () => {
    it('returns all library entries ordered by last_opened_at desc', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(
        makeRows([
          {
            book_id: 'book-2',
            added_at: '2026-02-20T12:00:00Z',
            last_opened_at: '2026-02-21T10:00:00Z',
          },
          {
            book_id: 'book-1',
            added_at: '2026-02-19T10:00:00Z',
            last_opened_at: '2026-02-20T10:00:00Z',
          },
        ]),
      );

      const entries = await appMetaRepository.getLibraryEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].bookId).toBe('book-2');
      expect(entries[0].id).toBe('book-2');
      expect(entries[0].source).toBe('auto');
      expect(entries[1].bookId).toBe('book-1');
    });

    it('returns empty array when no entries', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const entries = await appMetaRepository.getLibraryEntries();
      expect(entries).toEqual([]);
    });
  });

  describe('isInLibrary', () => {
    it('returns true when book exists in library', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([{1: 1}]));

      const result = await appMetaRepository.isInLibrary('book-1');
      expect(result).toBe(true);
    });

    it('returns false when book is not in library', async () => {
      await initDb();
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const result = await appMetaRepository.isInLibrary('book-99');
      expect(result).toBe(false);
    });
  });

  describe('library auto-add → remove → re-add integration flow', () => {
    it('adds book, verifies presence, removes, verifies absence, re-adds', async () => {
      await initDb();

      // 1. Add to library
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await appMetaRepository.addToLibrary('book-1');
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO library_entries'),
        expect.arrayContaining(['book-1']),
      );

      // 2. Verify presence
      mockExecuteSql.mockResolvedValueOnce(makeRows([{1: 1}]));
      const isPresent = await appMetaRepository.isInLibrary('book-1');
      expect(isPresent).toBe(true);

      // 3. Remove from library
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await appMetaRepository.removeFromLibrary('book-1');
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM library_entries'),
        ['book-1'],
      );

      // 4. Verify absence
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));
      const isAbsent = await appMetaRepository.isInLibrary('book-1');
      expect(isAbsent).toBe(false);

      // 5. Re-add (upsert)
      mockExecuteSql.mockResolvedValueOnce([{rows: {length: 0}}]);
      await appMetaRepository.addToLibrary('book-1');
      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO library_entries'),
        expect.arrayContaining(['book-1']),
      );

      // 6. Verify re-added
      mockExecuteSql.mockResolvedValueOnce(makeRows([{1: 1}]));
      const isBack = await appMetaRepository.isInLibrary('book-1');
      expect(isBack).toBe(true);
    });
  });

  describe('closeAppMetaDb', () => {
    it('closes the connection', async () => {
      await initDb();
      await closeAppMetaDb();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
