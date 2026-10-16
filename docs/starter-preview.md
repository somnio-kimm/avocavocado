# Unified starter preview

Run `npm ci` and `npm start`, then open `http://127.0.0.1:4188`. Choose a study language and explanation language to install only that core and pair. For example, German → Korean installs de-core and de-ko; English later adds de-en only. The same applies to Chinese. The interface follows that explanation-language choice in this first version.

German and Chinese each have two original sample entries with bilingual meanings and examples. These are deliberately labeled starter content, not complete level-based dictionaries. Original starter content uses the repository MIT license. Full source dictionaries require their existing provenance and licensing review during migration.

The service worker caches only the application shell and fallback catalog. A separate content-hosted catalog is fetched with a timeout and cached for offline discovery, so new explanation pairs can appear without a picker code change. Package JSON lives in `language-packages/`, outside `web/`, and is fetched only after selection. Verified content is stored in IndexedDB by package ID and version; selection preferences use a separate localStorage key. Browser storage eviction can require a re-download. Native durable storage is not implemented yet.

The development server maps `/language-packages/` to that external content directory. Before a native build, publish immutable packages on HTTPS hosting and configure the package-catalog meta tag to use the production catalog endpoint. Release catalogs must contain package URLs, exact byte sizes, SHA-256 digests and every core version referenced by their pair packs. The loopback development server is not a production update service.

Run `npm test`, `npm run check`, and `npm run verify:browser`. Browser checks use Playwright Chromium; install it with `npx playwright install chromium`. `BROWSER_EXECUTABLE` can select an existing Chromium binary and `SCREENSHOT_DIR` can capture the verified light/dark screens.

Pending: full vocabulary and exercise migration, language-scoped progress, one iOS/Android wrapper, package management and Wi-Fi-only background update policy. No new native binary or store release is produced by this preview.
