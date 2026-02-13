# Grqaser - Audiobook Mobile Application

A React Native mobile application for accessing audiobooks from [grqaser.org](https://grqaser.org), providing a native mobile experience for Armenian and international literature.

## 🎯 Project Overview

Grqaser (meaning "book lover" in Armenian) is a mobile application that brings the rich collection of audiobooks from grqaser.org to mobile devices. The app features:

- 📚 Browse 950+ audiobooks and 217+ e-books
- 🎧 High-quality audio streaming
- 🔍 Advanced search and filtering
- ⭐ Rating and review system
- 💾 Offline favorites and progress tracking
- 🌙 Dark/Light theme support
- 🔄 Background audio playback

## 🏗️ Architecture

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

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/grqaser.git
   cd grqaser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install crawler dependencies**
   ```bash
   cd crawler
   npm install
   cd ..
   ```

4. **Run the crawler (optional)**
   ```bash
   cd crawler
   npm start
   ```

5. **Start the React Native app**
   ```bash
   # Start Metro bundler
   npm start
   
   # Run on Android
   npm run android
   
   # Run on iOS (macOS only)
   npm run ios
   ```

## 📁 Project Structure

```
grqaser/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Common components (Button, Input, etc.)
│   │   ├── audio/          # Audio player components
│   │   └── book/           # Book-related components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API and external services
│   ├── store/              # Redux store and slices
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── constants/          # App constants
├── crawler/                # Data crawling scripts
│   ├── grqaser-crawler.js  # Main crawler
│   ├── data/               # Crawled data storage
│   └── package.json        # Crawler dependencies
├── assets/                 # Images, fonts, etc.
├── android/                # Android-specific files
├── ios/                    # iOS-specific files
└── docs/                   # Documentation
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm start              # Start Metro bundler
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run test          # Run tests
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript check

# Building
npm run build:android # Build Android APK
npm run build:ios     # Build iOS app

# Crawler
cd crawler
npm start             # Run crawler
npm run analyze       # Analyze crawled data
```

### Code Style

This project follows:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **React Native** best practices
- **Redux Toolkit** for state management

## 📱 Features

### Core Features
- [x] Book browsing and search
- [x] Audio player with background support
- [x] Favorites and progress tracking
- [x] Category filtering
- [x] Rating system
- [x] Offline support for favorites

### Planned Features
- [ ] User authentication
- [ ] Download for offline listening
- [ ] Social sharing
- [ ] Push notifications
- [ ] Multi-language support
- [ ] Accessibility improvements

## 🗄️ Data Models

### Book Model
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
  language: 'hy' | 'en' | 'ru';
  isFavorite: boolean;
  playProgress: number; // 0-100
  lastPlayedAt?: Date;
}
```

## 🔍 Data Crawling

The crawler extracts data from grqaser.org in a respectful manner:

- **Rate limiting**: 2-second delays between requests
- **User agent identification**: Clear bot identification
- **Resource filtering**: Blocks unnecessary resources
- **Error handling**: Graceful failure handling

### Running the Crawler

```bash
cd crawler
npm install
npm start
```

The crawler will:
1. Analyze the website structure
2. Extract book metadata
3. Find audio file URLs
4. Save data to JSON files
5. Generate a detailed report

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- BookCard.test.tsx
```

## 📦 Building for Production

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS
```bash
cd ios
xcodebuild -workspace Grqaser.xcworkspace -scheme Grqaser -configuration Release
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [grqaser.org](https://grqaser.org) for providing the audiobook content
- React Native community for the excellent framework
- All contributors and supporters

## 📞 Support

- **Email**: info@grqaser.org
- **Website**: https://grqaser.org
- **Issues**: [GitHub Issues](https://github.com/your-username/grqaser/issues)

## 🔮 Roadmap

### Phase 1 (Current)
- [x] Project setup and architecture
- [x] Data crawling implementation
- [x] Basic React Native app structure
- [ ] Core UI components
- [ ] Audio player integration

### Phase 2
- [ ] Search and filtering
- [ ] User authentication
- [ ] Favorites system
- [ ] Offline support

### Phase 3
- [ ] Advanced features
- [ ] Performance optimization
- [ ] App store deployment
- [ ] User feedback integration

---

**Note**: This project is developed with respect for the original content creators and follows ethical web scraping practices. Please ensure compliance with grqaser.org's terms of service and copyright laws.
