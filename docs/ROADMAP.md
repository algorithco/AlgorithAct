# Roadmap

This is a description of current scope and priorities, not a schedule or release commitment. The original implementation plan and dated results are retained in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [PROGRESS.md](PROGRESS.md).

## Available in the alpha

- Local Manual editor, Original/Novcha characters and five shared motions.
- Pose/transform/text animation, keys and easing, timeline, canvas layout and history.
- Image/audio import, waveform/trim/gain/fades and offline audio export.
- `.anim` files, integrity checks, recovery and desktop backups.
- PNG, native audio MP4/WebM, export cancellation and output validation.
- Windows x64 application and installer build tooling with bundled media tools.

## Next validation and usability work

| Area | Remaining work |
| --- | --- |
| Scene/timeline | Duration/FPS/frame presets UI, camera key UX, clip trim/resize, key dragging and large timeline virtualization |
| Text and content | Project font embedding, portable text/audio references and final character art QA |
| Performance | Ten-character/key-heavy preview, memory/stress/soak, portrait and software GPU profiles |
| Reliability | Recovery/backup failure injection, crash diagnostics and long-run checks |
| Distribution | Clean-machine installer QA, signing, complete FFmpeg corresponding-source materials and durable runtime availability |
| Platforms | macOS/Linux packaging and audio/video QA; Windows ARM64 runtime validation |
| Accessibility/localization | Broader keyboard/screen-reader QA and additional interface languages |

## Later possibilities

Multi-scene editing, motion baking, character authoring, plugin support and 3D require separate design work. **AI Build has no generation implementation or committed launch date.** Propose changes through [GitHub Issues](https://github.com/algorithco/AlgorithAct/issues), with a user problem and a focused scope.
