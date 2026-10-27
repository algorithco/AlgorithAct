# Development

Use Node.js 24 LTS and `npm ci`. The repository is a desktop application, so `private: true` prevents accidental npm publication; it does not change the MIT source license. Start with [getting started](GETTING_STARTED.md) and [architecture](ARCHITECTURE.md).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Loopback-only Vite web preview on port 5173 |
| `npm run dev:desktop` | Build main/preload and launch Electron against Vite |
| `npm run build:content` | Generate built-in character/motion JSON in `public/content/` |
| `npm run prepare:ffmpeg -- --download` | Fetch and verify the pinned Windows runtime |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint and dependency-cruiser boundaries/cycles |
| `npm run check:docs` | Validate local Markdown links and image paths |
| `npm test` | Unit/property tests |
| `npm run check` | Types, lint, docs and unit tests |
| `npm run build` | Generate content, check types, build renderer/notices/main/preload |
| `npm run test:e2e` | Playwright suite; see platform prerequisites |
| `npm run package:win` | Build and package Windows application directory |
| `npm run installer:win` | Package and build the NSIS installer |
| `npm start` | Launch the packaged Windows app |
| `npm run preview` | Preview the production web build |

`npm start` is not a development command. It requires a prior Windows package. Runtime executables, builds, reports and `.qa/` files are ignored by Git.

## Source map

| Directory | Responsibility |
| --- | --- |
| `src/model` | Zod model and semantic validation |
| `src/contracts` | Shared renderer, audio, storage and export interfaces |
| `src/engine` | Deterministic evaluation, tracks, forward kinematics and operations |
| `src/editor` | React workspace, project store, panels and interaction |
| `src/render-pixi2d` | PixiJS rendering and capture |
| `src/audio` | Scheduling, Web Audio preview/offline mix and PCM WAV |
| `src/storage` | ZIP container, media import, browser and desktop adapters |
| `src/export` | Export orchestration |
| `src/app-electron` | Main process, isolated preload, composition and export worker |
| `content` | Authored procedural character and motion content |
| `tools` | Build, packaging, validation and benchmark helpers |
| `tests` | Unit/property tests, E2E workflows, fixtures and pixel references |

Generated `public/content/` is checked in so a fresh development launch has built-in content. After changing its source, run `npm run build:content` and include generated changes. Never hand-edit generated JSON as the only source of a character change.

## Environment variables

| Variable | Meaning |
| --- | --- |
| `ANIM_DEV_URL` | Main-process renderer URL; set by the desktop development launcher |
| `ANIM_FFMPEG_PATH` | Explicit FFmpeg executable |
| `ANIM_FFPROBE_PATH` | Explicit FFprobe executable |
| `ANIM_FFMPEG_ARCHIVE` | Local pinned FFmpeg ZIP used by preparation/packaging |
| `ANIM_PACKAGED_APP` | Executable for packaged export tests |
| `HISTORY_PROPERTY_RUNS` | History property-test iteration count |

No `.env` file, API keys or cloud account are required. Do not point `ANIM_DEV_URL` at an untrusted server; it is a development override for the application's renderer.

## Changes and dependencies

Follow the [contribution guide](../CONTRIBUTING.md). Add behavior regression coverage where useful, maintain documentation, and keep model changes compatible. Dependency changes require a regenerated lockfile, `npm audit`, full checks and the relevant runtime tests. Do not use `npm audit fix --force` without reviewing its major changes.

The generated dependency notice file must accompany bundled JavaScript. If notice generation fails, investigate the package's actual license; do not silently omit it. Browser/Electron font and GPU differences can affect pixel checks. Follow [testing](TESTING.md) before updating baselines.
