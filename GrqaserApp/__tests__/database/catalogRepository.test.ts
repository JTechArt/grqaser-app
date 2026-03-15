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

function makeSchemaRows(hasRelationTables = true) {
  return makeRows(
    hasRelationTables
      ? [{name: 'authors'}, {name: 'book_categories'}]
      : [],
  );
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

beforeEach(async () => {
  mockExecuteSql.mockReset();
  mockClose.mockClear();
  mockOpenDatabase.mockClear();
  await closeCatalogDb();
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
    it('queries with LIKE and LIMIT, returns mapped results', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleRow]));

      const books = await catalogRepository.searchBooks('Test');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringMatching(/LIKE.*LIMIT/),
        ['%Test%', '%Test%', '%Test%', 100],
      );
      expect(books).toHaveLength(1);
    });

    it('respects custom limit', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      await catalogRepository.searchBooks('x', 50);

      expect(mockExecuteSql).toHaveBeenCalledWith(expect.any(String), [
        '%x%',
        '%x%',
        '%x%',
        50,
      ]);
    });

    it('returns empty for no matches', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const books = await catalogRepository.searchBooks('nonexistent');
      expect(books).toEqual([]);
    });
  });

  describe('advanced search helpers', () => {
    it('returns author filter options with book counts', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows())
        .mockResolvedValueOnce(
        makeRows([{id: 1, name: 'Author A', book_count: 4}]),
        );
      const authors = await catalogRepository.getAuthors();
      expect(authors).toEqual([{id: 1, name: 'Author A', bookCount: 4}]);
    });

    it('returns category filter options with book counts', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows())
        .mockResolvedValueOnce(
        makeRows([{id: 2, name: 'Fiction', book_count: 9}]),
        );
      const categories = await catalogRepository.getCategories();
      expect(categories).toEqual([{id: 2, name: 'Fiction', bookCount: 9}]);
    });

    it('applies combined filters and returns paged result', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows())
        .mockResolvedValueOnce(makeRows([{total: 1}]))
        .mockResolvedValueOnce(
          makeRows([
            {
              ...sampleRow,
              author: 'Fallback Author',
              category: 'Fallback Category',
              resolved_author: 'Resolved Author',
              resolved_category: 'Resolved Category',
            },
          ]),
        );

      const result = await catalogRepository.advancedSearch({
        authorIds: [1],
        categoryIds: [2],
        durationRange: '300+',
        text: 'test',
        page: 2,
        limit: 10,
      });

      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('COUNT(*) as total'),
        [1, 2, '%test%', '%test%', '%test%'],
      );
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [1, 2, '%test%', '%test%', '%test%', 10, 10],
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.books[0].author).toBe('Resolved Author');
      expect(result.books[0].category).toBe('Resolved Category');
    });

    it('ignores empty filters and returns all rows page', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows())
        .mockResolvedValueOnce(makeRows([{total: 2}]))
        .mockResolvedValueOnce(makeRows([sampleRow]));

      await catalogRepository.advancedSearch({
        authorIds: [],
        categoryIds: [],
        durationRange: null,
        text: '',
      });

      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        expect.not.stringContaining('WHERE'),
        [],
      );
    });

    it('falls back to grouped books table authors when relation tables are missing', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows(false))
        .mockResolvedValueOnce(
          makeRows([
            {...sampleRow, author: 'Legacy Author'},
            {...sampleRow, id: 2, author: 'Legacy Author'},
            {...sampleRow, id: 3, author: 'Other Author'},
          ]),
        );

      const authors = await catalogRepository.getAuthors();

      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        'SELECT * FROM books ORDER BY title ASC',
      );
      expect(authors).toEqual([
        {id: 1, name: 'Legacy Author', bookCount: 2},
        {id: 2, name: 'Other Author', bookCount: 1},
      ]);
    });

    it('falls back to grouped books table categories when relation tables are missing', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows(false))
        .mockResolvedValueOnce(
          makeRows([
            {...sampleRow, category: 'Legacy Category'},
            {...sampleRow, id: 2, category: 'Legacy Category'},
            {...sampleRow, id: 3, category: 'Other Category'},
          ]),
        );

      const categories = await catalogRepository.getCategories();

      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        'SELECT * FROM books ORDER BY title ASC',
      );
      expect(categories).toEqual([
        {id: 1, name: 'Legacy Category', bookCount: 2},
        {id: 2, name: 'Other Category', bookCount: 1},
      ]);
    });

    it('falls back to books.author and books.category filters when relation tables are missing', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows(false))
        .mockResolvedValueOnce(
          makeRows([
            {
              ...sampleRow,
              author: 'Legacy Author',
              category: 'Legacy Category',
              resolved_author: 'Legacy Author',
              resolved_category: 'Legacy Category',
            },
            {
              ...sampleRow,
              id: 2,
              title: 'Ignored Book',
              author: 'Other Author',
              category: 'Other Category',
            },
          ]),
        );

      await catalogRepository.getAuthors();
      await catalogRepository.getCategories();

      const result = await catalogRepository.advancedSearch({
        authorIds: [1],
        categoryIds: [1],
        durationRange: '60-120',
        text: 'legacy',
        page: 1,
        limit: 5,
      });

      expect(mockExecuteSql).toHaveBeenCalledTimes(2);
      expect(mockExecuteSql).toHaveBeenNthCalledWith(
        2,
        'SELECT * FROM books ORDER BY title ASC',
      );
      expect(result.total).toBe(1);
      expect(result.books[0].author).toBe('Legacy Author');
      expect(result.books[0].category).toBe('Legacy Category');
    });

    it('caches author options after the first load', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows(false))
        .mockResolvedValueOnce(
          makeRows([
            {...sampleRow, author: 'Cached Author'},
            {...sampleRow, id: 2, author: 'Cached Author'},
          ]),
        );

      const first = await catalogRepository.getAuthors();
      const second = await catalogRepository.getAuthors();

      expect(first).toEqual(second);
      expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    });

    it('caches category options after the first load', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql
        .mockResolvedValueOnce(makeSchemaRows(false))
        .mockResolvedValueOnce(
          makeRows([
            {...sampleRow, category: 'Cached Category'},
            {...sampleRow, id: 2, category: 'Cached Category'},
          ]),
        );

      const first = await catalogRepository.getCategories();
      const second = await catalogRepository.getCategories();

      expect(first).toEqual(second);
      expect(mockExecuteSql).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBooksPage', () => {
    it('returns a page of books with LIMIT and OFFSET', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleRow]));

      const books = await catalogRepository.getBooksPage(10, 0);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [10, 0],
      );
      expect(books).toHaveLength(1);
      expect(books[0].id).toBe('1');
    });

    it('returns empty array for offset beyond data', async () => {
      await initCatalogDb('test.db');
      mockExecuteSql.mockResolvedValueOnce(makeRows([]));

      const books = await catalogRepository.getBooksPage(20, 100);
      expect(books).toEqual([]);
    });
  });

  describe('getBooksByIds', () => {
    it('returns books for given ids', async () => {
      await initCatalogDb('test.db');
      const row2 = {...sampleRow, id: 2, title: 'Second'};
      mockExecuteSql.mockResolvedValueOnce(makeRows([sampleRow, row2]));

      const books = await catalogRepository.getBooksByIds(['1', '2']);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM books WHERE id IN (?,?)'),
        ['1', '2'],
      );
      expect(books).toHaveLength(2);
      expect(books[0].id).toBe('1');
      expect(books[1].title).toBe('Second');
    });

    it('returns empty array when ids is empty', async () => {
      const books = await catalogRepository.getBooksByIds([]);
      expect(books).toEqual([]);
      expect(mockExecuteSql).not.toHaveBeenCalled();
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
