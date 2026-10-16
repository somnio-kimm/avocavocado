# Current project toolchain

Verified on 14 October 2026. Use current stable releases; this project does not target older toolchains.

| Component | Version |
|---|---|
| Node.js | 26.11.1 |
| npm | 12.2.0 |
| Playwright | 1.64.0 |
| Capacitor core / CLI / iOS | 8.5.3 |
| Xcode | 27.0 |
| iOS minimum | 27.0 |
| Swift language mode / package tools | 6.0 / 6.4 |
| CI checkout / setup-node actions | v7 / v7 |

The Node version is recorded in `.node-version`; package manifests declare the Node/npm requirements and npm version. Engine checks reject older local runtimes. CI installs the specified Node and npm versions before dependencies.

Both root and mobile dependency audits passed with zero reported vulnerabilities. The mobile CLI's Xcode parser uses a scoped override to UUID 14.0.3; asset synchronisation was checked with this override.

Validation on this toolchain: 55 unit/content/tooling tests, 8 Chromium scenarios, native asset synchronisation, and the iOS 27 simulator build with native online/offline package checks. The host operating system and unrelated applications are outside this project configuration.
