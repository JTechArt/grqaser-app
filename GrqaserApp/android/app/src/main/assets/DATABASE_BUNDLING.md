# Database Bundling

**Single source of truth:** `data/grqaser.db` (repo root).

This directory must contain `grqaser.db` so the Android app can bundle the catalog.
Copy from the source of truth (from repo root):

```bash
cp data/grqaser.db GrqaserApp/android/app/src/main/assets/grqaser.db
```

The app opens it read-only from assets (createFromLocation with ~ path). Rebuild after updating.

**iOS:** Copy to `GrqaserApp/ios/GrqaserApp/grqaser.db`. The Xcode project includes this file in Copy Bundle Resources, so after copying, build the app (e.g. Product → Run). The app opens it read-only from the bundle.
