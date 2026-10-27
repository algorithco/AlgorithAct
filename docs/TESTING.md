# Testing

Use `npm ci` and Node.js 24 LTS. All commands run from the repository root. Generated reports and profiles are ignored by Git.

## Core checks

```sh
npm run check
npm run build
```

`check` runs TypeScript strict, ESLint, dependency-cruiser architecture/cycle rules, local Markdown link checks and Vitest. Unit/property coverage includes model/ZIP validation, deterministic evaluation, retargeting, history, audio scheduling/WAV, export cancellation/overlap, frame packets and FFmpeg resolution. `build` also generates content and full production dependency license texts.

## Browser workflows

Playwright uses the installed Chrome channel and SwiftShader. Install Chrome if needed using Playwright's official installer, or use an existing Chrome installation:

```sh
npx playwright install chrome
npm run test:e2e -- --project=workflows
```

The Vite web server is started automatically on `127.0.0.1:5173`. Browser tests cover editing, layout, audio, project roundtrips and different rig proportions. Native export tests in that project are skipped unless their environment is configured. Treat skips as skips, not successful desktop validation.

## Native desktop export

On Windows x64:

```powershell
npm run prepare:ffmpeg -- --download
npm run build
$env:ANIM_FFMPEG_PATH = (Resolve-Path 'resources/ffmpeg/win32-x64/ffmpeg.exe').Path
$env:ANIM_FFPROBE_PATH = (Resolve-Path 'resources/ffmpeg/win32-x64/ffprobe.exe').Path
npm run test:e2e -- tests/e2e/desktop.spec.ts --project=workflows --workers=1
```

These tests launch real Electron instances, export MP4/WebM with audio, decode/probe output and check cancellation, existing destination preservation and frame transport. Test profiles live under `.qa/`.

## Packaged app

```powershell
npm run package:win
$env:ANIM_PACKAGED_APP = (Resolve-Path 'release/AlgorithAct-win32-x64/AlgorithAct.exe').Path
npm run test:e2e -- tests/e2e/packaged-export.spec.ts --project=workflows --workers=1
```

The child app has PATH and media-tool overrides cleared, so these checks exercise the bundled executables and DLLs. They verify audio/video dimensions, duration and frame counts, plus a readable startup failure preserving the previous output.

Window-control tests also cover minimize/maximize, keyboard-accessible close confirmation, cancelled/failed saves, recovery failure and stopping an active export. Set `ANIM_DESKTOP_EXECUTABLE` to the packaged executable to exercise those tests against the distributed app; CI uses this mode.

## Golden frames

```sh
npm run test:e2e
```

The `golden` project runs after `workflows` to avoid concurrent GPU contexts. References in `tests/golden-frames/` were recorded on Windows, Chrome 155, SwiftShader and Arial. They compare preview/export RGBA, PNG/raw consistency, seeking and camera changes, with tightly bounded rounding tolerance. They are not portable font-rendering baselines for Linux/macOS.

The original camera reference also has a hash-bound list of 27 reviewed, single-channel text-edge rounding positions. Frames exceeding the generic budget pass only when every difference is an exact one-level rounding on that list. See [pixel analysis and constraints](qa/golden-pixel-rounding.md). The reference PNGs and all preview/export and PNG/raw equality checks remain unchanged.

After an intentional, reviewed visual change, regenerate with `npm run test:golden:update`, inspect every image and include the rationale in the PR. Do not loosen tolerances or update references to hide a regression. Review the hash-bound mask separately when references change. Chrome updates can require an environment investigation before a baseline decision.

## Extended checks

```sh
npm run test:history
```

This runs 10,000 seeded mixed edit/undo/redo sequences and writes `docs/benchmarks/history-10000.json`. It checks model/history invariants, not media decoding or long-running UI stability. Review changes to the recorded report before committing.

```powershell
$env:ANIM_FFMPEG_PATH = (Resolve-Path 'resources/ffmpeg/win32-x64/ffmpeg.exe').Path
npm run benchmark:export -- --continuous
```

The benchmark exports 1080p/30 video with stereo markers. `--seconds=10` is a short profile and `--software` uses SwiftShader. Results are written to `docs/benchmarks/`; include the hardware, runtime, scene and arguments when quoting timings. Existing measurements are dated evidence, not a universal performance claim.

## Separate test lifecycles

The same suite can run in three stages:

```sh
npm run test:e2e:browser -- --workers=1
npm run test:e2e:desktop -- --workers=1
npm run test:e2e:golden -- --workers=1
```

Desktop tests use only Electron and do not start Vite. Browser workflows and golden frames each own a fresh Vite lifecycle. CI uses these stages because Windows Electron process teardown can interrupt a development server sharing the same test process tree. Desktop tests still require the environment setup above.

## CI scope

The quality jobs run core checks/builds on Ubuntu and Windows. The Windows desktop job prepares the pinned media runtime, packages the application and runs browser, native, packaged and golden checks. Failure artifacts include reports and relevant QA images/metrics; packaged installers and user media are not uploaded. No cross-platform desktop certification or code signing is implied by these jobs.
