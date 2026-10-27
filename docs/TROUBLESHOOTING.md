# Troubleshooting

## Installation or Node version fails

Use Node.js 24 LTS (or 22.x at 22.12+) and run `npm ci` in the repository root. Check `node --version` and `npm --version`. Errors such as `ENOTFOUND` or certificate failures indicate registry/network configuration; preserve normal TLS verification rather than disabling it. Report the failing command and sanitized error in an issue.

## Port 5173 is occupied

Close an earlier AlgorithAct development server before launching another. Vite uses a strict port, and `dev:desktop` expects the loopback address at that port. Do not kill unrelated processes blindly.

## `npm start` cannot find the app

`npm start` launches the packaged Windows executable. Run `npm run package:win` first, or use `npm run dev:desktop` for development.

## Packaging says FFmpeg is missing or has a checksum mismatch

Run `npm run prepare:ffmpeg -- --download` on Windows x64 or supply the exact [pinned local archive](../resources/ffmpeg/README.md). Rolling `latest` archives can change and are intentionally rejected. Do not change hashes to accept an unknown download. Windows ARM64 and other platforms need separately validated bundles.

## MP4/WebM export is unavailable or cannot start

Browser preview supports PNG only. In desktop development, prepare FFmpeg and restart. Explicit `ANIM_FFMPEG_PATH`/`ANIM_FFPROBE_PATH` settings override bundled files, so check for stale overrides. Packaged copies must keep the entire app folder and `resources/ffmpeg/` intact. Do not copy just `AlgorithAct.exe`.

The selected build must support `libopenh264`, `libvpx-vp9`, AAC and Opus. Odd frame dimensions are rejected for video. Only one export may run at a time; cancel or wait before retrying. On error, an existing destination should remain intact. Include the readable error and a synthetic sample when reporting failures.

## Imported audio or image is rejected

Check the limits and supported extensions in the [user guide](USER_GUIDE.md). Audio decoding depends on the runtime's codecs. A compressed audio file can exceed decoded cache limits even when its input size is small. Convert a copy with a trusted tool if needed, and keep the original.

## Scene or panel does not fit

Press `Shift+1` to fit the scene, `F` for focus, and `L`/`I` to toggle panels. At compact widths, opening layers can hide the inspector. Resize/collapse the timeline to recover canvas space.

## Recovery keeps appearing

The app found a local recovery copy. Choose **Tiklash** to recover it and explicitly save the project. **O‘tkazib yuborish** discards that recovery copy. If it is the only copy you need, recover/save before discarding. The Windows recovery folder is `%APPDATA%/algorithco-animation/recovery/`.

## E2E tests skip or golden pixels differ

Install Chrome and follow [testing](TESTING.md). Native tests require media-tool paths and a build; packaged tests require `ANIM_PACKAGED_APP`. Golden references are Windows/Chrome/SwiftShader/Arial-specific. Inspect `.qa/golden-diffs/` and environment versions before considering a baseline change. Skipped desktop checks are not validation of video export.

## AI does not generate animation

The AI tab is a coming-soon screen. There is no API key setting or AI service to configure in this version.
