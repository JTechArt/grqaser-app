# iOS Development Setup Guide (macOS)

This guide walks you through setting up the iOS development environment to build and run the GrqaserApp React Native project on a Mac.

## Prerequisites

| Component | Required | Notes |
|---|---|---|
| macOS | Yes | iOS development requires macOS |
| Xcode | Yes | Includes iOS Simulator and build tools |
| Node.js 22+ | Yes | Project uses `.nvmrc` with `22` |
| CocoaPods | Yes | Required for native iOS dependencies |
| Watchman | Recommended | Better file watching for React Native |

## 1. Install Core Dependencies

### Xcode

Install Xcode from the App Store, then open it once and accept the license.

Install command line tools:

```bash
xcode-select --install
```

Verify:

```bash
xcodebuild -version
xcode-select -p
```

### Node.js 22

If you use `nvm`:

```bash
nvm install 22
nvm use 22
```

Verify:

```bash
node -v
npm -v
```

### CocoaPods

```bash
sudo gem install cocoapods
```

Verify:

```bash
pod --version
```

### Watchman (recommended)

```bash
brew install watchman
```

## 2. Install iOS Simulator Runtime (important)

If no runtime is installed, React Native cannot launch a simulator and fails with:

`error No simulator available with udid "undefined"`

Install runtime using one method:

### Method A: Xcode UI

1. Open Xcode
2. Go to **Xcode > Settings > Components**
3. Download an **iOS Simulator Runtime** (for example, iOS 26.x)

### Method B: Terminal

```bash
xcodebuild -downloadPlatform iOS
```

Note: this can download several GB.

Verify runtime/devices:

```bash
xcrun simctl list runtimes
xcrun simctl list devices available
```

## 3. Install Project Dependencies

From repo root:

```bash
cd GrqaserApp
npm install
cd ios
pod install
cd ..
```

## 4. Run the App on iOS Simulator

You can open Simulator first (optional):

```bash
open -a Simulator
```

Then run:

```bash
cd GrqaserApp
npm run ios
```

Run on a specific simulator model:

```bash
cd GrqaserApp
npx react-native run-ios --simulator "iPhone 16"
```

## 5. Run on a Physical iPhone (debug build)

1. Connect iPhone to Mac via USB
2. On iPhone, tap **Trust This Computer**
3. Open workspace in Xcode:

```bash
open GrqaserApp/ios/GrqaserApp.xcworkspace
```

4. In Xcode:
- Select target `GrqaserApp`
- Set a unique Bundle Identifier (Signing & Capabilities)
- Choose your Apple Team
- Select your connected iPhone as destination
- Press Run (triangle button)

If you see signing errors, allow Xcode to create provisioning profiles automatically.

CLI check for connected devices:

```bash
xcrun devicectl list devices
```

Notes:

- Free Apple ID can run debug builds on your own phone, but provisioning expires quickly (typically 7 days).
- Paid Apple Developer membership is required for TestFlight distribution.

## 6. Basic Test Checklist

After app launches, verify:

1. Home screen renders book list
2. Search screen opens and accepts input
3. Book detail opens from list
4. Audio player screen opens and controls render
5. App can go background/foreground without crash

## 7. Troubleshooting

### `No simulator available with udid "undefined"`

Install iOS Simulator runtime (Step 2), then rerun `npm run ios`.

### CocoaPods issues

```bash
cd GrqaserApp/ios
pod repo update
pod install
```

### Flipper/YogaKit build failures on newer Xcode

If you see errors mentioning `FlipperKit` compile failures or missing `YogaKit` files, disable Flipper and reinstall pods.

Check `GrqaserApp/ios/Podfile` has:

```ruby
flipper_config = FlipperConfiguration.disabled
```

Then run:

```bash
cd GrqaserApp/ios
pod install
cd ..
npm run ios
```

### Clean and rebuild

```bash
cd GrqaserApp/ios
xcodebuild clean
cd ..
rm -rf ~/Library/Developer/Xcode/DerivedData
npm run ios
```

### Reset Metro cache

```bash
cd GrqaserApp
npx react-native start --reset-cache
```

In another terminal:

```bash
cd GrqaserApp
npm run ios
```

### Simulator is broken/stuck

```bash
xcrun simctl shutdown all
xcrun simctl erase all
open -a Simulator
```

## 8. Next Step: TestFlight (simple path)

When debug build works on simulator/device:

1. Open `GrqaserApp/ios/GrqaserApp.xcworkspace` in Xcode
2. Select **Any iOS Device (arm64)**
3. **Product > Archive**
4. In Organizer, choose **Distribute App > App Store Connect > Upload**
5. In App Store Connect, add internal testers in TestFlight

You need:
- Apple Developer Program membership
- App record in App Store Connect
- Proper signing/certificates/profiles

## 9. TestFlight End-to-End Checklist

Use this once local simulator/device debug builds are already working.

1. Apple account setup
- Join Apple Developer Program (paid)
- Sign in to Xcode with the same Apple account
- Sign in to App Store Connect with same account

2. App Store Connect app record
- Go to **App Store Connect > My Apps > + New App**
- Fill app name, primary language, bundle ID, SKU
- Bundle ID must match Xcode target bundle identifier exactly

3. Xcode release archive
- Open `GrqaserApp/ios/GrqaserApp.xcworkspace`
- Select scheme `GrqaserApp`
- Select destination **Any iOS Device (arm64)**
- Use `Release` configuration
- Run **Product > Archive**

4. Upload archive
- In Organizer, select latest archive
- Click **Distribute App**
- Choose **App Store Connect > Upload**
- Keep default signing options unless you have custom profiles
- Wait for upload success

5. Enable internal testing
- In App Store Connect, open your app, then **TestFlight**
- Wait for build processing (usually 5-20 minutes)
- Add internal testers (users in your App Store Connect team)
- Testers install via Apple TestFlight app

## 10. Common iPhone/TestFlight Errors

### `No profiles for ... were found`

In Xcode target Signing settings:
- Enable **Automatically manage signing**
- Select correct Team
- Ensure bundle identifier is unique

### `A bundle identifier is not available`

Change bundle identifier in Xcode to something unique, such as:
`org.<yourname>.grqaserapp`

### Build uploaded but not visible in TestFlight

- Wait until processing finishes
- Ensure uploaded build matches the same app/bundle identifier
- Refresh TestFlight page after a few minutes
