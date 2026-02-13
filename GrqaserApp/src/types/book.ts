export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  audioUrl?: string;
  duration?: number; // in seconds
  language: string;
  type: 'audiobook' | 'ebook';
  category: string;
  rating?: number;
  ratingCount?: number;
  isFavorite?: boolean;
  playProgress?: number; // in seconds
  lastPlayedAt?: string;
  chapters?: Chapter[];
  tags?: string[];
  publishedAt?: string;
  reader?: string;
  fileSize?: number;
  downloadUrl?: string;
  isDownloaded?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  duration: number; // in seconds
  audioUrl: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  isCompleted?: boolean;
  progress?: number; // 0-100
}

export interface BookCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  bookCount: number;
  color?: string;
}

export interface BookFilter {
  category: string;
  type: 'all' | 'audiobook' | 'ebook';
  language: string;
  duration: 'all' | 'short' | 'medium' | 'long';
  rating?: number;
  author?: string;
  reader?: string;
}

export interface BookSearchResult {
  books: Book[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface BookProgress {
  bookId: string;
  chapterId?: string;
  position: number; // in seconds
  duration: number; // in seconds
  percentage: number; // 0-100
  lastPlayedAt: string;
  isCompleted: boolean;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterId?: string;
  position: number; // in seconds
  title: string;
  note?: string;
  createdAt: string;
}

export interface BookComment {
  id: string;
  bookId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  rating?: number;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked?: boolean;
}

export interface BookRecommendation {
  book: Book;
  reason: string;
  score: number;
}

export interface BookStatistics {
  totalBooks: number;
  totalAudiobooks: number;
  totalEbooks: number;
  totalDuration: number; // in seconds
  averageRating: number;
  totalRatings: number;
  mostPopularCategories: Array<{
    category: string;
    count: number;
  }>;
  mostPopularAuthors: Array<{
    author: string;
    count: number;
  }>;
}
