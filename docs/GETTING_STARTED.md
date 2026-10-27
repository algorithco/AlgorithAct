# Getting started

## Requirements

| Requirement | Details |
| --- | --- |
| Node.js | 24 LTS recommended; 22.12+ on the 22.x line is also supported |
| Package installation | npm and the checked-in `package-lock.json` |
| Source checkout | Git |
| Desktop targets | Windows x64; macOS Intel/Apple Silicon; Linux x64/ARM64 |
| Video export | The pinned FFmpeg/FFprobe runtime, or compatible explicit developer tools |
| Browser tests | Chrome; see [testing](TESTING.md) |

Download a packaged app from [GitHub Releases](https://github.com/algorithco/AlgorithAct/releases/tag/v0.1.0); it includes its runtime and video tools. For source development, dependency installation needs internet access. Editing, saving and rendering use local resources after installation. See [release notes](releases/0.1.0.md) for OS requirements and alpha limitations.

## Install and launch

```sh
git clone https://github.com/algorithco/AlgorithAct.git
cd AlgorithAct
npm ci
npm run dev:desktop
```

`dev:desktop` builds the main/preload scripts, starts Vite at `127.0.0.1:5173` and launches Electron. The app opens a sample 1920×1080, 30 FPS scene with a character and text. The UI is in Uzbek.

For the web preview:

```sh
npm run dev
```

Open `http://127.0.0.1:5173`. Desktop file dialogs and video export are not available in web mode; `.anim` open/download, browser recovery and PNG export are available.

## Enable video export from source

On macOS/Linux, or to reproduce a release runtime on Windows x64, install the [native compiler prerequisites](../resources/ffmpeg/README.md), then run `npm run build:ffmpeg`. To make your platform's installer, run `npm run installer:desktop`.

Windows x64 developers can alternatively use the legacy pinned runtime:

```sh
npm run prepare:ffmpeg -- --download
```

This opt-in command downloads the pinned upstream archive and checks its SHA-256 before extraction. No automatic download occurs during editing. To use an already-downloaded archive:

```powershell
npm run prepare:ffmpeg -- 'C:\path\ffmpeg-N-128094-g31855b2a70-win64-lgpl-shared.zip'
```

See [runtime details](../resources/ffmpeg/README.md). Restart desktop development after changing tool paths.

## Make and save an animation

Select the character, choose a motion under **Harakat**, and press `Space`. Scrub the timeline, enable **Avto-kalit**, then drag a pose handle with `P` or edit a transform in **Xususiyatlar**. Choose **Saqlash** to create a `.anim` file. In **Eksport**, choose PNG for the current frame or MP4/WebM for the scene in the desktop app.

Continue with the [user guide](USER_GUIDE.md), [development guide](DEVELOPMENT.md) or [desktop build instructions](BUILDING.md).
