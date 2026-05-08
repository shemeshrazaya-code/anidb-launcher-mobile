# Changelog

## Unreleased

### New
- **About section** in Settings: app version, GitHub repo link, Sponsor link.
- **Optional sponsor footer** at the bottom of Browse — small low-opacity link, only shown when there are results.
- `.github/FUNDING.yml` — surfaces the Sponsor button on the GitHub repo page.

### Fixed
- Browse error-retry banner crashed when tapped (referenced a `load` function that was renamed to `onRefresh` in v0.1.2's streaming refactor). Now wired to `onRefresh`.

## v0.1.2 — 2026-05-08

Match the desktop's catalogue depth — ~7,500 anime instead of ~1,200.

### New
- **Page counts now match desktop**: Top 60 pages, Trending 20, Hentai 40 (popularity) + 30 (score). Total ceiling ~7,500 unique titles after dedup.
- **Two-phase Hentai fetch**: a `POPULARITY_DESC` phase + a `SCORE_DESC` phase so highly-rated low-popularity titles aren't buried.
- **Streaming UI**: the Browse list grows page-by-page as the fetch runs. No more 3-minute blank wait. A status banner shows "Loading top · page 17/60 · 850 entries" so you know it's making progress.
- **Rate limiting** (1.2s between requests) + **429 retry** with `Retry-After` honored, matching the desktop's behavior.
- **Partial cache**: progress is saved every 5 pages so a closed tab / crash mid-fetch doesn't lose anything.

### Changed
- Cache keys are versioned (`*-v2`) so the small v0.1.1 caches will be re-fetched once on upgrade.

## v0.1.1 — 2026-05-08

Coverage upgrades to fix "where is my X?" complaints.

### New
- **Categories**: Top / Trending / Hentai pill selector at the top of Browse. Each category has its own 24h cache.
- **Live AniList search**: typing in the filter box now hits AniList directly (debounced 400ms) instead of just filtering the cached list. Find any title in the database, not just the popular ones.
- **Bigger cached pools**: Top is now 10 pages (~500 entries) instead of 3 (~150). Trending is 6 pages, Hentai is 8.

### Changed
- Browse cache is now keyed per category. Switching categories is instant once cached.
- Detail and Favorites screens look up anime across all category caches, not just Top.

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
