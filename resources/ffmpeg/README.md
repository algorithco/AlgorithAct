# FFmpeg runtime

Windows x64 packages carry FFmpeg, FFprobe and seven shared DLLs in `resources/ffmpeg/win32-x64/`, outside `app.asar`. Executables and DLLs are ignored by Git; the manifest, licenses, build configuration and notice are committed.

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

There is currently no pinned runtime for Windows ARM64, macOS or Linux. Adding a platform requires a verified manifest, license/source materials and native export tests.
