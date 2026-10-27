# Documentation

AlgorithAct is an early alpha. Start with the maintained guides below; dated QA and research files describe the environment and implementation at the time they were written.

## Use the app

- [Getting started](GETTING_STARTED.md): prerequisites and first launch.
- [User guide](USER_GUIDE.md): workspace, animation, audio, save/recovery and export.
- [Troubleshooting](TROUBLESHOOTING.md): common setup and runtime issues.
- [Roadmap](ROADMAP.md): implemented scope and remaining work.

## Build and contribute

- [Development](DEVELOPMENT.md): commands, code layout and conventions.
- [Architecture](ARCHITECTURE.md): contracts, engine, renderer, storage and Electron boundaries.
- [Project format](PROJECT_FORMAT.md): `.anim` container and model v1.
- [Testing](TESTING.md): unit/property, browser, desktop, golden and benchmark checks.
- [Building and releases](BUILDING.md): Windows packaging and release checklist.
- [Contributing](../CONTRIBUTING.md), [security](../SECURITY.md), [support](../SUPPORT.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).

## Design decisions

| Decision | Topic |
| --- | --- |
| [0001](decisions/0001-frame-transport.md) | Electron frame transport constraints |
| [0002](decisions/0002-audio-preview-export.md) | Audio clock and offline export |
| [0003](decisions/0003-export-capture-and-transport.md) | Capture, backpressure and frame packets |
| [0004](decisions/0004-company-workspace-and-ai-build.md) | Workspace design and AI placeholder |
| [0005](decisions/0005-canvas-first-layout.md) | Canvas, panels and timeline layout |
| [0006](decisions/0006-bundled-media-tools.md) | Bundled FFmpeg/FFprobe and export validation |

These original decision notes are in Uzbek. Keep their historical context when comparing versions.

## Project history and evidence

[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [PROGRESS.md](PROGRESS.md) retain the original milestones and dated results. [Technology research](research/video-editor-technology-research-2026-10-25.md) and [character direction](research/original-character-direction-2026-10-25.md) record exploration rather than current feature promises. The original design reference is [System Design.docx](<../Animatsion video muharriri — System Design.docx>).

The `qa/` directory contains screenshots, measurements and [retarget QA](qa/retarget.md). `benchmarks/` contains environment-specific measurements, including [the original continuous Windows export result](benchmarks/windows-1080p60s-audio-continuous.json). Those timings predate the runtime update for source publication and are not measurements of every build or platform.
