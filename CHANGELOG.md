# Changelog

## v0.1.0 — 2026-05-08

First Android release.

### Features
- Browse top ~150 anime by popularity from AniList, with poster, season, format, episode count, and rating.
- Anime detail screen with synopsis, genres, alt titles, and a "Search on…" action.
- Favorites tab.
- Settings tab for managing user-supplied search sources (name + URL template using `{query}`).
- 24-hour cache of the AniList top list.

### Notes
- Ships with zero default sources by design — bring your own.
- APK is signed with the default Expo debug keystore; future releases will move to a stable release keystore so updates can install over previous versions.
- Android 7.0+ (API 24+).

### Known gaps
- No first-run wizard yet — Settings tab is the entry point.
- No reminders / "watch later" notifications.
- No iOS build yet.
