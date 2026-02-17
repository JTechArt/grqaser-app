import axios, {AxiosError} from 'axios';
import {Book, BookCategory, BookSearchResult} from '../types/book';
import {apiBaseUrl, apiTimeoutMs} from './apiConfig';
import {ApiBook, mapApiBookToBook} from './bookMapper';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: apiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'GrqaserApp/1.0',
  },
});

interface ListResponse {
  success: boolean;
  data: {
    books: ApiBook[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

interface SingleBookResponse {
  success: boolean;
  data: ApiBook;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{error?: {message?: string}}>;
    const msg = ax.response?.data?.error?.message ?? ax.message;
    if (ax.response?.status) {
      return `Network error (${ax.response.status}): ${msg}`;
    }
    return msg || 'Network request failed';
  }
  return error instanceof Error ? error.message : 'An error occurred';
}

export const booksApi = {
  /**
   * Get all books (books-admin-app GET /api/v1/books).
   */
  async getBooks(page = 1, limit = 100): Promise<Book[]> {
    const response = await api.get<ListResponse>('/books', {
      params: {page, limit},
    });
    const data = response.data?.data;
    if (!data?.books) {
      return [];
    }
    return (data.books as ApiBook[]).map(mapApiBookToBook);
  },

  /**
   * Get book by ID (books-admin-app GET /api/v1/books/:id).
   */
  async getBookById(id: string): Promise<Book> {
    const response = await api.get<SingleBookResponse>(`/books/${id}`);
    const data = response.data?.data;
    if (!data) {
      throw new Error(`Book with ID ${id} not found`);
    }
    return mapApiBookToBook(data as ApiBook);
  },

  /**
   * Search books (books-admin-app GET /api/v1/books/search?q=).
   */
  async searchBooks(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<BookSearchResult> {
    if (!query.trim()) {
      return {books: [], totalCount: 0, hasMore: false, page, limit};
    }
    const response = await api.get<ListResponse>('/books/search', {
      params: {q: query.trim(), page, limit},
    });
    const data = response.data?.data;
    if (!data) {
      return {books: [], totalCount: 0, hasMore: false, page, limit};
    }
    const pagination = data.pagination;
    return {
      books: (data.books as ApiBook[]).map(mapApiBookToBook),
      totalCount: pagination?.total ?? 0,
      hasMore: pagination?.has_next ?? false,
      page: pagination?.page ?? page,
      limit: pagination?.limit ?? limit,
    };
  },

  /**
   * Get categories (books-admin-app has GET /api/v1/stats/categories;
   * this client fetches books and aggregates, or could use stats endpoint).
   */
  async getCategories(): Promise<BookCategory[]> {
    const books = await this.getBooks(1, 500);
    const categoryMap = new Map<string, number>();
    books.forEach(book => {
      const name = book.category || 'Unknown';
      categoryMap.set(name, (categoryMap.get(name) ?? 0) + 1);
    });
    return Array.from(categoryMap.entries()).map(([name, count]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      bookCount: count,
      description: `${count} books in ${name}`,
    }));
  },
};

export {getErrorMessage};

export default booksApi;
