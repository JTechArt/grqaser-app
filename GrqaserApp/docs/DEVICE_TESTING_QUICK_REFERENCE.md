# Device Testing Quick Reference

## 🚀 Quick Start Commands

### Initial Setup
```bash
# Run the automated setup script
./setup-dev.sh

# Or manual setup
npm install
cd ios && pod install && cd ..  # macOS only
```

### Development Commands
```bash
# Start Metro bundler
npm start

# Run on Android device/emulator
npm run android

# Run on iOS device/simulator (macOS only)
npm run ios

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 📱 Device Connection

### Android Device
1. **Enable Developer Options**
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect Device**
   ```bash
   adb devices  # Should show your device
   ```

3. **Install & Run**
   ```bash
   npm run android
   ```

### iOS Device (macOS only)
1. **Trust Computer**
   - Connect device via USB
   - Trust this computer on device
   - Settings → General → Device Management → Trust certificate

2. **Build & Run**
   ```bash
   npm run ios
   ```

## 🔧 Debug Commands

### Metro Bundler
```bash
# Start with cache reset
npx react-native start --reset-cache

# Start on specific port
npx react-native start --port 8081
```

### Device Debug Menu
- **Shake device** or press `Cmd+D` (iOS) / `Cmd+M` (Android)
- **Reload**: Refresh app
- **Debug**: Open React Native Debugger
- **Performance Monitor**: Show FPS/memory
- **Show Inspector**: Inspect UI elements

### Common Debug Commands
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear watchman cache
watchman watch-del-all

# Clean Android build
cd android && ./gradlew clean && cd ..

# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Restart ADB
adb kill-server && adb start-server
```

## 📦 Build Commands

### Android Release Build
```bash
# Build release APK
cd android && ./gradlew assembleRelease && cd ..

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### iOS Archive Build
1. Open `ios/GrqaserApp.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Follow distribution wizard

## 🧪 Testing Checklist

### Core Functionality
- [ ] App launches without crashes
- [ ] Navigation works between screens
- [ ] Book search functionality
- [ ] Audio player controls
- [ ] Offline mode works
- [ ] Background audio playback

### Performance
- [ ] App startup < 3 seconds
- [ ] Smooth scrolling
- [ ] Audio playback without stuttering
- [ ] Memory usage reasonable
- [ ] Battery usage acceptable

### UI/UX
- [ ] All screen sizes supported
- [ ] Dark/light mode switching
- [ ] Touch interactions responsive
- [ ] Loading states display correctly
- [ ] Error messages clear

## 🔍 Troubleshooting

### Common Issues

#### Metro Bundler Issues
```bash
# Clear all caches
npx react-native start --reset-cache
watchman watch-del-all
rm -rf node_modules && npm install
```

#### Android Build Issues
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
cd android && ./gradlew assembleDebug && cd ..
```

#### iOS Build Issues
```bash
# Reinstall pods
cd ios && pod deintegrate && pod install && cd ..
```

#### Device Connection Issues
```bash
# Check device connection
adb devices  # Android
xcrun devicectl list devices  # iOS

# Restart ADB
adb kill-server && adb start-server
```

### Performance Issues
- Use React DevTools Profiler
- Monitor component re-renders
- Check for memory leaks
- Optimize images and assets

## 📊 Monitoring Tools

### React Native Debugger
```bash
# Install globally
npm install -g react-native-debugger

# Run
react-native-debugger
```

### Flipper (Recommended)
- Download from: https://fbflipper.com/
- Connect to your app for advanced debugging

### Performance Monitoring
```bash
# Enable performance monitoring
npx react-native run-android --variant=release --enable-profiler
```

## 🚀 Hot Reload

### Enable Hot Reload
1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Enable Hot Reloading"
3. Changes will automatically reload

### Hot Reload Issues
```bash
# Restart Metro with cache reset
npx react-native start --reset-cache
```

## 📱 Device-Specific Notes

### Android
- Test on API level 21+ (Android 5.0+)
- Enable "Install via USB" in Developer Options
- Check USB debugging is enabled

### iOS
- Test on iOS 12+
- Trust developer certificate in Settings
- Check device is unlocked when building

## 🔄 Continuous Development

### Workflow
1. Make code changes
2. Save file (auto-reload if hot reload enabled)
3. Test on device
4. Debug if needed
5. Repeat

### Best Practices
- Test on physical devices regularly
- Use different screen sizes
- Test with different network conditions
- Monitor performance metrics
- Keep dependencies updated

---

## 📞 Quick Help

### Documentation
- Full Guide: `docs/APP_DEVELOPMENT_GUIDE.md`
- React Native: https://reactnative.dev/
- React Navigation: https://reactnavigation.org/

### Community
- Stack Overflow: https://stackoverflow.com/questions/tagged/react-native
- Discord: https://discord.gg/reactiflux

**Happy testing! 🚀📱**
