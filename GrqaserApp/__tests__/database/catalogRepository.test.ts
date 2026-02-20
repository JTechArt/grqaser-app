jest.mock('react-native-sqlite-storage');

const {
  __mockExecuteSql: mockExecuteSql,
  __mockClose: mockClose,
  __mockOpenDatabase: mockOpenDatabase,
} = require('react-native-sqlite-storage');

import {
  catalogRepository,
  initCatalogDb,
  closeCatalogDb,
} from '../../src/database/catalogRepository';

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

const sampleRow = {
  id: 1,
  title: 'Test Book',
  author: 'Author',
  description: 'Desc',
  cover_image_url: 'https://img.test/cover.jpg',
  main_audio_url: 'https://audio.test/a.mp3',
  duration: 60,
  type: 'audiobook',
  language: 'hy',
  category: 'Fiction',
  rating: 4.0,
  rating_count: 5,
  download_url: null,
  file_size: null,
  published_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('catalogRepository', () => {
  describe('initCatalogDb', () => {
    it('opens the database at the given path', async () => {
      await initCatalogDb('/data/test.db');
      expect(mockOpenDatabase).toHaveBeenCalledWith(
        expect.objectContaining({name: '/data/test.db'}),
      );
    });
  });

  describe('getAllBooks', () => {
    it('returns mapped books from all rows', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleRow]));

      const books = await catalogRepository.getAllBooks();

      expect(books).toHaveLength(1);
      expect(books[0].id).toBe('1');
      expect(books[0].title).toBe('Test Book');
      expect(books[0].duration).toBe(3600);
      expect(books[0].type).toBe('audiobook');
    });

    it('returns empty array when no books', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const books = await catalogRepository.getAllBooks();
      expect(books).toEqual([]);
    });
  });

  describe('getBookById', () => {
    it('returns a single mapped book', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleRow]));

      const book = await catalogRepository.getBookById(1);
      expect(book).not.toBeNull();
      expect(book!.id).toBe('1');
      expect(book!.title).toBe('Test Book');
    });

    it('returns null for missing book', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const book = await catalogRepository.getBookById(999);
      expect(book).toBeNull();
    });
  });

  describe('searchBooks', () => {
    it('queries with LIKE and returns mapped results', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleRow]));

      const books = await catalogRepository.searchBooks('Test');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        ['%Test%', '%Test%', '%Test%'],
      );
      expect(books).toHaveLength(1);
    });

    it('returns empty for no matches', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const books = await catalogRepository.searchBooks('nonexistent');
      expect(books).toEqual([]);
    });
  });

  describe('getBookCount', () => {
    it('returns the count', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([{count: 42}]));

      const count = await catalogRepository.getBookCount();
      expect(count).toBe(42);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(
        makeRows([{total: 10, audiobooks: 8, ebooks: 2}]),
      );

      const stats = await catalogRepository.getStats();
      expect(stats).toEqual({totalBooks: 10, audiobooks: 8, ebooks: 2});
    });
  });

  describe('closeCatalogDb', () => {
    it('closes the connection', async () => {
      await initCatalogDb('test.db');
      await closeCatalogDb();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('when not initialized', () => {
    it('throws if getAllBooks called before init', async () => {
      await closeCatalogDb();
      await expect(catalogRepository.getAllBooks()).rejects.toThrow(
        'Catalog database not initialized',
      );
    });
  });
});
