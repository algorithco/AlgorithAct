# FFmpeg runtime

Release packages carry native FFmpeg and FFprobe executables in `resources/ffmpeg/<platform>-<arch>/`, outside `app.asar`. Windows x64, macOS x64/ARM64 and Linux x64/ARM64 use the same pinned source revisions and build script. Generated binaries and manifests are ignored by Git.

## Build the release runtime from source

Install native build tools:

- Linux: C/C++ compiler, Make, CMake, NASM, pkg-config and tar (`sudo apt-get install build-essential cmake nasm pkg-config`).
- macOS: Xcode command line tools, CMake, NASM and pkg-config (`brew install cmake nasm pkgconf`).
- Windows x64: MSYS2 MINGW64 with `make`, `diffutils`, `mingw-w64-x86_64-gcc`, `mingw-w64-x86_64-cmake`, `mingw-w64-x86_64-pkgconf` and `mingw-w64-x86_64-nasm`. Run the command in the MINGW64 shell with Node.js on PATH.

```sh
npm run build:ffmpeg
```

[sources.json](sources.json) pins full upstream commits and archive SHA-256 hashes for FFmpeg, OpenH264 2.6.0, libvpx 1.15.2 and Opus 1.5.2. The downloader verifies each source archive before extraction. Sources are cached in `.qa/ffmpeg-sources/`; verified local archives can be supplied there for offline rebuilding. The compiler builds static codec libraries and standalone FFmpeg/FFprobe, without GPL/nonfree options or network support. The enabled media formats cover the app's H.264/VP9/AAC/Opus export and audio verification paths.

Each target gets `BUILD-MANIFEST.json` with executable sizes/hashes and the source-lock digest, `SOURCE-BUILD.txt` with configuration/provenance, and `LICENSES/` with FFmpeg and codec licenses and patent notices. Packaging rejects changed binaries or a stale source lock. Only that target's runtime is copied into the application.

To preserve the complete matching source material:

```sh
node tools/build-ffmpeg.mjs --sources-only
```

This creates `release/installer/AlgorithAct-FFmpeg-Sources-<version>.tar.gz` containing the original archives, source lock and both build scripts. The GitHub release workflow attaches this archive beside all installers and includes it in `SHA256SUMS.txt`. To rebuild, use the tagged app source, extract the source-material archive into the checkout, install the prerequisites above and run `npm run build:ffmpeg`; cached archives are verified and reused. The build scripts are also available at [build-ffmpeg.mjs](../../tools/build-ffmpeg.mjs) and [compile-ffmpeg.sh](../../tools/compile-ffmpeg.sh).

## Legacy Windows developer runtime

The optional BtbN Windows x64 runtime carries FFmpeg, FFprobe and seven shared DLLs. It is retained for existing developer commands and the original Windows CI. Published cross-platform packages use the source-built runtime above.

## Prepare

On Windows x64, explicitly download and verify the pinned archive:

```sh
npm run prepare:ffmpeg -- --download
```

For offline preparation:

```powershell
npm run prepare:ffmpeg -- 'C:\path\ffmpeg-N-128094-g31855b2a70-win64-lgpl-shared.zip'
```

Alternatively set `ANIM_FFMPEG_ARCHIVE` to that archive and run `npm run prepare:ffmpeg`. The default cache is `.qa/ffmpeg/download.zip`. Packaging does not silently download an archive: it verifies installed runtime files and, if needed, extracts the supplied/cache archive. Missing or mismatched runtime files fail packaging.

## Pinned provenance

| Field | Value |
| --- | --- |
| Build | BtbN FFmpeg LGPL shared, `N-128094-g31855b2a70-20261025` |
| Source revision | `31855b2a70` |
| Release | `autobuild-2026-10-25-13-00` |
| Archive | `ffmpeg-N-128094-g31855b2a70-win64-lgpl-shared.zip` |
| Archive SHA-256 | `4505cfba7f38187dedbfa0d761e76c9a147630930e8750b62f58e0c4f80b6994` |
| License | LGPL-3.0-or-later; dependencies retain their licenses |

The exact [upstream archive](https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-10-25-13-00/ffmpeg-N-128094-g31855b2a70-win64-lgpl-shared.zip) and every extracted binary are checked against [win32-x64.json](win32-x64.json). A dated release is used because rolling `latest` assets change. Upstream retention is not guaranteed; maintainers must preserve permitted release materials durably before binary distribution.

The prior local QA archive was the rolling-name ZIP with SHA-256 `983856fd31b48023f04d39118d0d0d29d97c7746378b01dcf8c985a699bd79a6`. The dated ZIP has a different directory/archive checksum; all nine executable/DLL hashes are identical. Use the dated archive for new checkouts.

## Developer overrides

```powershell
$env:ANIM_FFMPEG_PATH = 'C:\tools\ffmpeg\bin\ffmpeg.exe'
$env:ANIM_FFPROBE_PATH = 'C:\tools\ffmpeg\bin\ffprobe.exe'
npm run dev:desktop
```

Resolution order is explicit override, packaged resources, checkout resources, then PATH. Without an explicit FFprobe override, the probe beside an explicit FFmpeg is preferred. The selected build needs OpenH264, VP9, AAC and Opus. Custom tools are trusted code and should be obtained from a trusted source.

## Licensing and releases

Keep [COPYING.LGPLv3](win32-x64/COPYING.LGPLv3), [COPYING.GPLv3](win32-x64/COPYING.GPLv3), [NOTICE.txt](win32-x64/NOTICE.txt) and [BUILD-CONFIG.txt](win32-x64/BUILD-CONFIG.txt) alongside the binaries. The tools are unmodified and replaceable external processes.

Sources: [FFmpeg revision](https://github.com/FFmpeg/FFmpeg/tree/31855b2a70), [BtbN build/dependency scripts](https://github.com/BtbN/FFmpeg-Builds), [FFmpeg licensing](https://ffmpeg.org/legal.html). Before distributing installers, preserve the corresponding dependency sources, scripts and any required notices/source offers as described in [building and releases](../../docs/BUILDING.md) and [third-party notices](../../THIRD_PARTY_NOTICES.md).

Windows ARM64 does not yet have a release source-build configuration. macOS/Linux releases use the pinned native source builds above.
