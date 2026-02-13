# GrqaserApp Development & Testing Guide

## 📱 Device Testing & Installation Guide

This guide covers everything you need to know to develop, test, and install the GrqaserApp on your physical device for real-world testing.

## 🛠️ Development Environment Setup

### Prerequisites

#### Required Software
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **React Native CLI** - `npm install -g react-native-cli`
- **Git** - [Download here](https://git-scm.com/)

#### Platform-Specific Requirements

##### For Android Development
- **Android Studio** - [Download here](https://developer.android.com/studio)
- **Android SDK** (API level 21+)
- **Java Development Kit (JDK)** 11 or newer
- **Android Virtual Device (AVD)** or physical Android device

##### For iOS Development (macOS only)
- **Xcode** 14+ - [Download from App Store](https://apps.apple.com/app/xcode/id497799835)
- **iOS Simulator** or physical iOS device
- **CocoaPods** - `sudo gem install cocoapods`

### Environment Variables Setup

Create a `.env` file in the `GrqaserApp` directory:

```bash
# API Configuration
API_BASE_URL=https://grqaser.org/api
API_TIMEOUT=30000

# App Configuration
APP_NAME=Grqaser
APP_VERSION=1.0.0
BUILD_NUMBER=1

# Development Settings
DEBUG_MODE=true
ENABLE_LOGGING=true
ENABLE_ANALYTICS=false

# Audio Configuration
AUDIO_CACHE_SIZE=500MB
MAX_DOWNLOAD_SIZE=1GB
```

## 📱 Device Testing Setup

### Android Device Testing

#### 1. Enable Developer Options
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Enable **Install via USB**

#### 2. Connect Device
```bash
# Check if device is recognized
adb devices

# Should show something like:
# List of devices attached
# ABC123DEF456    device
```

#### 3. Install and Run
```bash
cd GrqaserApp

# Install dependencies
npm install

# Start Metro bundler
npm start

# In another terminal, run on device
npm run android
```

### iOS Device Testing

#### 1. Device Setup
1. Connect your iOS device via USB
2. Trust the computer on your device
3. Open **Settings** → **General** → **Device Management**
4. Trust your developer certificate

#### 2. Xcode Configuration
```bash
cd GrqaserApp/ios

# Install CocoaPods dependencies
pod install

# Open in Xcode
open GrqaserApp.xcworkspace
```

#### 3. Build and Run
```bash
# From project root
npm run ios

# Or from Xcode:
# 1. Select your device from the device dropdown
# 2. Click the Play button
```

## 🔧 Development Workflow

### 1. Start Development Server
```bash
cd GrqaserApp
npm start
```

### 2. Run on Device
```bash
# Android
npm run android

# iOS
npm run ios
```

### 3. Hot Reload
- Shake your device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
- Select **Enable Hot Reloading**
- Changes will automatically reload

### 4. Debug Menu
- **Reload**: Refresh the app
- **Debug**: Open React Native Debugger
- **Performance Monitor**: Show FPS and memory usage
- **Show Inspector**: Inspect UI elements

## 📦 Building for Distribution

### Android APK Build

#### 1. Generate Keystore
```bash
cd GrqaserApp/android/app

keytool -genkeypair -v -storetype PKCS12 -keystore grqaser-release-key.keystore -alias grqaser-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. Configure Signing
Edit `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=grqaser-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=grqaser-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

#### 3. Build Release APK
```bash
cd GrqaserApp

# Clean build
cd android && ./gradlew clean && cd ..

# Build release APK
cd android && ./gradlew assembleRelease && cd ..

# APK will be in: android/app/build/outputs/apk/release/app-release.apk
```

### iOS Archive Build

#### 1. Configure Signing in Xcode
1. Open `GrqaserApp.xcworkspace`
2. Select project → Signing & Capabilities
3. Choose your Team and Bundle Identifier
4. Ensure "Automatically manage signing" is checked

#### 2. Archive Build
```bash
# From Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Follow distribution wizard
```

## 🧪 Testing Strategies

### 1. Manual Testing Checklist

#### Core Functionality
- [ ] App launches without crashes
- [ ] Navigation between screens works
- [ ] Book search functionality
- [ ] Audio player controls
- [ ] Offline mode works
- [ ] Background audio playback

#### UI/UX Testing
- [ ] All screen sizes supported
- [ ] Dark/light mode switching
- [ ] Touch interactions responsive
- [ ] Loading states display correctly
- [ ] Error messages are clear

#### Performance Testing
- [ ] App startup time < 3 seconds
- [ ] Smooth scrolling in book lists
- [ ] Audio playback without stuttering
- [ ] Memory usage stays reasonable
- [ ] Battery usage is acceptable

### 2. Automated Testing

#### Unit Tests
```bash
npm test
```

#### Component Tests
```bash
npm run test:components
```

#### E2E Tests (if configured)
```bash
npm run test:e2e
```

### 3. Device-Specific Testing

#### Android Testing
- Test on different Android versions (API 21+)
- Test on different screen sizes
- Test with different network conditions
- Test with low memory scenarios

#### iOS Testing
- Test on different iOS versions (12+)
- Test on different device types (iPhone/iPad)
- Test with different network conditions
- Test with background app refresh settings

## 🔍 Debugging Tools

### 1. React Native Debugger
```bash
# Install
npm install -g react-native-debugger

# Run
react-native-debugger
```

### 2. Flipper (Recommended)
```bash
# Install Flipper
# Download from: https://fbflipper.com/

# Add to your app for advanced debugging
```

### 3. Console Logging
```javascript
// In your components
console.log('Debug info:', data);
console.warn('Warning message');
console.error('Error message');
```

### 4. Performance Monitoring
```bash
# Enable performance monitoring
npx react-native run-android --variant=release
```

## 📊 Performance Monitoring

### 1. Bundle Analyzer
```bash
# Analyze bundle size
npx react-native-bundle-visualizer
```

### 2. Memory Profiling
```bash
# Enable memory profiling
npx react-native run-android --variant=release --enable-profiler
```

### 3. Network Monitoring
- Use Chrome DevTools Network tab
- Monitor API response times
- Check for unnecessary requests

## 🚀 Deployment Checklist

### Pre-Release Testing
- [ ] All features work on physical devices
- [ ] Performance meets requirements
- [ ] No critical bugs or crashes
- [ ] Offline functionality tested
- [ ] Audio playback tested thoroughly
- [ ] UI/UX approved
- [ ] Accessibility features tested

### Release Preparation
- [ ] Update version numbers
- [ ] Update changelog
- [ ] Test release build
- [ ] Prepare store listings
- [ ] Create release notes
- [ ] Backup source code

### Store Submission
- [ ] Generate signed APK (Android)
- [ ] Archive iOS build
- [ ] Upload to respective stores
- [ ] Configure store metadata
- [ ] Submit for review

## 🔧 Troubleshooting

### Common Issues

#### Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear watchman cache
watchman watch-del-all
```

#### Android Build Issues
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..

# Clear Android cache
cd android && ./gradlew cleanBuildCache && cd ..
```

#### iOS Build Issues
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Reinstall pods
cd ios && pod deintegrate && pod install && cd ..
```

#### Device Connection Issues
```bash
# Restart ADB
adb kill-server && adb start-server

# Check device connection
adb devices
```

### Performance Issues

#### Memory Leaks
- Use React DevTools Profiler
- Monitor component re-renders
- Check for unmounted component updates

#### Slow Loading
- Implement lazy loading
- Optimize images
- Use FastImage component
- Implement proper caching

#### Audio Issues
- Check audio file formats
- Monitor audio buffer size
- Test with different audio qualities
- Check background audio permissions

## 📱 Device-Specific Optimizations

### Android Optimizations
- Enable ProGuard for release builds
- Use Android App Bundle (AAB)
- Optimize image assets
- Implement proper lifecycle management

### iOS Optimizations
- Enable bitcode for App Store
- Optimize for different device capabilities
- Implement proper memory management
- Use iOS-specific performance features

## 🔄 Continuous Integration

### GitHub Actions Setup
Create `.github/workflows/ci.yml`:
```yaml
name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run type-check
```

## 📚 Additional Resources

### Documentation
- [React Native Official Docs](https://reactnative.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)

### Tools
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)

### Community
- [React Native Community](https://github.com/react-native-community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)
- [Discord Reactiflux](https://discord.gg/reactiflux)

---

## 🎯 Quick Start Commands

```bash
# Clone and setup
git clone <repository-url>
cd GrqaserApp
npm install

# iOS setup (macOS only)
cd ios && pod install && cd ..

# Start development
npm start

# Run on device
npm run android  # or npm run ios

# Build for release
cd android && ./gradlew assembleRelease && cd ..  # Android
# Use Xcode for iOS archive
```

**Happy coding! 🚀📱**
