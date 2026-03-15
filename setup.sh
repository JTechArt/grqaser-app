#!/bin/bash

# Grqaser React Native Project Setup Script
echo "🚀 Setting up Grqaser React Native project..."

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
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Check if React Native CLI is installed
if ! command -v react-native &> /dev/null; then
    print_status "Installing React Native CLI..."
    npm install -g @react-native-community/cli
    if [ $? -eq 0 ]; then
        print_success "React Native CLI installed successfully"
    else
        print_error "Failed to install React Native CLI"
        exit 1
    fi
else
    print_success "React Native CLI is already installed"
fi

# Check if we're in the right directory
if [ -f "package.json" ]; then
    print_warning "package.json already exists. Skipping React Native project initialization."
else
    print_status "Initializing React Native project..."
    npx react-native init Grqaser --template react-native-template-typescript
    if [ $? -eq 0 ]; then
        print_success "React Native project initialized successfully"
    else
        print_error "Failed to initialize React Native project"
        exit 1
    fi
fi

# Install dependencies
print_status "Installing project dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Project dependencies installed successfully"
else
    print_error "Failed to install project dependencies"
    exit 1
fi

# Install crawler dependencies
print_status "Installing crawler dependencies..."
cd crawler
npm install
if [ $? -eq 0 ]; then
    print_success "Crawler dependencies installed successfully"
else
    print_error "Failed to install crawler dependencies"
    exit 1
fi
cd ..

# Create necessary directories
print_status "Creating project structure..."
mkdir -p src/{components,screens,navigation,services,store,types,utils,constants}
mkdir -p src/components/{common,audio,book}
mkdir -p assets/{images,fonts,icons}
mkdir -p docs

print_success "Project structure created"

# Create basic TypeScript configuration
if [ ! -f "tsconfig.json" ]; then
    print_status "Creating TypeScript configuration..."
    cat > tsconfig.json << EOF
{
  "extends": "@tsconfig/react-native/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@navigation/*": ["src/navigation/*"],
      "@services/*": ["src/services/*"],
      "@store/*": ["src/store/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@constants/*": ["src/constants/*"]
    }
  },
  "include": [
    "src/**/*",
    "index.js"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js"
  ]
}
EOF
    print_success "TypeScript configuration created"
fi

# Create basic ESLint configuration
if [ ! -f ".eslintrc.js" ]; then
    print_status "Creating ESLint configuration..."
    cat > .eslintrc.js << EOF
module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
EOF
    print_success "ESLint configuration created"
fi

# Create basic Prettier configuration
if [ ! -f ".prettierrc" ]; then
    print_status "Creating Prettier configuration..."
    cat > .prettierrc << EOF
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
EOF
    print_success "Prettier configuration created"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    print_status "Creating .gitignore..."
    cat > .gitignore << EOF
# OSX
#
.DS_Store

# Xcode
#
build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata
*.xccheckout
*.moved-aside
DerivedData
*.hmap
*.ipa
*.xcuserstate
project.xcworkspace

# Android/IntelliJ
#
build/
.idea
.gradle
local.properties
*.iml
*.hprof
.cxx/
*.keystore
!debug.keystore

# node.js
#
node_modules/
npm-debug.log
yarn-error.log

# BUCK
buck-out/
\.buckd/
*.keystore
!debug.keystore

# fastlane
#
# It is recommended to not store the screenshots in the git repo. Instead, use fastlane to re-generate the
# screenshots whenever they are needed.
# For more information about the recommended setup visit:
# https://docs.fastlane.tools/best-practices/source-control/

*/fastlane/report.xml
*/fastlane/Preview.html
*/fastlane/screenshots

# Bundle artifacts
*.jsbundle

# CocoaPods
/ios/Pods/

# Expo
.expo/
web-build/

# Metro
.metro-health-check*

# Flipper
ios/Pods/Flipper*

# Temporary files created by Metro to check the health of the file watcher
.metro-health-check*

# Testing
/coverage

# Crawler data
crawler/data/*.json
EOF
    print_success ".gitignore created"
fi

print_success "🎉 Setup completed successfully!"

echo ""
echo "📋 Next steps:"
echo "1. Test the setup: npm start"
echo "2. Run on Android: npm run android"
echo "3. Run on iOS: npm run ios"
echo "4. Test the crawler: cd crawler && npm start"
echo ""
echo "📚 Documentation:"
echo "- README.md - Project overview and setup"
echo "- PROJECT_PLAN.md - Detailed project plan"
echo "- TECHNICAL_SPECIFICATION.md - Technical details"
echo "- TASK_BREAKDOWN.md - Task breakdown and timeline"
echo ""
echo "🚀 Happy coding!"
