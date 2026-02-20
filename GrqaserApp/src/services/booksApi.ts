/**
 * Data access layer for book catalog. (Epic 8) All catalog reads now go through
 * the local SQLite catalogRepository — no network calls for catalog data.
 * Audio streaming URLs are resolved from the local DB fields (main_audio_url,
 * chapter_urls).
 */
import {Book, BookSearchResult} from '../types/book';
import {catalogRepository} from '../database/catalogRepository';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An error occurred';
}

export const booksApi = {
  async getBooks(): Promise<Book[]> {
    return catalogRepository.getAllBooks();
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
    _limit = 20,
  ): Promise<BookSearchResult> {
    if (!query.trim()) {
      return {books: [], totalCount: 0, hasMore: false, page: 1, limit: _limit};
    }
    const books = await catalogRepository.searchBooks(query.trim());
    return {
      books,
      totalCount: books.length,
      hasMore: false,
      page: 1,
      limit: books.length,
    };
  },
};

export {getErrorMessage};

export default booksApi;
