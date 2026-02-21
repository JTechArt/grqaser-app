# GrqaserApp: Build and signing (iOS / Android)

How to build and run GrqaserApp from the repo, and how to configure signing and environment for TestFlight or internal distribution. See [testing and deployment strategy](./testing-and-deployment-strategy.md).

## Build from repo

### Prerequisites

- **Node:** LTS (e.g. Node 22 per `GrqaserApp/package.json` engines).
- **iOS:** macOS, Xcode, CocoaPods. Run `cd GrqaserApp/ios && pod install` (or `pod install` from `GrqaserApp` if your setup runs it there).
- **Android:** Android Studio, Android SDK, JDK. Set `ANDROID_HOME` and ensure `adb` is on `PATH`.

### Commands

From repo root:

```bash
# Install dependencies
cd GrqaserApp && npm ci

# iOS (macOS only)
npm run ios
# Or: npx react-native run-ios

# Android
npm run android
# Or: npx react-native run-android
```

From `GrqaserApp/` directly:

```bash
npm run ios
npm run android
```

Builds use the default debug configuration unless overridden (e.g. scheme/signature for release).

## Signing and env for TestFlight / internal distribution

### iOS

- **Signing:** Configure in Xcode: open `GrqaserApp/ios/GrqaserApp.xcworkspace`, select the app target → Signing & Capabilities. Use a Development or Distribution (App Store / Ad Hoc) team and provisioning profile.
- **Env:** Use `react-native-config` or `.env` (if configured) for API base URLs or feature flags. For archive/TestFlight, use a release scheme and ensure the archive uses the correct signing identity and provisioning profile.
- **TestFlight:** Archive via Xcode (Product → Archive), then upload to App Store Connect (Organizer → Distribute App). Internal testing does not require App Review.

### Android

- **Signing:** For debug, the default `android/app/debug.keystore` is used. For release (internal or Play Store), create or use a release keystore and set `android/app/build.gradle` with `signingConfigs.release` (storeFile, storePassword, keyAlias, keyPassword). Do not commit passwords; use env vars or a local `keystore.properties` (gitignored).
- **Env:** Same as iOS for API/feature flags. Build release with `cd android && ./gradlew assembleRelease` (or the equivalent from root if wired).
- **Internal distribution:** Build an AAB or APK with the release signing config; share via internal track in Play Console or direct APK install.

### Summary

| Platform | Build (debug) | Signing config | Internal / TestFlight |
|----------|----------------|----------------|------------------------|
| iOS      | `npm run ios`  | Xcode → Signing & Capabilities | Archive → Upload to App Store Connect |
| Android  | `npm run android` | `android/app/build.gradle` signingConfigs | `assembleRelease` → AAB/APK to Play internal or direct install |

Document the public URL for catalog DB downloads and any default/bundled DB in the same runbooks or in [grqaserapp-data-integration-and-audio](./grqaserapp-data-integration-and-audio.md).
