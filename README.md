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

The repo has **two runnable applications**: **books-admin-app** (single admin app: crawler + API + web UI, SQLite) and **GrqaserApp** (React Native mobile app). The mobile app consumes the books-admin-app API. Standalone crawler and database-viewer are archived; all admin behavior is in books-admin-app. See `docs/architecture/` and `docs/parity-books-admin-app.md`.

```
┌─────────────────┐         ┌─────────────────────────────┐
│   GrqaserApp    │         │   books-admin-app           │
│   (React Native)│◄───────►│   (crawler + API + web UI)   │
└─────────────────┘   API   └──────────────┬──────────────┘
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌─────────────────┐
│   Local Storage │              │ SQLite + grqaser │
│   (AsyncStorage)│              │ .org (crawl)     │
└─────────────────┘              └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- React Native CLI (for mobile app)
- Android Studio / Xcode for device builds
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/grqaser.git
   cd grqaser
   ```

2. **Admin app (crawler + API + web UI)** — single entrypoint for data and API
   ```bash
   npm run admin:start
   # or: cd books-admin-app && npm install && npm start
   ```
   Default: http://localhost:3001. Use the web UI to start/stop crawler, view books, manage DB. See `books-admin-app/README.md`.

3. **Mobile app**
   ```bash
   cd GrqaserApp
   npm install
   npm start          # Metro bundler
   npm run android    # or npm run ios
   ```
   GrqaserApp uses the books-admin-app API (default `http://localhost:3001/api/v1`). Set `API_BASE_URL` in `.env` if the admin app runs elsewhere.

## 📁 Project structure

```
grqaser/
├── books-admin-app/   # Single admin app — crawler, API, web UI (see books-admin-app/README.md)
├── GrqaserApp/        # React Native mobile app (see GrqaserApp/README.md)
├── archive/           # Legacy: crawler, database-viewer (archived; no standalone runbooks)
│   ├── crawler/
│   └── database-viewer/
├── docs/              # Architecture, PRD, stories, design
└── package.json       # Root scripts: npm run admin:start, admin:test, admin:dev
```

## 🔧 Development

- **books-admin-app**: From repo root run `npm run admin:start`, `npm run admin:test`, `npm run admin:dev`; or from `books-admin-app/` run `npm start`, `npm test`, `npm run dev`.
- **GrqaserApp**: From `GrqaserApp/` run `npm start`, `npm run android` / `npm run ios`, `npm test`, `npm run lint`.

There are **no runbooks for running crawler or database-viewer as separate apps**; all admin behavior is in books-admin-app.

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
 Currently in consideration for future updates
- User authentication
- Download for offline listening
- Social sharing
- Push notifications
- Multi-language support (beyond current Armenian/English/Russian)
- Accessibility improvements

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

## 🔍 Data crawling (books-admin-app)

Crawler behavior runs **from books-admin-app** (start/stop and config via the app). The crawler extracts data from grqaser.org with rate limiting, clear user-agent, and error handling. Data is written to SQLite; the same app serves the API and web UI.

**Run the crawler:** Start books-admin-app (`npm run admin:start`), then use the web UI or `POST /api/v1/crawler/start`. See `books-admin-app/README.md` and `docs/architecture/books-admin-app-architecture.md`.

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

### Completed Features
- [x] Project setup and architecture
- [x] Data crawling implementation
- [x] Basic React Native app structure
- Core UI components
- Audio player integration

### Currently Available Features
- Search and filtering
- User authentication
- Favorites system
- Offline support

### Future Roadmap
- Advanced features
- Performance optimization
- App store deployment
- User feedback integration

---

**Note**: This project is developed with respect for the original content creators and follows ethical web scraping practices. Please ensure compliance with grqaser.org's terms of service and copyright laws.
### Future Roadmap
The Grqaser app is fully functional and production-ready. Future enhancements may include:
- Enhanced user authentication and personalization
- Expanded offline capabilities
- Social sharing and community features
- Multi-language support expansion
- Accessibility improvements
- Performance optimizations and new content categories

---
