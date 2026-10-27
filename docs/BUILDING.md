# Building and releases

The validated packaging target is **Windows x64**. Other targets require their own runtime manifests, packaging and QA. Local source publication and CI do not automatically create a GitHub Release.

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
- Run core checks and [full Windows/native/packaged tests](TESTING.md) from a clean checkout. Record the commit, Node/npm, Electron, Chrome, OS and test results.
- Run `npm audit`, review production and development findings, and update vulnerable dependencies with regression checks.
- Review new source/assets for secrets, personal files and third-party provenance. Confirm MIT and all upstream license/notice files are present in the packaged output.
- Preserve exact corresponding sources and build scripts for the bundled FFmpeg and its dependencies, including any notices/source offers required by their licenses. Arrange durable release source hosting/materials before distributing binaries; upstream links alone are not the release source package.
- Confirm FFmpeg/FFprobe work on a clean Windows machine without developer PATH or environment variables. Exercise save/open, recovery, PNG, audio MP4/WebM, cancel, install and uninstall.
- Configure signing when available and verify signatures. If publishing an unsigned alpha, describe that fact accurately without bypass instructions.
- Create checksums for final artifacts, attach validation and matching source materials, and review the release notes before publishing a GitHub Release. Do not upload build caches or private sample projects.

All source changes go through a feature branch and PR to `main`. Publishing a tagged binary release is a separate maintainer action.
