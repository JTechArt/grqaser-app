#!/bin/bash

# GrqaserApp Build and Test Script
# This script helps with building and testing the app on devices

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  dev-android     - Build and run debug version on Android device"
    echo "  dev-ios         - Build and run debug version on iOS device (macOS only)"
    echo "  release-android - Build release APK for Android"
    echo "  release-ios     - Build release archive for iOS (macOS only)"
    echo "  test            - Run tests"
    echo "  clean           - Clean all builds"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev-android"
    echo "  $0 release-android"
    echo "  $0 test"
}

# Function to check if device is connected
check_android_device() {
    print_status "Checking Android device connection..."
    if adb devices | grep -q "device$"; then
        DEVICE=$(adb devices | grep "device$" | head -1 | cut -f1)
        print_success "Android device found: $DEVICE"
        return 0
    else
        print_warning "No Android device found. Please connect a device or start an emulator."
        return 1
    fi
}

# Function to check if iOS device is connected (macOS only)
check_ios_device() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_warning "iOS development is only supported on macOS."
        return 1
    fi
    
    print_status "Checking iOS device connection..."
    if command -v xcrun &> /dev/null; then
        if xcrun devicectl list devices | grep -q "iPhone\|iPad"; then
            print_success "iOS device found"
            return 0
        else
            print_warning "No iOS device found. Please connect a device or start a simulator."
            return 1
        fi
    else
        print_warning "Xcode command line tools not found."
        return 1
    fi
}

# Function to build and run debug Android
build_debug_android() {
    print_status "Building and running debug version on Android..."
    
    if check_android_device; then
        # Start Metro bundler in background
        print_status "Starting Metro bundler..."
        npx react-native start &
        METRO_PID=$!
        
        # Wait a moment for Metro to start
        sleep 3
        
        # Build and run on device
        print_status "Building and installing on device..."
        npx react-native run-android
        
        # Stop Metro bundler
        kill $METRO_PID 2>/dev/null || true
        
        print_success "Debug Android build completed!"
    else
        print_error "Cannot build for Android - no device connected."
        exit 1
    fi
}

# Function to build and run debug iOS
build_debug_ios() {
    print_status "Building and running debug version on iOS..."
    
    if check_ios_device; then
        # Start Metro bundler in background
        print_status "Starting Metro bundler..."
        npx react-native start &
        METRO_PID=$!
        
        # Wait a moment for Metro to start
        sleep 3
        
        # Build and run on device
        print_status "Building and installing on device..."
        npx react-native run-ios
        
        # Stop Metro bundler
        kill $METRO_PID 2>/dev/null || true
        
        print_success "Debug iOS build completed!"
    else
        print_error "Cannot build for iOS - no device connected or not on macOS."
        exit 1
    fi
}

# Function to build release Android APK
build_release_android() {
    print_status "Building release APK for Android..."
    
    # Check if keystore exists
    if [ ! -f "android/app/grqaser-release-key.keystore" ]; then
        print_warning "Release keystore not found. Creating one..."
        cd android/app
        keytool -genkeypair -v -storetype PKCS12 -keystore grqaser-release-key.keystore -alias grqaser-key-alias -keyalg RSA -keysize 2048 -validity 10000
        cd ../..
        print_warning "Please update android/gradle.properties with your keystore passwords."
    fi
    
    # Clean and build
    print_status "Cleaning previous builds..."
    cd android && ./gradlew clean && cd ..
    
    print_status "Building release APK..."
    cd android && ./gradlew assembleRelease && cd ..
    
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        print_success "Release APK built successfully!"
        print_success "APK location: $APK_PATH"
        print_success "APK size: $APK_SIZE"
        
        # Install on connected device if available
        if check_android_device; then
            print_status "Installing APK on connected device..."
            adb install -r "$APK_PATH"
            print_success "APK installed on device!"
        fi
    else
        print_error "Failed to build release APK."
        exit 1
    fi
}

# Function to build release iOS archive
build_release_ios() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "iOS release builds are only supported on macOS."
        exit 1
    fi
    
    print_status "Building release archive for iOS..."
    print_warning "iOS release builds require Xcode. Please:"
    print_warning "1. Open ios/GrqaserApp.xcworkspace in Xcode"
    print_warning "2. Select 'Any iOS Device' as target"
    print_warning "3. Go to Product → Archive"
    print_warning "4. Follow the distribution wizard"
    
    # Open Xcode workspace
    if [ -f "ios/GrqaserApp.xcworkspace" ]; then
        print_status "Opening Xcode workspace..."
        open ios/GrqaserApp.xcworkspace
    else
        print_error "Xcode workspace not found. Please run 'cd ios && pod install' first."
        exit 1
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    npm test -- --watchAll=false
    print_success "Tests completed!"
}

# Function to clean builds
clean_builds() {
    print_status "Cleaning all builds..."
    
    # Clean Android
    if [ -d "android" ]; then
        print_status "Cleaning Android builds..."
        cd android && ./gradlew clean && cd ..
    fi
    
    # Clean iOS
    if [[ "$OSTYPE" == "darwin"* ]] && [ -d "ios" ]; then
        print_status "Cleaning iOS builds..."
        cd ios && xcodebuild clean && cd ..
    fi
    
    # Clean Metro cache
    print_status "Cleaning Metro cache..."
    npx react-native start --reset-cache --no-packager
    
    print_success "All builds cleaned!"
}

# Main function
main() {
    case "${1:-help}" in
        "dev-android")
            build_debug_android
            ;;
        "dev-ios")
            build_debug_ios
            ;;
        "release-android")
            build_release_android
            ;;
        "release-ios")
            build_release_ios
            ;;
        "test")
            run_tests
            ;;
        "clean")
            clean_builds
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function
main "$@"
