/**
 * Data access layer for book catalog. (Epic 8) All catalog reads now go through
 * the local SQLite catalogRepository — no network calls for catalog data.
 * Audio streaming URLs are resolved from the local DB fields (main_audio_url,
 * chapter_urls).
 */
import {
  Book,
  BookSearchResult,
  AdvancedSearchFilters,
  CatalogFilterOption,
} from '../types/book';
import {catalogRepository} from '../database/catalogRepository';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An error occurred';
}

export type CatalogStats = {
  totalBooks: number;
  audiobooks: number;
  ebooks: number;
};

export const booksApi = {
  async getBooks(): Promise<Book[]> {
    return catalogRepository.getAllBooks();
  },

  async getBooksPage(limit: number, offset: number): Promise<Book[]> {
    return catalogRepository.getBooksPage(limit, offset);
  },

  async getBooksByIds(ids: string[]): Promise<Book[]> {
    return catalogRepository.getBooksByIds(ids);
  },

  async getStats(): Promise<CatalogStats> {
    return catalogRepository.getStats();
  },

  async getAuthors(): Promise<CatalogFilterOption[]> {
    return catalogRepository.getAuthors();
  },

  async getCategories(): Promise<CatalogFilterOption[]> {
    return catalogRepository.getCategories();
  },

  async getBookById(id: string): Promise<Book> {
    const book = await catalogRepository.getBookById(id);
    if (!book) {
      throw new Error(`Book with ID ${id} not found`);
    }
    return book;
  },

  async searchBooks(
    query: string,
    _page = 1,
    limit = 100,
  ): Promise<BookSearchResult> {
    if (!query.trim()) {
      return {books: [], totalCount: 0, hasMore: false, page: 1, limit};
    }
    const books = await catalogRepository.searchBooks(query.trim(), limit);
    return {
      books,
      totalCount: books.length,
      hasMore: books.length >= limit,
      page: 1,
      limit,
    };
  },

  async advancedSearch(
    filters: AdvancedSearchFilters & {page?: number; limit?: number},
  ): Promise<BookSearchResult> {
    const result = await catalogRepository.advancedSearch(filters);
    return {
      books: result.books,
      totalCount: result.total,
      hasMore: result.page * result.limit < result.total,
      page: result.page,
      limit: result.limit,
    };
  },
};

export {getErrorMessage};

export default booksApi;
