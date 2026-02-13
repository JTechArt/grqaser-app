# Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Data Crawling Issues

#### Issue: "socket hang up" Error
**Symptoms**: Browser initialization fails with connection errors
**Solution**:
```javascript
// Update browser launch options
this.browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
});
```

#### Issue: No Books Found
**Symptoms**: Crawler runs but finds 0 books
**Solution**:
1. Check website structure changes
2. Update CSS selectors
3. Verify network connectivity
4. Check for rate limiting

#### Issue: Search Functionality Fails
**Symptoms**: Search input not found
**Solution**:
```javascript
// Update search selectors
const searchInput = await this.page.$('input[type="text"], input[placeholder*="search"], .search-input');
```

### React Native Issues

#### Issue: Node.js Version Compatibility
**Symptoms**: npm warnings about engine requirements
**Solution**:
```bash
# Update Node.js to v18 or higher
nvm install 18
nvm use 18
```

#### Issue: Metro Bundler Issues
**Symptoms**: App won't start or build fails
**Solution**:
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### Issue: iOS Build Fails
**Symptoms**: Xcode build errors
**Solution**:
```bash
# Clean iOS build
cd ios
rm -rf build
pod install
cd ..

# Rebuild
npx react-native run-ios
```

#### Issue: Android Build Fails
**Symptoms**: Gradle build errors
**Solution**:
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Rebuild
npx react-native run-android
```

### Audio Player Issues

#### Issue: Audio Won't Play
**Symptoms**: No audio output
**Solution**:
1. Check audio permissions
2. Verify audio file URLs
3. Check device volume
4. Test with different audio formats

#### Issue: Background Audio Not Working
**Symptoms**: Audio stops when app goes to background
**Solution**:
```javascript
// iOS: Add to Info.plist
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>

// Android: Add to AndroidManifest.xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

#### Issue: Audio Interruptions
**Symptoms**: Audio stops during calls or notifications
**Solution**:
```javascript
// Handle audio interruptions
TrackPlayer.addEventListener('remote-pause', () => {
  // Handle pause
});

TrackPlayer.addEventListener('remote-play', () => {
  // Handle play
});
```

### Performance Issues

#### Issue: App Slow to Load
**Symptoms**: Long app startup time
**Solution**:
1. Optimize bundle size
2. Implement lazy loading
3. Use image optimization
4. Reduce initial data load

#### Issue: Memory Leaks
**Symptoms**: App becomes slow over time
**Solution**:
1. Check for memory leaks in components
2. Implement proper cleanup
3. Use React.memo for expensive components
4. Monitor memory usage

#### Issue: Battery Drain
**Symptoms**: High battery consumption
**Solution**:
1. Optimize audio player
2. Reduce network requests
3. Implement efficient caching
4. Monitor background processes

## 🔧 Development Environment Issues

### Issue: React Native CLI Not Found
**Solution**:
```bash
npm install -g @react-native-community/cli
```

### Issue: Android Studio Setup
**Solution**:
1. Install Android Studio
2. Configure Android SDK
3. Set up environment variables
4. Create Android Virtual Device

### Issue: Xcode Setup (macOS)
**Solution**:
1. Install Xcode from App Store
2. Install Xcode Command Line Tools
3. Accept Xcode license
4. Configure iOS Simulator

## 📱 Platform-Specific Issues

### iOS Issues

#### Issue: iOS Simulator Not Working
**Solution**:
```bash
# Reset iOS Simulator
xcrun simctl erase all

# Reinstall app
npx react-native run-ios
```

#### Issue: iOS Permissions
**Solution**:
```xml
<!-- Add to Info.plist -->
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for audio features</string>
```

### Android Issues

#### Issue: Android Emulator Slow
**Solution**:
1. Enable hardware acceleration
2. Increase RAM allocation
3. Use x86 emulator
4. Enable GPU acceleration

#### Issue: Android Permissions
**Solution**:
```xml
<!-- Add to AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## 🐛 Debugging Tips

### Enable Debug Logging
```javascript
// Add to crawler
console.log('Debug info:', data);

// Add to React Native
console.log('Debug info:', data);
```

### Use React Native Debugger
```bash
# Install React Native Debugger
brew install --cask react-native-debugger

# Start debugger
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

### Check Network Requests
```javascript
// Monitor network requests in crawler
this.page.on('request', request => {
  console.log('Request:', request.url());
});

this.page.on('response', response => {
  console.log('Response:', response.url(), response.status());
});
```

## 📞 Getting Help

### Useful Resources
- [React Native Documentation](https://reactnative.dev/)
- [Puppeteer Documentation](https://pptr.dev/)
- [React Native Track Player](https://react-native-track-player.js.org/)
- [Stack Overflow](https://stackoverflow.com/)

### Common Commands
```bash
# Check React Native version
npx react-native --version

# Check Node.js version
node --version

# Check npm version
npm --version

# List installed packages
npm list

# Check for outdated packages
npm outdated

# Update packages
npm update
```

## 🔍 Performance Monitoring

### Monitor App Performance
```javascript
// Add performance monitoring
import { PerformanceObserver } from 'perf_hooks';

const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
obs.observe({ entryTypes: ['measure'] });
```

### Monitor Memory Usage
```javascript
// Check memory usage
const used = process.memoryUsage();
console.log(`Memory usage: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);
```

---
**Last Updated**: August 24, 2025  
**Maintained By**: Grqaser Development Team
