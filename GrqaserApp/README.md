# Grqaser - Book Lover Audiobook App

A modern React Native audiobook application for Armenian literature, featuring a comprehensive book library, advanced audio player, and beautiful user interface.

## 🚀 Features

### 📚 Book Management

- **Extensive Library**: Access to 500+ Armenian audiobooks and e-books
- **Smart Search**: Search by title, author, or description
- **Categories**: Browse books by genre and type
- **Favorites**: Save and organize your favorite books
- **Recently Played**: Quick access to your listening history

### 🎧 Advanced Audio Player

- **Full Audio Controls**: Play, pause, skip, rewind, fast-forward
- **Chapter Navigation**: Jump between chapters with ease
- **Playback Speed**: Adjust speed from 0.5x to 2x
- **Sleep Timer**: Set automatic stop timer
- **Background Playback**: Continue listening while using other apps
- **Progress Tracking**: Resume from where you left off
- **Visualization**: Audio waveform display

### 🎨 Beautiful UI/UX

- **Modern Design**: Clean, intuitive interface with gradient themes
- **Responsive Layout**: Optimized for all screen sizes
- **Dark/Light Mode**: Automatic theme switching
- **Smooth Animations**: Fluid transitions and interactions
- **Accessibility**: Full screen reader support

### 🔧 Technical Features

- **Offline Support**: Download books for offline listening
- **Data Sync**: Cloud synchronization of progress and favorites
- **Performance Optimized**: Fast loading and smooth playback
- **Error Handling**: Robust error recovery and user feedback
- **Analytics**: Track listening habits and preferences

## 📱 Screenshots

### Home Screen

![Home Screen](mock-pages/index.html)

- Featured books grid
- Quick search functionality
- Category browsing
- Statistics overview

### Book Detail

![Book Detail](mock-pages/book-detail.html)

- Comprehensive book information
- Chapter list with progress
- Audio controls
- Reading progress

### Audio Player

![Audio Player](mock-pages/audio-player.html)

- Full-screen player interface
- Advanced controls
- Speed adjustment
- Sleep timer

### Library

![Library](mock-pages/library.html)

- Personal book collection
- Recently played
- Downloaded books
- Category organization

## 🛠️ Technology Stack

### Frontend

- **React Native 0.72.6**: Cross-platform mobile development
- **TypeScript**: Type-safe development
- **Redux Toolkit**: State management
- **React Navigation v6**: Navigation and routing
- **React Native Track Player**: Audio playback
- **React Native Paper**: Material Design components
- **React Native Elements**: Additional UI components

### Backend Integration

- **Axios**: HTTP client for API communication
- **RESTful API**: Integration with grqaser.org
- **Local Storage**: AsyncStorage for offline data
- **File System**: Download and cache management

### Development Tools

- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **Metro**: React Native bundler

## 📦 Installation

### Prerequisites

- Node.js 16+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Quick Setup

#### Automated Setup (Recommended)

```bash
# Run the automated setup script
./setup-dev.sh
```

#### Manual Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/grqaser-app.git
   cd grqaser-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **iOS Setup** (macOS only)

   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

5. **Run on device/simulator**

   ```bash
   # Android
   npm run android

   # iOS
   npm run ios
   ```

### Device testing

Use the build script for device builds and tests:

#### Quick device commands

```bash
# Build and run on Android device
./build-and-test.sh dev-android

# Build and run on iOS device (macOS only)
./build-and-test.sh dev-ios

# Build release APK
./build-and-test.sh release-android

# Run tests
./build-and-test.sh test
```

## 🏗️ Project Structure

```
GrqaserApp/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BookCard.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── MiniPlayer.tsx
│   │   └── TrackPlayerProvider.tsx
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── PlayerScreen.tsx
│   │   ├── BookDetailScreen.tsx
│   │   └── ...
│   ├── navigation/          # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   └── types.ts
│   ├── store/               # Redux store and slices
│   │   ├── index.ts
│   │   ├── slices/
│   │   │   ├── booksSlice.ts
│   │   │   ├── playerSlice.ts
│   │   │   └── userSlice.ts
│   ├── services/            # API and external services
│   │   ├── booksApi.ts
│   │   └── audioService.ts
│   ├── utils/               # Utility functions
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── book.ts
│   │   └── navigation.ts
│   ├── theme/               # App theming
│   │   └── index.ts
│   └── assets/              # Images, fonts, etc.
├── mock-pages/              # HTML mockups for design reference
├── __tests__/               # Test files
├── android/                 # Android-specific files
├── ios/                     # iOS-specific files
└── package.json
```

## 🎯 Key Components

### BookCard Component

- Displays book information in a card format
- Supports compact and full-size layouts
- Shows progress indicators and ratings
- Handles touch interactions

### Audio Player

- Full-featured audio playback controls
- Background audio support
- Progress tracking and resume functionality
- Speed control and sleep timer

### Navigation

- Bottom tab navigation for main sections
- Stack navigation for detailed views
- Type-safe navigation with TypeScript

### State Management

- Redux Toolkit for global state
- Separate slices for books, player, and user data
- Async thunks for API calls
- Persistent storage integration

## 🔌 API Integration

The app integrates with the grqaser.org API and includes fallback mechanisms:

### Primary API

- **Base URL**: `https://grqaser.org/api`
- **Endpoints**: Books, categories, search, user data
- **Authentication**: Optional user accounts

### Fallback System

- Local data storage for offline access
- Crawler data integration for development
- Graceful error handling and retry logic

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Component Tests

```bash
npm run test:components
```

### E2E Tests

```bash
npm run test:e2e
```

## 📊 Performance

### Optimization Features

- **Image Caching**: FastImage for optimized image loading
- **Lazy Loading**: Progressive content loading
- **Memory Management**: Efficient audio resource handling
- **Bundle Optimization**: Code splitting and tree shaking

### Metrics

- **App Size**: < 50MB
- **Startup Time**: < 3 seconds
- **Audio Latency**: < 100ms
- **Memory Usage**: < 200MB

## 🔒 Security & Privacy

### Data Protection

- **Local Storage**: Secure storage of user preferences
- **API Security**: HTTPS-only communication
- **User Privacy**: No personal data collection
- **Permissions**: Minimal required permissions

### Permissions Required

- **Storage**: Download and cache books
- **Audio**: Background audio playback
- **Network**: Internet access for streaming

## 🚀 Deployment

### Android

1. Generate signed APK
2. Upload to Google Play Console
3. Configure release settings
4. Submit for review

### iOS

1. Archive the project
2. Upload to App Store Connect
3. Configure app metadata
4. Submit for review

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier
- Write comprehensive tests
- Document new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **grqaser.org**: For providing the audiobook content
- **React Native Community**: For the excellent framework
- **Contributors**: All who have helped improve the app

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/grqaser-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/grqaser-app/discussions)
- **Email**: support@grqaser-app.com

## 🔄 Changelog

### Version 1.0.0 (Current)

- Initial release
- Core audiobook functionality
- Modern UI design
- Offline support
- Performance optimizations

---

**Grqaser** - Bringing Armenian literature to your fingertips, one audiobook at a time. 📚🎧
