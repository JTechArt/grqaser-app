# Data (single source of truth for catalog)

`grqaser.db` is the **canonical catalog** for the project.

- **books-admin-app:** Uses this file via config default `data/grqaser.db` (or `DB_PATH` / `CRAWLER_DB_PATH`).
- **GrqaserApp (iOS):** Copy to `GrqaserApp/ios/GrqaserApp/grqaser.db` and ensure it’s in Xcode “Copy Bundle Resources”.
- **GrqaserApp (Android):** Copy to `GrqaserApp/android/app/src/main/assets/grqaser.db`.

Use this path as the single source; copy into app bundles when needed. The `backups/` folder at repo root is for manual backups only.
