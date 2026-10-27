# Third-party notices

The [MIT License](LICENSE) covers AlgorithAct's original materials and does not replace other components' licenses. Imported user media remains its owner's responsibility.

## JavaScript

Dependencies include [React/React DOM](https://github.com/facebook/react), [PixiJS](https://github.com/pixijs/pixijs), [Immer](https://github.com/immerjs/immer), [fflate](https://github.com/101arrowz/fflate), [Lucide](https://github.com/lucide-icons/lucide), [ULID](https://github.com/ulid/javascript) and [Zod](https://github.com/colinhacks/zod), plus transitive dependencies.

The lockfile records exact versions and license identifiers. `npm run build:notices` collects installed production license/notice texts in `dist/THIRD_PARTY_LICENSES.txt`. Builds fail if a package has no license file or verified supplement, or differs from the lockfile. Windows packaging includes this file inside `app.asar` at `dist/THIRD_PARTY_LICENSES.txt`. Development dependencies also retain their package licenses.

The `@pixi/colord` 2.9.6 npm tarball omits its license file. Its [upstream MIT text](resources/licenses/colord.LICENSE.txt) is preserved with the exact package version and upstream commit in [the supplement manifest](resources/licenses/manifest.json). A version change must be reviewed before that fallback can be reused.

## Electron and Chromium

Preserve the Electron distribution's `LICENSE`, `LICENSES.chromium.html` and accompanying files. Electron embeds Chromium, Node.js and other components with separate notices. Source: [electron/electron](https://github.com/electron/electron).

## Geist fonts

The UI fonts in `public/fonts/` use **SIL OFL 1.1**. Copyright (c) 2023 Vercel, in collaboration with basement.studio. [Geist-OFL.txt](public/fonts/Geist-OFL.txt) contains the full text and is copied into the build. Source: [vercel/geist-font](https://github.com/vercel/geist-font). UI fonts do not imply a completed project-font embedding pipeline for scene text.

## FFmpeg and FFprobe

Windows uses the unmodified BtbN **LGPL shared** build identified in [win32-x64.json](resources/ffmpeg/win32-x64.json), FFmpeg revision `31855b2a70`. The tools run as external processes and can be replaced through documented environment variables. Executables and DLLs remain outside `app.asar`.

Preserve the accompanying [LGPL text](resources/ffmpeg/win32-x64/COPYING.LGPLv3), [GPL text](resources/ffmpeg/win32-x64/COPYING.GPLv3), [NOTICE.txt](resources/ffmpeg/win32-x64/NOTICE.txt) and [BUILD-CONFIG.txt](resources/ffmpeg/win32-x64/BUILD-CONFIG.txt).

Source/build references: [FFmpeg revision](https://github.com/FFmpeg/FFmpeg/tree/31855b2a70), [BtbN scripts](https://github.com/BtbN/FFmpeg-Builds) and [FFmpeg licensing](https://ffmpeg.org/legal.html). FFmpeg dependencies and codecs retain their conditions. Shipping a GPL text does not mean GPL build options are enabled; the checked-in configuration identifies this build.

Before publishing installers, preserve corresponding FFmpeg/dependency sources, build scripts and any source offers/materials required for that distribution. Upstream links and hashes identify the build but are not, alone, a complete source-distribution package. Follow the [release checklist](docs/BUILDING.md). Initial source publication does not publish FFmpeg binaries or an installer.

## Artwork and research

Original runtime characters are authored in `content/characters/hero/build.ts`. Design explorations/prompts in `docs/research/` are project materials, not imported runtime assets. Research references are not dependencies. Record provenance and licensing before bundling external artwork.
