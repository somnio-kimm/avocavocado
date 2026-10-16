# avocavocado for iPhone and iPad

This is the single unified app wrapper, with bundle identifier `com.somnio.learnlanguage`. It is separate from the retired Chinese/German applications.

## Build

Use Node.js 26.11.1 or newer and npm 12.2.0 or newer and Xcode 27. The app targets iOS 27, Swift 6 and PackageDescription 6.4. Capacitor core, CLI and iOS are pinned to **8.5.3**, the latest stable release checked on 14 October 2026.

```bash
npm ci --prefix mobile
npm run sync --prefix mobile
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project mobile/ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 18 Pro Max' \
  -derivedDataPath /tmp/avocavocado-ios-build CODE_SIGNING_ALLOWED=NO build
```

`prepare-ios.mjs` generates `mobile/www` from the web shell. It rewrites package URLs to the immutable HTTPS source in `content-source.json`; no language-package data is bundled. The preview pins starter content to a public repository commit, so it does not depend on a local development server. Configure production content hosting and catalog updates before distribution.

The native catalog is bundled for this preview. Dynamic catalog discovery remains available in the browser implementation; a production native catalog endpoint is a separate deployment decision.

## Scene lifecycle and verification

Xcode 27-built apps require the UIKit scene lifecycle. `SceneDelegate` and the scene manifest load the Capacitor view and forward URL/activity callbacks to Capacitor. The generated legacy app lifecycle must not be restored.

Debug builds support two opt-in launch arguments:

- `--verify-language-packages`: open all four German/Chinese explanation pairs through the real WebView.
- `--verify-offline-packages`: block remote fetches at document start and repeat the pair checks using installed content.

Both print a `NATIVE_PACKAGE_QA_RESULT` record and return the screen to its unselected state. These checks are excluded from release builds. They verify native rendering and package storage, not all native picker gestures or every future exercise.

The sync command finalises the generated Swift manifest to tools version 6.4, which is required for the iOS 27 platform constant.

The generated `www` and iOS `public` directories are ignored. Keep `Package.resolved` and npm lockfiles for reproducible builds. This task creates a simulator build, not a signed App Store release.

Capacitor runtime licence text is retained in `THIRD_PARTY_NOTICES.txt`; study packages retain their own notices.

The CLI uses a scoped override to UUID 14.0.3 under its Xcode-project parser. The upstream UUID 7 dependency has an advisory; the current override passes asset synchronisation and the full npm audit.

## Physical iPad development install

The installed display name is **avocavocado**. The bundle identifier remains
`com.somnio.learnlanguage` and existing learner-storage namespaces are retained
so a rename does not erase installed study progress. Active project/package names,
web headings and diagnostics use avocavocado; historical licence credits are not
rewritten.

After `npm run mobile:sync`, use the connected device identifier from
`xcrun devicectl list devices` and your Xcode signing team:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project mobile/ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'id=<device-identifier>' \
  -derivedDataPath /tmp/avocavocado-ipad-build \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM=<your-team-id> CODE_SIGN_STYLE=Automatic build

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun devicectl device install app \
  --device <device-identifier> /tmp/avocavocado-ipad-build/Build/Products/Debug-iphoneos/App.app
```

A first installation may require trusting your developer identity on the iPad:
Settings → General → VPN & Device Management → Developer App. Follow the device's
Trust/Allow prompt before launching. Development profiles expire; check the
embedded provisioning profile's expiration date and rebuild/reinstall when needed.
This is a development installation, not an App Store release.
