# GitHub release workflow and alpha versioning

- STATUS: OPEN
- PRIORITY: 90
- TAGS: release,ci

Goal: pushing a tag like v0.1.0-alpha.1 builds installers and attaches them to a draft GitHub pre-release.

1. Version: put the same version in tauri.conf.json, src-tauri/Cargo.toml and package.json. Check that a pre-release version works with the bundlers: the Windows MSI (WiX) is known to want a numeric-only pre-release identifier, so either use a numeric one or build only the NSIS .exe on Windows (set bundle.targets explicitly instead of "all": nsis, deb, appimage, and rpm if wanted).
2. .github/workflows/release.yml with tauri-apps/tauri-action: matrix ubuntu-22.04 + windows-latest, pnpm install, tagName from the pushed tag, releaseDraft: true, prerelease: true. Ubuntu needs libwebkit2gtk-4.1-dev, libappindicator3-dev, librsvg2-dev, patchelf.
3. Release notes template: what works, known issues, how to back up, how to report a bug.
4. Attach SHA256 sums. Code signing is not available yet: say so in the notes (Windows SmartScreen will warn).
5. Test the workflow on a throwaway tag in a fork or with workflow_dispatch before the real one.
6. Print uses WebKitGTK on Linux and WebView2 on Windows. Print a report on both before tagging.
