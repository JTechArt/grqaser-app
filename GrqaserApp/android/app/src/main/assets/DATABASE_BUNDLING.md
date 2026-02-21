# Database Bundling

**Single source of truth:** `data/grqaser.db` (repo root).

This directory must contain `grqaser.db` so the Android app can bundle the catalog.
Copy from the source of truth (from repo root):

```bash
cp data/grqaser.db GrqaserApp/android/app/src/main/assets/grqaser.db
```

The app opens it read-only from assets (createFromLocation with ~ path). Rebuild after updating.

For iOS, copy to `GrqaserApp/ios/GrqaserApp/grqaser.db` (Copy Bundle Resources).
