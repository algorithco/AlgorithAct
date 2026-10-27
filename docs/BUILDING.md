# Building and releases

The desktop release workflow builds and tests **Windows x64, macOS Intel/Apple Silicon and Linux x64/ARM64** on matching native GitHub runners.

## Cross-platform packages

| Platform | Native runner | Artifacts |
| --- | --- | --- |
| Windows x64 | `windows-latest` | NSIS `.exe` |
| macOS Intel | `macos-15-intel` | `.dmg`, `.zip` |
| macOS Apple Silicon | `macos-15` | `.dmg`, `.zip` |
| Linux x64 | `ubuntu-24.04` | `.AppImage`, `.tar.gz` |
| Linux ARM64 | `ubuntu-24.04-arm` | `.AppImage`, `.tar.gz` |

After `npm ci` and the [native compiler prerequisites](../resources/ffmpeg/README.md):

```sh
npm run build:ffmpeg
npm run installer:desktop
npm start
```

`package:desktop` builds the renderer, main/preload and notices, verifies the native media runtime, and stages only built files and licenses. `installer:desktop` additionally creates the native installers in `release/installer/`. The unpacked application is in `release/AlgorithAct-<platform>-<arch>/`; on macOS the executable is inside `AlgorithAct.app/Contents/MacOS/`. Source maps, development dependencies and user projects are excluded. Native tools remain outside `app.asar`.

Source-built media tools have no third-party shared runtime dependencies; Linux still requires its system C/C++ libraries. Linux packages target glibc 2.39+; macOS packages target macOS 12+. Windows ARM64 and 32-bit packages are not part of 0.1.0.

## GitHub publication

1. Open a PR against `main`. Existing CI and all five desktop release builds must pass. The desktop workflow checks native audio/video, packaged export with no PATH/overrides, window controls, recovery and save/close behavior before building installers.
2. Merge the PR, then tag its reviewed main-branch commit as `v<package.json version>` and push the tag.
3. The tag workflow rebuilds all five targets. Publication requires every target, correct tag/version, a main-branch commit, the expected nine app downloads and the matching media source archive.
4. The publisher creates `SHA256SUMS.txt`, uploads to a draft release, then publishes it as an alpha prerelease only after all uploads succeed. A failed build leaves no published partial release.

The workflow can also be dispatched without a tag to validate packages without publication. Publisher certificates and notarization are not configured; Windows/Linux packages are unsigned and macOS apps use ad-hoc signing. Automatic updates are not implemented. See [0.1.0 release notes](releases/0.1.0.md).

The remaining instructions document the optional legacy Windows developer runtime. Published packages use the source-built runtime above.

## Reproducible source setup

Use a clean checkout, Node.js 24 LTS and the committed lockfile:

```sh
npm ci
npm run check
npm run prepare:ffmpeg -- --download
npm run package:win
```

The FFmpeg command explicitly downloads a versioned archive and verifies its checksum. For offline preparation, pass its file path instead. See [runtime provenance](../resources/ffmpeg/README.md).

`package:win` builds renderer/main/preload and generated notices, verifies every FFmpeg runtime hash, stages only the built app and licenses, and packages Electron. The source tree, development dependencies and source maps are excluded from the staged app. Output is `release/AlgorithAct-win32-x64/`; `npm start` launches it.

Keep the full application directory. It includes Electron/Chromium notices, `resources/app.asar`, and `resources/ffmpeg/win32-x64/` outside the archive. App license texts and generated JavaScript notices are included in the app. Runtime fonts retain their OFL notice.

To build a named local variant without replacing the standard output:

```sh
npm run build
node tools/package-windows.mjs --variant smoke-check
```

This creates `release/smoke-check/AlgorithAct-win32-x64/`. Close running copies before rebuilding their directory.

## Installer

```sh
npm run installer:win
```

The NSIS installer is written to `release/installer/AlgorithAct-Setup-<version>-x64.exe`. It uses per-user installation, an install-location choice, desktop/Start shortcuts and an uninstall entry. Uninstall preserves user projects and recovery data.

Signing is not configured by this repository. Local installers are unsigned unless maintainers supply a signing workflow. Do not instruct users to bypass operating-system security warnings. The application does not implement automatic updates.

## Maintainer release checklist

- Select the release scope, review the [roadmap](ROADMAP.md), update version/lockfile/changelog and describe remaining limitations.
- Run core checks and [native/packaged tests](TESTING.md) on every release platform from a clean checkout. Record the commit, Node/npm, Electron, Chrome, OS and test results.
- Run `npm audit`, review production and development findings, and update vulnerable dependencies with regression checks.
- Review new source/assets for secrets, personal files and third-party provenance. Confirm MIT and all upstream license/notice files are present in the packaged output.
- Preserve exact corresponding sources and build scripts for bundled FFmpeg and its dependencies. The source-build workflow produces the matching source archive; confirm it is attached and checksummed with the installers.
- Confirm FFmpeg/FFprobe work without developer PATH or environment variables on every target. Exercise save/open, recovery, PNG, audio MP4/WebM, cancellation and installation.
- Configure signing when available and verify signatures. If publishing an unsigned alpha, describe that fact accurately without bypass instructions.
- Create checksums for final artifacts, attach validation and matching source materials, and review the release notes before publishing a GitHub Release. Do not upload build caches or private sample projects.

All source changes go through a feature branch and PR to `main`. Publishing a tagged binary release is a separate maintainer action.
