# User guide

AlgorithAct currently exposes one scene at a time. New projects start with a ten-second sample scene. Scene-settings controls and multi-scene editing are still on the [roadmap](ROADMAP.md).

## Workspace

**Manual** is the working editor. **AI** opens a coming-soon screen, without generation or an external service. Switching modes retains the Manual project, selection, playhead and view, and pauses playback.

| Uzbek label | Purpose |
| --- | --- |
| Qatlamlar | Layers: select, show/hide and lock objects |
| Personaj | Add a character |
| Harakat | Add a reusable motion to the selected character |
| Matn / Rasm / Audio | Add text, import an image or import audio |
| Xususiyatlar | Edit the selected object, key or clip |
| Saqlash / Eksport | Save the editable project / render output |

Use `F` for a larger canvas, `L` for layers and `I` for the inspector. The timeline collapses and its top edge can be dragged to resize it. At smaller widths, layers and inspector share available space. `Shift+1` fits the scene; `H` selects pan mode.

## Characters and motion

Original and Novcha have different proportions and share idle, walk, wave, arm-raise and bend motions. Select a character, choose **Harakat**, and add a motion. Move its clip on the timeline or edit start/duration, speed, looping and blend settings in the inspector.

Press `P` to edit the pose using joint handles. Pose keys override the motion result at that time. Use numeric transforms for position, scale and rotation, and palette controls for character colors. Locked layers cannot be moved or deleted. Text and image objects have their own transform and opacity properties.

## Keys and playback

Scrub by moving the playhead. Arrow keys step one frame; `Home` returns to the start. `K` inserts a key for the selected property context. When auto-key is enabled, editing at the current time creates a key; editing a property that already has a track writes a key even with auto-key off. If a new track begins after time zero, its initial value is preserved at zero.

Select a key to adjust its easing. Undo/redo covers edits, additions and deletions. Related drag changes are grouped, and the save indicator follows the saved history position.

## Images and audio

Images support PNG, JPEG and WebP, up to **20 MB** and **8192 pixels per dimension**. Audio extensions include WAV, MP3, OGG/OGA, M4A/AAC, FLAC and WebM; actual decoding support depends on the runtime. Audio files are limited to **50 MB** and **five minutes**. Decoded audio has a **128 MB per-file** and **192 MB total cache** limit.

Audio clips show waveforms. Move them on the timeline and edit trim-in, duration, gain, mute and fades in the audio inspector. Multiple clips mix together. Preview follows the audio output clock when audio is present; export renders the mix offline as 48 kHz stereo. Undoing an import/edit updates project state as well as the timeline.

## Saving and recovery

**Saqlash** writes a `.anim` ZIP containing project data and imported media, with SHA-256 integrity checks. Keep this file to continue editing. A rendered PNG/MP4/WebM cannot replace the editable project.

Desktop saves use a temporary file and rename, preserving the preceding destination as `.bak`. Recovery writes after an idle delay (about three seconds) with a maximum pending interval of about thirty seconds. On startup, the app offers a recovery copy if one exists. Recovery is a convenience, not a substitute for explicit saves and independent backups.

On Windows, desktop recovery is stored at `%APPDATA%/algorithco-animation/recovery/latest.anim`. The legacy directory name intentionally preserves existing data. Browser recovery uses the `algorithco-studio` IndexedDB database in that browser profile and can be lost if site data is cleared. Recovery and saved media are unencrypted. The installer does not delete project files or recovery data when uninstalling.

## Desktop window controls

Drag an empty part of the header to move the window. The top-right buttons minimize, maximize/restore and close it. Alt+F4 uses the same close flow.

A project with unsaved changes offers **Bekor qilish** (Cancel), **Saqlamasdan chiqish** (Exit without saving) and **Saqlash va chiqish** (Save and exit). A cancelled or failed save keeps the app open. Confirmed exit attempts a recovery write first; recovery storage failure does not prevent an explicitly confirmed discard. Closing during export offers confirmation and stops the encoder before the last window exits.

## Export

PNG captures the current frame. In desktop mode, MP4 uses OpenH264/H.264 with AAC audio; WebM uses VP9 with Opus audio. Only one export runs at a time. The job evaluates frames, renders offscreen, mixes audio and validates the encoded file with FFprobe. The final destination is replaced only after successful completion; cancellation preserves an existing output file.

Video dimensions must be even. Output frame count is `ceil(durationMs × fps / 1000)`; audio is mixed to that exact frame duration. Packaged Windows builds contain media tools. Source checkouts require [runtime preparation](../resources/ffmpeg/README.md). Browser mode offers PNG only.

## Keyboard reference

| Shortcut | Action |
| --- | --- |
| Space | Play/pause |
| Left / Right | Step backward/forward by one frame |
| Home | Start of scene |
| V / P / H | Select / pose / pan |
| K | Insert key |
| F / L / I | Focus / layers / inspector |
| Shift+1 | Fit scene |
| Ctrl+S / Ctrl+O | Save / open |
| Ctrl+D | Duplicate selection |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z or Ctrl+Y | Redo |
| Delete / Backspace | Delete selected object, clip or key |
| Escape | Close an eligible dialog/panel or leave the current selection/tool |

Standard shortcuts use Command on macOS, though macOS desktop builds are unvalidated. Shortcuts are suppressed while typing in fields; a focused button keeps normal Space activation.
