# Runbook: GrqaserApp distribution (iOS / Android)

Steps and requirements for building GrqaserApp and submitting to the store or distributing internally (TestFlight, Play internal, or direct install). See [GrqaserApp build and signing](../architecture/grqaserapp-build-and-signing.md) and [testing and deployment strategy](../architecture/testing-and-deployment-strategy.md).

## Prerequisites

- **Node:** LTS (e.g. Node 22 per `GrqaserApp/package.json` engines).
- **iOS:** macOS, Xcode, CocoaPods. Run `cd GrqaserApp/ios && pod install` (or `pod install` from `GrqaserApp`).
- **Android:** Android Studio, Android SDK, JDK. Set `ANDROID_HOME` and ensure `adb` is on `PATH`.

## Build from repo (debug)

From repo root:

```bash
cd GrqaserApp && npm ci
npm run ios    # macOS only
npm run android
```

From `GrqaserApp/`:

```bash
npm run ios
npm run android
```

Debug builds use default debug configuration unless overridden.

## Signing and environment

### iOS

- **Signing:** Open `GrqaserApp/ios/GrqaserApp.xcworkspace` in Xcode → select app target → **Signing & Capabilities**. Use a Development or Distribution (App Store / Ad Hoc) team and provisioning profile.
- **Env:** Use `react-native-config` or `.env` (if configured) for API base URLs or feature flags. For archive/TestFlight, use a release scheme and ensure the archive uses the correct signing identity and provisioning profile.

### Android

- **Signing (release):** Create or use a release keystore. In `android/app/build.gradle` set `signingConfigs.release` (storeFile, storePassword, keyAlias, keyPassword). Do **not** commit passwords; use env vars or a local `keystore.properties` (gitignored). Debug builds use `android/app/debug.keystore` by default.
- **Env:** Same as iOS for API/feature flags.

## Store submission and internal distribution

### iOS: TestFlight / App Store

1. **Archive:** In Xcode, **Product → Archive**. Use the release scheme and the correct signing identity and provisioning profile.
2. **Upload:** In Organizer (**Window → Organizer**), select the archive → **Distribute App** → **App Store Connect** (or **Ad Hoc** for internal-only devices).
3. **TestFlight:** After upload, the build appears in App Store Connect. Internal testing does not require App Review; external testing may require review.
4. **App Store:** When ready, submit the build from App Store Connect for review and release.

### Android: Play internal / direct install

1. **Release build:** From `GrqaserApp/android`: `./gradlew assembleRelease` (or equivalent from repo root if wired). Output: AAB or APK with release signing.
2. **Internal distribution:** Upload the AAB to Play Console → **Internal testing** track, or share the APK for direct install on devices.
3. **Play Store:** When ready, promote the build to production (or other tracks) from Play Console.

### Summary

| Platform | Build (debug) | Signing config | Internal / TestFlight |
|----------|----------------|----------------|------------------------|
| iOS      | `npm run ios`  | Xcode → Signing & Capabilities | Archive → Upload to App Store Connect |
| Android  | `npm run android` | `android/app/build.gradle` signingConfigs | `assembleRelease` → AAB/APK to Play internal or direct install |

## CI (optional)

Lint and test: from repo root `cd GrqaserApp && npm ci && npm run lint && npm test`. Native iOS/Android builds in CI require a macOS runner (iOS) and Android SDK (Android); see [testing and deployment strategy](../architecture/testing-and-deployment-strategy.md).

## Catalog DB and data (Epic 8)

Document the public URL for catalog DB downloads and any default/bundled DB in your deployment docs or in [GrqaserApp data integration and audio](../architecture/grqaserapp-data-integration-and-audio.md). Document storage allocation and cleanup procedures for users where applicable.
