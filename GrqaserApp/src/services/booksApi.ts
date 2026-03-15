import axios from 'axios';
import { Book, BookCategory, BookSearchResult } from '../types/book';

// Base API configuration
const API_BASE_URL = 'https://grqaser.org/api';
const CRAWLER_DATA_URL = 'http://localhost:3000/api'; // For development with local crawler data

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'GrqaserApp/1.0',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const booksApi = {
  /**
   * Get all books
   */
  async getBooks(): Promise<Book[]> {
    try {
      // First try the main API
      const response = await api.get('/books');
      return response.data;
    } catch (error) {
      console.warn('Main API failed, trying crawler data...');
      
      // Fallback to crawler data
      try {
        const crawlerResponse = await axios.get(`${CRAWLER_DATA_URL}/books`);
        return crawlerResponse.data.books || [];
      } catch (crawlerError) {
        console.error('Both APIs failed:', crawlerError);
        throw new Error('Failed to fetch books from all sources');
      }
    }
  },

  /**
   * Get book by ID
   */
  async getBookById(id: string): Promise<Book> {
    try {
      const response = await api.get(`/books/${id}`);
      return response.data;
    } catch (error) {
      // Fallback to crawler data
      try {
        const crawlerResponse = await axios.get(`${CRAWLER_DATA_URL}/books/${id}`);
        return crawlerResponse.data;
      } catch (crawlerError) {
        throw new Error(`Book with ID ${id} not found`);
      }
    }
  },

  /**
   * Search books
   */
  async searchBooks(query: string, page: number = 1, limit: number = 20): Promise<BookSearchResult> {
    try {
      const response = await api.get('/books/search', {
        params: { q: query, page, limit },
      });
      return response.data;
    } catch (error) {
      // Fallback to local search
      try {
        const allBooks = await this.getBooks();
        const filteredBooks = allBooks.filter(book =>
          book.title.toLowerCase().includes(query.toLowerCase()) ||
          book.author.toLowerCase().includes(query.toLowerCase()) ||
          book.description?.toLowerCase().includes(query.toLowerCase())
        );
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
        
        return {
          books: paginatedBooks,
          totalCount: filteredBooks.length,
          hasMore: endIndex < filteredBooks.length,
          page,
          limit,
        };
      } catch (searchError) {
        throw new Error('Search failed');
      }
    }
  },

  /**
   * Get books by category
   */
  async getBooksByCategory(category: string, page: number = 1, limit: number = 20): Promise<BookSearchResult> {
    try {
      const response = await api.get(`/books/category/${category}`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      // Fallback to local filtering
      try {
        const allBooks = await this.getBooks();
        const filteredBooks = allBooks.filter(book => book.category === category);
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
        
        return {
          books: paginatedBooks,
          totalCount: filteredBooks.length,
          hasMore: endIndex < filteredBooks.length,
          page,
          limit,
        };
      } catch (filterError) {
        throw new Error(`Failed to get books for category: ${category}`);
      }
    }
  },

  /**
   * Get books by author
   */
  async getBooksByAuthor(author: string, page: number = 1, limit: number = 20): Promise<BookSearchResult> {
    try {
      const response = await api.get(`/books/author/${encodeURIComponent(author)}`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      // Fallback to local filtering
      try {
        const allBooks = await this.getBooks();
        const filteredBooks = allBooks.filter(book => 
          book.author.toLowerCase().includes(author.toLowerCase())
        );
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
        
        return {
          books: paginatedBooks,
          totalCount: filteredBooks.length,
          hasMore: endIndex < filteredBooks.length,
          page,
          limit,
        };
      } catch (filterError) {
        throw new Error(`Failed to get books for author: ${author}`);
      }
    }
  },

  /**
   * Get categories
   */
  async getCategories(): Promise<BookCategory[]> {
    try {
      const response = await api.get('/categories');
      return response.data;
    } catch (error) {
      // Fallback to local categories
      try {
        const allBooks = await this.getBooks();
        const categoryMap = new Map<string, number>();
        
        allBooks.forEach(book => {
          const count = categoryMap.get(book.category) || 0;
          categoryMap.set(book.category, count + 1);
        });
        
        const categories: BookCategory[] = Array.from(categoryMap.entries()).map(([name, count]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          bookCount: count,
          description: `${count} books in ${name}`,
        }));
        
        return categories;
      } catch (categoryError) {
        throw new Error('Failed to fetch categories');
      }
    }
  },

  /**
   * Get book chapters
   */
  async getBookChapters(bookId: string): Promise<any[]> {
    try {
      const response = await api.get(`/books/${bookId}/chapters`);
      return response.data;
    } catch (error) {
      // Return empty array if chapters not available
      console.warn(`Chapters not available for book ${bookId}`);
      return [];
    }
  },

  /**
   * Get book comments
   */
  async getBookComments(bookId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const response = await api.get(`/books/${bookId}/comments`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      // Return empty comments if not available
      console.warn(`Comments not available for book ${bookId}`);
      return {
        comments: [],
        totalCount: 0,
        hasMore: false,
        page,
        limit,
      };
    }
  },

  /**
   * Get book statistics
   */
  async getBookStatistics(): Promise<any> {
    try {
      const response = await api.get('/statistics');
      return response.data;
    } catch (error) {
      // Fallback to local statistics
      try {
        const allBooks = await this.getBooks();
        const audiobooks = allBooks.filter(book => book.type === 'audiobook');
        const ebooks = allBooks.filter(book => book.type === 'ebook');
        const totalDuration = allBooks.reduce((sum, book) => sum + (book.duration || 0), 0);
        
        return {
          totalBooks: allBooks.length,
          totalAudiobooks: audiobooks.length,
          totalEbooks: ebooks.length,
          totalDuration,
          averageRating: 4.5, // Default value
          totalRatings: 0,
          mostPopularCategories: [],
          mostPopularAuthors: [],
        };
      } catch (statsError) {
        throw new Error('Failed to fetch statistics');
      }
    }
  },

  /**
   * Get recommendations
   */
  async getRecommendations(bookId?: string, limit: number = 10): Promise<Book[]> {
    try {
      const params = bookId ? { bookId, limit } : { limit };
      const response = await api.get('/recommendations', { params });
      return response.data;
    } catch (error) {
      // Fallback to random books
      try {
        const allBooks = await this.getBooks();
        const shuffled = allBooks.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);
      } catch (recommendationError) {
        throw new Error('Failed to fetch recommendations');
      }
    }
  },
};

export default booksApi;
