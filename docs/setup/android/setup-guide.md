# Android Development Setup Guide (macOS - Apple Silicon)

This guide walks you through setting up the Android development environment to build and run the GrqaserApp React Native project on macOS.

## Prerequisites

| Component | Required | Notes |
|---|---|---|
| macOS (Apple Silicon) | Yes | M1/M2/M3 Mac |
| Homebrew | Yes | Package manager for macOS |
| Node.js 16+ | Yes | Runtime for React Native CLI |
| Java JDK 17 | Yes | Required for Android build (Gradle 8.0.1) |

**Note:** Use JDK 17 for the Android build. React Native 0.72's Gradle plugin does not support Java 21. You can keep JDK 21 for other tools; set `JAVA_HOME` only when running `run-android` (see below).

## 1. Install Core Dependencies

### Java JDK 17 (for Android build)

```bash
brew install --cask temurin@17
```

Or Corretto 17:

```bash
brew install --cask corretto17
```

Verify (use 17 for Android builds):

```bash
/usr/libexec/java_home -v 17
# Should print a path like: /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
```

### Watchman (recommended for React Native)

```bash
brew install watchman
```

### Android Command Line Tools

```bash
brew install --cask android-commandlinetools
```

This installs the SDK to `/opt/homebrew/share/android-commandlinetools`.

## 2. Configure Environment Variables

Add the following to your `~/.zshrc`:

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Apply changes:

```bash
source ~/.zshrc
```

## 3. Install Android SDK Packages

```bash
sdkmanager --sdk_root=$ANDROID_HOME "platform-tools"
sdkmanager --sdk_root=$ANDROID_HOME "platforms;android-33"
sdkmanager --sdk_root=$ANDROID_HOME "build-tools;33.0.0"
sdkmanager --sdk_root=$ANDROID_HOME "ndk;23.1.7779620"
sdkmanager --sdk_root=$ANDROID_HOME "emulator"
sdkmanager --sdk_root=$ANDROID_HOME "system-images;android-33;google_apis;arm64-v8a"
```

Accept licenses if prompted:

```bash
sdkmanager --sdk_root=$ANDROID_HOME --licenses
```

## 4. Create an Android Emulator (AVD)

```bash
avdmanager create avd -n Pixel_6 -k "system-images;android-33;google_apis;arm64-v8a" -d "pixel_6"
```

Verify it was created:

```bash
avdmanager list avd
```

## 5. Launch the Emulator

```bash
$ANDROID_HOME/emulator/emulator -avd Pixel_6
```

The first boot takes a few minutes. Wait until you see the Android home screen.

## 6. Run the App

Open **two separate terminals**.

**Terminal 1 -- Start Metro bundler:**

```bash
cd GrqaserApp
npx react-native start
```

**Terminal 2 -- Build and install on emulator:**

Use JDK 17 for the build (required for Gradle 8.0.1):

```bash
cd GrqaserApp
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}
npx react-native run-android
```

The app will build, install on the emulator, and launch automatically.

## Installing on a Physical Android Device (Samsung Tablet, etc.)

### Enable Developer Mode on the Device

1. Go to **Settings > About tablet** (or About phone)
2. Tap **Build number** 7 times until you see "You are now a developer"
3. Go back to **Settings > Developer options**
4. Enable **USB debugging**

### Connect and Run

1. Connect the device to your Mac via USB
2. Accept the USB debugging prompt on the device
3. Verify the connection:

```bash
adb devices
```

You should see your device listed.

4. Run the app (it will auto-detect the physical device):

```bash
cd GrqaserApp
npx react-native run-android
```

### Build a Standalone APK (for sharing / sideloading)

```bash
cd GrqaserApp/android
./gradlew assembleRelease
```

The APK is generated at:

```
android/app/build/outputs/apk/release/app-release.apk
```

Transfer this file to the device via USB, Google Drive, or email, then tap it to install. You may need to allow "Install from unknown sources" in the device settings.

## Troubleshooting

### `adb devices` shows "unauthorized"

Disconnect and reconnect the USB cable, then accept the debugging prompt on the device.

### Emulator won't start

Make sure you installed the `emulator` package and the `arm64-v8a` system image (not `x86_64` -- Apple Silicon requires ARM images).

### Build fails with "SDK location not found"

Ensure `android/local.properties` contains:

```
sdk.dir=/opt/homebrew/share/android-commandlinetools
```

### Metro bundler port conflict

If port 8081 is in use:

```bash
npx react-native start --port 8082
```

### Build fails with "Unsupported class file major version 65"

You're using Java 21 but the Android Gradle in this project supports up to Java 19. Use JDK 17 for the build:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
npx react-native run-android
```

Install JDK 17 if needed: `brew install --cask temurin@17`
