# Grqaser Mobile App - Technical Specification

## 1. Application Architecture

### 1.1 High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Backend API   │    │   Data Crawler  │
│   Mobile App    │◄──►│   (Optional)    │◄──►│   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Storage │    │   Database      │    │   grqaser.org   │
│   (AsyncStorage)│    │   (MongoDB/PG)  │    │   (Target Site) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 Data Flow
1. **Direct Approach**: App → grqaser.org (if allowed)
2. **Proxy Approach**: App → Backend API → grqaser.org
3. **Cached Approach**: App → Backend API → Database (crawled data)

## 2. Data Models

### 2.1 Book Model
```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  duration: {
    hours: number;
    minutes: number;
    formatted: string; // "0ժ 51ր"
  };
  rating: number; // 0-5
  category: string[];
  description: string;
  coverImage: string;
  audioUrl: string;
  language: 'hy' | 'en' | 'ru'; // Armenian, English, Russian
  isFavorite: boolean;
  playProgress: number; // 0-100
  lastPlayedAt?: Date;
}
```

### 2.2 User Model (if authentication)
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  favorites: string[]; // Book IDs
  playHistory: {
    bookId: string;
    progress: number;
    lastPlayed: Date;
  }[];
}
```

## 3. API Endpoints (Backend)

### 3.1 Books API
```
GET    /api/books              - List all books with pagination
GET    /api/books/:id          - Get book details
GET    /api/books/search       - Search books
GET    /api/books/categories   - Get all categories
GET    /api/books/featured     - Get featured books
```

### 3.2 Audio API
```
GET    /api/audio/:bookId      - Get audio stream URL
POST   /api/audio/progress     - Update play progress
```

### 3.3 User API (if authenticated)
```
POST   /api/auth/login         - User login
POST   /api/auth/logout        - User logout
GET    /api/user/favorites     - Get user favorites
POST   /api/user/favorites     - Add to favorites
DELETE /api/user/favorites/:id - Remove from favorites
```

## 4. React Native App Structure

### 4.1 Navigation Structure
```
App
├── TabNavigator
│   ├── HomeTab
│   │   ├── HomeScreen
│   │   ├── BookDetailScreen
│   │   └── AudioPlayerScreen
│   ├── SearchTab
│   │   ├── SearchScreen
│   │   └── SearchResultsScreen
│   ├── CategoriesTab
│   │   ├── CategoriesScreen
│   │   └── CategoryBooksScreen
│   └── ProfileTab
│       ├── ProfileScreen
│       ├── FavoritesScreen
│       └── SettingsScreen
└── ModalStack
    ├── AudioPlayerModal
    └── FilterModal
```

### 4.2 State Management
```typescript
// Store Structure (Redux Toolkit)
interface AppState {
  books: {
    items: Book[];
    loading: boolean;
    error: string | null;
    filters: BookFilters;
  };
  audio: {
    currentBook: Book | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    playbackRate: number;
  };
  user: {
    isAuthenticated: boolean;
    profile: User | null;
    favorites: string[];
  };
  search: {
    query: string;
    results: Book[];
    history: string[];
  };
}
```

## 5. Key Components

### 5.1 BookCard Component
```typescript
interface BookCardProps {
  book: Book;
  onPress: (book: Book) => void;
  onFavoritePress: (bookId: string) => void;
  showProgress?: boolean;
}
```

### 5.2 AudioPlayer Component
```typescript
interface AudioPlayerProps {
  book: Book;
  onClose: () => void;
  onProgressUpdate: (progress: number) => void;
}
```

### 5.3 SearchBar Component
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showHistory?: boolean;
}
```

## 6. Data Crawling Strategy

### 6.1 Crawler Architecture
```javascript
// Crawler Structure
class GrqaserCrawler {
  async crawlBooks() {
    // 1. Get main page
    // 2. Extract book links
    // 3. Crawl individual book pages
    // 4. Extract metadata and audio URLs
    // 5. Store in database
  }
  
  async crawlAudioUrl(bookUrl) {
    // Extract actual audio file URL
    // Handle different audio formats
    // Validate URL accessibility
  }
}
```

### 6.2 Data Extraction Points
- **Book List**: `/` (main page)
- **Book Details**: `/book/[id]` or similar
- **Search Results**: `/search?q=[query]`
- **Categories**: `/category/[name]`

## 7. Audio Player Implementation

### 7.1 React Native Track Player Setup
```typescript
// Audio service configuration
const audioService = {
  async setupPlayer() {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
      ],
    });
  },
  
  async playBook(book: Book) {
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: book.id,
      url: book.audioUrl,
      title: book.title,
      artist: book.author,
      artwork: book.coverImage,
    });
    await TrackPlayer.play();
  }
};
```

### 7.2 Background Audio Support
- iOS: Background audio session
- Android: Foreground service
- Handle interruptions (calls, notifications)
- Lock screen controls

## 8. Performance Considerations

### 8.1 Image Optimization
- Lazy loading for book covers
- Image caching with react-native-fast-image
- Progressive image loading
- WebP format support

### 8.2 Audio Optimization
- Streaming instead of downloading
- Audio preloading for next track
- Adaptive bitrate streaming
- Offline caching (if allowed)

### 8.3 List Performance
- FlatList with getItemLayout
- Virtual scrolling for large lists
- Memoization of list items
- Pull-to-refresh implementation

## 9. Security & Privacy

### 9.1 Data Protection
- Secure storage for user credentials
- HTTPS for all API calls
- Input validation and sanitization
- Rate limiting for API requests

### 9.2 Legal Compliance
- Respect robots.txt
- Implement rate limiting
- Add proper attribution
- Handle copyright notices

## 10. Testing Strategy

### 10.1 Unit Tests
- Component rendering tests
- Redux action/reducer tests
- Utility function tests
- API service tests

### 10.2 Integration Tests
- Navigation flow tests
- Audio player integration
- Search functionality
- Data persistence

### 10.3 E2E Tests
- Complete user journeys
- Cross-platform compatibility
- Performance benchmarks
- Accessibility testing

## 11. Deployment Strategy

### 11.1 Development Environment
- React Native CLI
- Metro bundler
- iOS Simulator / Android Emulator
- Hot reloading

### 11.2 Production Build
- Code signing setup
- Bundle optimization
- Asset optimization
- Environment configuration

### 11.3 App Store Deployment
- App Store Connect setup
- Google Play Console setup
- Screenshots and metadata
- Beta testing with TestFlight/Internal Testing
