# Changelog

## Unreleased

### Fixed
- **`SQLiteFullException: database or disk is full`** when loading multiple categories. AsyncStorage's SQLite backing has a default limit around 6MB on Android, and 12 categories × thousands of items each (each ~900B with title, description, posterUrl, genres, alt titles) can easily blow past that. Migrated all AniList category caches off AsyncStorage to `expo-file-system` (no size limit beyond device free space). New `src/services/cache-storage.ts` exposes `readCacheJson` / `writeCacheJson` / `removeCache` plus a one-shot `migrateAsyncStorageKeys('anilist-cache-')` that runs on app start to move any existing caches from the broken SQLite backing to the new file-system backing and free the SQLite slots. Small key/value (sources, favorites, settings, background config) stays on AsyncStorage.

### Changed
- **Hentai category default-on.** The opt-in toggle in Settings → Content now defaults to enabled, matching user intent ("not a judger; let whoever search whatever"). Toggle still exists for users who want to hide the category.

### Removed
- **Removed a short-lived content filter** on the AniList query that was added during the morning's takedown-risk pass. AniList results pass through unfiltered; the README disclaimer was trimmed to match.
- **Speculative cache key bumps** that were tied to the blocklist (top-v3, hentai-v3, etc.) reverted back to v2/v1 so existing caches survive the change.

### Changed
- **Cache trusts itself forever.** Categories no longer hard-expire after 24 hours. Once a category is fully fetched, every subsequent visit loads from AsyncStorage instantly with zero network requests. The only way to re-fetch is to tap the ↻ button next to the search bar. Saves battery + bandwidth on phones; matches the desktop launcher's `--refresh`-only semantics. Partial caches (from interrupted fetches) still continue from where they left off on the next visit.

### New
- **Share + import sources.** Two new buttons in Settings under the Sources section: **Share my list** wraps the user's source list in a versioned JSON envelope (`format: anime-db-sources/v1`) and opens the system Share sheet so it can be sent via Messages / Discord / email / wherever. **Import…** opens a slide-up sheet with a paste box (or one-tap "Paste from clipboard"), validates the JSON, previews the parsed source names, and offers two outcomes: **Replace all** (destructive, confirmed via Alert) or **Merge** (skips duplicates by name, case-insensitive). Both forms tolerate plain `[...]` arrays or older bundles missing the `format` field. New `src/services/sources-share.ts` (serialize/parse/merge) and `components/import-sources-sheet.tsx`.
- **Multi-select genre filter.** The horizontal genre chip scroll on Browse is replaced with a single "Genres: \<n selected\>" button that opens a slide-up sheet with all genres available in the current category, in a wrap-layout multi-select grid. Filter logic switched from single-select-or-none to multi-select OR (an item matches if any of its genres are selected). The button shows the selected genre name when one is picked, "n selected" when more, and an inline "×" to clear without opening the sheet. The sheet has a Clear / Apply footer.
- **Pickable background.** New "Background" section in Settings with three presets (Snake skin / Violet fade / Solid dark) and a "Choose photo…" option that pulls an image via `expo-image-picker` and uses it as the app background (dimmed by 40% for readability). Selection persists via AsyncStorage and applies instantly across all tabs. New `components/app-background.tsx` (replaces the old `snake-skin-bg.tsx`) renders the active variant; new `src/services/background.ts` owns the storage + a small subscriber-aware `useAppBackground()` hook so changes propagate without a navigator rebuild.
- **All categories + searchable picker.** Browse now ships with 12 categories (Top Popular, Trending Now, Top Rated, Most Favorited, Currently Airing, Upcoming, Newest Releases, Movies, TV Series, OVAs, Specials, Hentai). The horizontal pill scroll is replaced by a single tappable "Category: <name>" button that opens a slide-up modal sheet with a search field — type to filter, tap to select. Each category has its own AsyncStorage cache, so switching back to a recently-viewed category is instant.
- `src/services/anilist.ts` was refactored from three hardcoded queries to one parameterized `BROWSE_QUERY` driven by per-category `phases` with their own GraphQL variables (sort, status, format, genres). New `CATEGORIES` registry and `CategoryDef` / `CategoryId` exports.
- **Branded app identity.** New custom app icon (DB Anime mark) + splash screen (anime character launcher art, dark base) wired through `app.json`. Replaces the default Expo icon and white splash.
- **Snake-skin background.** Subtle SVG hexagonal-scale pattern with violet undertones tiled across all screens, behind all content. New `components/snake-skin-bg.tsx`. Added `react-native-svg` for the inline pattern.
- **Forced dark theme.** `userInterfaceStyle: "dark"` in `app.json` — no more white-on-white in any system setting. Custom transparent-background dark theme on `@react-navigation/native`'s `ThemeProvider` so the snake-skin shows through every navigator scene.
- **Custom in-screen headers.** Each tab now has its own large title (`Anime DB` / `Favorites` / `Settings`) inside the screen, with proper safe-area top inset. Default Expo Router tab header is hidden, reclaiming the dead vertical space.
- **Manual refresh button.** Replaces pull-to-refresh on Browse with a small `↻` button next to the search bar — pull-to-refresh was too easy to fire accidentally and re-download ~7,500 entries (~3 min on AniList rate limit). Button is disabled while a fetch is in flight.
- **About section** in Settings: app version, GitHub repo link, Sponsor link.
- **Optional sponsor footer** at the bottom of Browse — small low-opacity link, only shown when there are results.
- `.github/FUNDING.yml` — surfaces the Sponsor button on the GitHub repo page.

### Changed
- **Visual refresh.** New violet brand color (`#8b5cf6`) replaces the generic blue accent across category pills, genre chips, the Add Source button, and the Favorited state.
- **Browse cards** now render the title and year directly on the poster with a bottom-fade gradient, so titles stay readable on bright artwork. Rating badge moved to top-right. Press state adds a subtle scale-down.
- **Skeleton loader.** Initial Browse load shows a pulsing 8-card grid skeleton instead of a centered spinner.
- **Progress bar.** Streaming category fetches now show a thin violet progress bar at the top, replacing the verbose "Loading top · page 17/60 · 850 entries" line. Status text now just shows phase and entry count.
- **Theme-aware text inputs.** Search bar (Browse) and the Add Source inputs (Settings) now respect light/dark mode instead of hardcoding white-on-white.
- **Theme palette extended** with `surface`, `border`, and `muted` color tokens for consistent input styling. Dark background deepened from `#151718` to `#0e0f10`.

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
