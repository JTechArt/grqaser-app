#!/bin/bash

# GrqaserApp Development Setup Script
# This script sets up the development environment for the GrqaserApp

set -e  # Exit on any error

echo "🚀 Setting up GrqaserApp Development Environment..."

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

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
}

# Check if React Native CLI is installed
check_react_native_cli() {
    print_status "Checking React Native CLI..."
    if command -v react-native &> /dev/null; then
        print_success "React Native CLI is installed"
    else
        print_warning "React Native CLI not found. Installing..."
        npm install -g react-native-cli
        print_success "React Native CLI installed"
    fi
}

# Install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Setup iOS dependencies (macOS only)
setup_ios() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "Setting up iOS dependencies..."
        
        # Check if CocoaPods is installed
        if command -v pod &> /dev/null; then
            print_success "CocoaPods is installed"
        else
            print_warning "CocoaPods not found. Installing..."
            sudo gem install cocoapods
            print_success "CocoaPods installed"
        fi
        
        # Install iOS pods
        if [ -d "ios" ]; then
            cd ios
            pod install
            cd ..
            print_success "iOS pods installed"
        else
            print_warning "iOS directory not found. Skipping iOS setup."
        fi
    else
        print_warning "Not on macOS. Skipping iOS setup."
    fi
}

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    
    if [ ! -f ".env" ]; then
        cat > .env << EOF
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
EOF
        print_success "Environment file created"
    else
        print_warning "Environment file already exists. Skipping creation."
    fi
}

# Check Android setup
check_android_setup() {
    print_status "Checking Android development setup..."
    
    # Check if ANDROID_HOME is set
    if [ -z "$ANDROID_HOME" ]; then
        print_warning "ANDROID_HOME environment variable is not set."
        print_warning "Please set it to your Android SDK location."
        print_warning "Example: export ANDROID_HOME=/Users/username/Library/Android/sdk"
    else
        print_success "ANDROID_HOME is set: $ANDROID_HOME"
    fi
    
    # Check if adb is available
    if command -v adb &> /dev/null; then
        print_success "ADB is available"
    else
        print_warning "ADB not found. Make sure Android SDK platform-tools are in your PATH"
    fi
}

# Check iOS setup (macOS only)
check_ios_setup() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "Checking iOS development setup..."
        
        # Check if Xcode is installed
        if command -v xcodebuild &> /dev/null; then
            print_success "Xcode command line tools are available"
        else
            print_warning "Xcode command line tools not found."
            print_warning "Please install Xcode from the App Store and run: xcode-select --install"
        fi
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm test -- --watchAll=false
    print_success "Tests completed"
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development server:"
    echo "   npm start"
    echo ""
    echo "2. Run on Android device/emulator:"
    echo "   npm run android"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "3. Run on iOS device/simulator:"
        echo "   npm run ios"
        echo ""
    fi
    echo "4. For device testing, make sure to:"
    echo "   - Enable USB debugging on Android devices"
    echo "   - Trust your computer on iOS devices"
    echo ""
    echo "📚 Check the documentation:"
    echo "   docs/APP_DEVELOPMENT_GUIDE.md"
    echo ""
}

# Main setup function
main() {
    echo "=========================================="
    echo "GrqaserApp Development Environment Setup"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_node
    check_npm
    check_react_native_cli
    
    # Install dependencies
    install_dependencies
    
    # Setup platform-specific dependencies
    setup_ios
    
    # Create environment file
    create_env_file
    
    # Check platform setups
    check_android_setup
    check_ios_setup
    
    # Run tests
    run_tests
    
    # Show next steps
    show_next_steps
}

# Run main function
main "$@"
