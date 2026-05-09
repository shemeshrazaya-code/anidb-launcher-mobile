# anidb-launcher-mobile

Android port of [anidb-launcher](https://github.com/shemeshrazaya-code/anidb-launcher) — browse top anime, then launch a search on any user-configured site in your default browser.

Built with Expo SDK 54 + React Native 0.81 + TypeScript.

> **About this app.** This is a metadata browser and search-URL launcher. It does **not** host, distribute, stream, or download any media. Posters and titles are loaded at runtime from the public AniList API. Search shortcuts are user-supplied URL templates — the app ships with **zero default sources** by design.

## What it does

- **Browse** — top anime from AniList, posters and metadata, pull-to-refresh.
- **Detail** — synopsis, genres, alt titles, "Search on…" action.
- **Favorites** — tap "Add to favorites" on any anime, view the list anytime.
- **Settings** — bring your own search URLs. Configure as many sources as you want.

The app's core action: pick an anime, pick a source, and the app fires off `https://your-source.example/search?q={title}` in your browser. Sources are user-supplied — the app ships with zero defaults by design.

## Install (sideload)

Grab the APK from the [latest release](https://github.com/shemeshrazaya-code/anidb-launcher-mobile/releases/latest), allow installs from unknown sources, install. Android 7.0+ (API 24+).

## First-run setup

1. Open the **Settings** tab.
2. Add a source: a name (e.g. `MyAnimeList`) and a URL template containing `{query}` where the title goes (e.g. `https://myanimelist.net/anime.php?q={query}`).
3. Open any anime from Browse — your sources appear under "Search on…".

## Build from source

```bash
git clone https://github.com/shemeshrazaya-code/anidb-launcher-mobile
cd anidb-launcher-mobile
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The APK lands at `android/app/build/outputs/apk/release/app-release.apk`.

For the dev loop on Windows + Android emulator, prefer `--localhost`:

```bash
npx expo start --localhost --android
```

(Without `--localhost`, the emulator can stall fetching the bundle from Metro's LAN IP.)

## Run tests

```bash
npm test
```

Storage layer (sources, favorites, URL templating) is covered by jest. UI is verified manually on `Pixel_7_API_34`.

## Roadmap

v0.1.0 ships the core launcher loop. Planned for later:

- Reminders ("watch later" with optional notification)
- First-run setup wizard for sources
- iOS build (TestFlight or Appetize)
- Source-availability check (probe a URL pattern before launching)

## Support

If this app earned its place on your home screen, you can [sponsor on GitHub](https://github.com/sponsors/shemeshrazaya-code). Entirely optional — the app is free, FOSS, and stays that way regardless.

## License

MIT
