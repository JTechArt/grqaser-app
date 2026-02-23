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

### iOS: "Library not found" (e.g. -lBVLinearGradient) when building for device

The linker looks for pod libraries in the build products directory. If they’re missing, Pods weren’t built for the current destination. Do this in order:

1. **Always use the workspace**  
   Open **`GrqaserApp/ios/GrqaserApp.xcworkspace`** in Xcode. Do **not** open `GrqaserApp.xcodeproj` when building the app (Pods won’t be built).

2. **Full clean and reinstall**
   ```bash
   cd GrqaserApp/ios
   rm -rf ~/Library/Developer/Xcode/DerivedData/GrqaserApp-*
   pod install
   ```
   Then open `GrqaserApp.xcworkspace` (step 1).

3. **Build for device in Xcode**  
   Select your **physical device** as the run destination. **Product → Clean Build Folder** (⇧⌘K), then **Product → Build** (⌘B).

4. **If it still fails**  
   Build the Pods first, then the app:
   - In the scheme selector (toolbar), choose **Pods-GrqaserApp** (or the Pods scheme if present).
   - With your **device** still selected, **Product → Build** (⌘B).
   - Switch the scheme back to **GrqaserApp** and build again (⌘B).

   Or from the repo root:  
   `npx react-native run-ios --device`  
   (this builds the workspace for the connected device).

### Full iOS reinstall (step-by-step)

Use this when the app still won’t build after normal cleans, or you see “library not found”, “module map not found”, or “multiple commands produce”.

**What are Pods?**  
iOS uses **CocoaPods** (“Pods”) to install native libraries (e.g. React Native, audio player, gradients). The `Podfile` lists those libraries; `pod install` downloads them and creates the `Pods` folder and the **workspace** (`.xcworkspace`). You must **open the workspace**, not the plain Xcode project (`.xcodeproj`), so that the app and Pods build together.

**Do everything below in order. Use Terminal (or iTerm) for the commands.**

---

**Step 1: Quit Xcode**  
Fully quit Xcode (Cmd+Q). This avoids locks on build folders.

---

**Step 2: Go to the project folder**  
In Terminal, run:

```bash
cd /Users/arthurho/Projects/grqaser
```

You should now be in the repo root (where you see `GrqaserApp`, `docs`, etc.).

---

**Step 3: Remove iOS build artifacts and Pods**  
Run these one by one (copy each line, paste in Terminal, press Enter):

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/GrqaserApp-*
```

```bash
cd GrqaserApp/ios && rm -rf Pods build Podfile.lock && cd ../..
```

- `DerivedData/GrqaserApp-*`: Xcode’s build cache for this app.  
- `Pods`: the installed pod libraries (we will reinstall them).  
- `build`: local iOS build output.  
- `Podfile.lock`: lockfile of pod versions (CocoaPods will recreate it).

You should be back in `/Users/arthurho/Projects/grqaser` after the last command.

---

**Step 4: Reinstall JavaScript dependencies**  
Still in repo root (`/Users/arthurho/Projects/grqaser`), run:

```bash
cd GrqaserApp && npm ci && cd ..
```

This reinstalls Node packages from `package.json` and may take a minute.

---

**Step 5: Install CocoaPods (if needed)**  
Check if the `pod` command exists:

```bash
which pod
```

- If you see a path (e.g. `/usr/local/bin/pod` or something with `rbenv`), skip to Step 6.  
- If you see nothing, install CocoaPods:

```bash
sudo gem install cocoapods
```

(Type your Mac password when asked.) Then run `which pod` again to confirm.

---

**Step 6: Run pod install**  
From repo root:

```bash
cd /Users/arthurho/Projects/grqaser/GrqaserApp/ios && pod install && cd ../..
```

Wait until it says “Pod installation complete!” and lists how many pods were installed. If it errors, copy the full error and fix that first (e.g. Ruby/CocoaPods version).

---

**Step 7: Open the workspace in Xcode**  
Do **not** double‑click `GrqaserApp.xcodeproj`. Do this instead:

1. In Finder, go to:  
   `grqaser` → `GrqaserApp` → `ios`
2. Double‑click **`GrqaserApp.xcworkspace`** (the white Xcode icon).

Or from Terminal:

```bash
open /Users/arthurho/Projects/grqaser/GrqaserApp/ios/GrqaserApp.xcworkspace
```

The window title should show “GrqaserApp” and the scheme dropdown (top left) should include “GrqaserApp” and “Pods-GrqaserApp”.

---

**Step 8: Select your iPhone**  
1. Connect your iPhone with a cable and unlock it.  
2. In Xcode’s top toolbar, click the device dropdown (it might say “GrqaserApp > Some Simulator”).  
3. Under “iOS Device” or your device name, select **your physical iPhone** (e.g. “Arthur’s iPhone”).

---

**Step 9: Clean and build**  
1. In the menu bar: **Product → Clean Build Folder** (or press Shift+Cmd+K).  
2. Then: **Product → Build** (or press Cmd+B).

Wait for the build to finish. The first build can take a few minutes.

**To see the app on your iPhone:** Use **Product → Run** (Cmd+R). Build (Cmd+B) only compiles; Run builds (if needed), installs the app on the selected device, and launches it. If you only built, the app will not appear on the device until you run.

---

**Step 10: If the build still fails**  
1. In the scheme dropdown (top left), select **Pods-GrqaserApp**.  
2. With your **iPhone** still selected, choose **Product → Build** (Cmd+B).  
3. When that finishes, switch the scheme back to **GrqaserApp** and choose **Product → Build** (Cmd+B) again.

If you still get an error, copy the **exact** error message (and the line above it if it’s in the Report navigator) and use that to troubleshoot or ask for help.

### iOS: Books not loading (catalog database not in app)

The app needs the bundled catalog DB `grqaser.db` inside the app bundle so books load on first launch. The Xcode project is set up to copy it via **Copy Bundle Resources**; the file must exist in the app folder before building.

1. **Source of truth:** `data/grqaser.db` (repo root).
2. **Copy into the iOS app** (from repo root):
   ```bash
   cp data/grqaser.db GrqaserApp/ios/GrqaserApp/grqaser.db
   ```
3. **Build and run** (Product → Run in Xcode, or `npx react-native run-ios --device`). The build will include `grqaser.db` in the app bundle; the app opens it read-only from the bundle.

If you clone the repo and `data/grqaser.db` is missing, add it or download it per the repo’s data instructions; then run the `cp` above and rebuild.

### iOS: Sandbox errors during "[CP] Embed Pods Frameworks" (rsync / hermes.framework)

If the build fails with `Sandbox: rsync(...) deny(1) file-read-data` or `file-write-create` when copying `hermes.framework` into the app, Xcode's **User Script Sandboxing** is blocking the CocoaPods embed script. The project disables this for the iOS app (`ENABLE_USER_SCRIPT_SANDBOXING = NO` in the Xcode project) so the "[CP] Embed Pods Frameworks" phase can read from `DerivedData/.../XCFrameworkIntermediates/hermes-engine` and write to `GrqaserApp.app/Frameworks`. If you re-enable sandboxing (e.g. after a project reset), set it back to `NO` for device builds to succeed.

---

**Quick reference (after a normal clean reinstall)**  
From repo root:

```bash
cd /Users/arthurho/Projects/grqaser/GrqaserApp/ios
rm -rf Pods build Podfile.lock
pod install
open GrqaserApp.xcworkspace
```

Then in Xcode: select your device → Product → Clean Build Folder → Product → Build.

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
