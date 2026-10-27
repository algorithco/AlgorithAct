# Security policy

## Supported versions

Security fixes target the current `main` branch and the next release. Older alpha snapshots do not receive separate backports. Keep Electron and other dependencies current before distributing builds.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/algorithco/AlgorithAct/security/advisories/new). Do not post working exploits, secrets or private media in public issues. Include affected versions, reproduction steps, expected impact and a minimal sample you are permitted to share. Maintainers will assess reports and coordinate fixes/disclosure; no response-time guarantee is offered.

## Security boundaries

- Electron uses context isolation, sandboxing and disabled Node integration. A typed preload exposes specific operations; privileged handlers check their sender.
- The app denies new windows, navigations and runtime permission requests. CSP restricts content to local resources, with a local Vite connection during development.
- Project input is schema-validated. ZIP entries are allowlisted and bounded; media is checked with SHA-256. Integrity checks do not prove a file is trustworthy.
- FFmpeg is a separate process. Explicit media-tool paths are developer-controlled code execution settings; use trusted binaries.
- Recovery and `.bak` files are local, unencrypted copies. A `.anim` file embeds imported media, including audio.

Keep development servers local. Avoid opening unknown media in outdated builds. There is no automatic app updater or remote AI generation.
