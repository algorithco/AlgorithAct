# Contributing to AlgorithAct

English and Uzbek are welcome in issues and pull requests. The editor is an early alpha; small, focused changes are easier to review.

## Before you start

Read the [Code of Conduct](CODE_OF_CONDUCT.md), [development guide](docs/DEVELOPMENT.md) and [architecture](docs/ARCHITECTURE.md). Search existing issues before reporting a bug. Discuss new subsystems, format changes, dependencies or major interface work in an issue first. Report vulnerabilities through [SECURITY.md](SECURITY.md).

## Local setup

Fork the repository if you do not have write access, then:

```sh
git clone https://github.com/YOUR-USERNAME/AlgorithAct.git
cd AlgorithAct
npm ci
git switch -c fix/describe-the-change
npm run dev:desktop
```

Use Node.js 24 LTS; see [getting started](docs/GETTING_STARTED.md). Prepare FFmpeg when working on video export or Windows packaging.

## Make a focused change

- Preserve the deterministic engine boundary. Do not add React, PixiJS, Electron, filesystem calls, wall-clock time or randomness to `src/engine/`.
- Keep shared interfaces in `src/contracts/` and project validation in `src/model/`.
- Add meaningful regression coverage for behavior changes. Documentation and visual-only fixes do not need tests that merely repeat the implementation.
- Preserve project compatibility. Discuss format/schema changes and include migration tests.
- Justify new dependencies, update the lockfile and preserve their notices.
- Keep builds, FFmpeg executables, secrets, personal media and `.anim` work files out of commits.
- Include screenshots for visual changes. Do not regenerate pixel references just to make a failing test pass.

## Validate

```sh
npm run check
npm run build
```

Run [relevant E2E or desktop checks](docs/TESTING.md) for interaction, audio, storage, renderer or export changes. Report passes and skips with reasons. Benchmark claims need a reproducible scene and environment details.

## Open a pull request

Push a feature branch and open a PR targeting `main`. Direct pushes to `main` are not the contribution workflow. Describe the problem, resulting behavior, linked issue, validation and limitations. Use descriptive commits such as `fix: preserve audio trim after seek`.

CI checks types, lint, import boundaries, docs links, unit tests, builds and Windows workflows. A maintainer reviews changes before merging. Keep follow-up commits on the same branch; avoid rewriting shared history during review unless requested.

## License

Contributions are provided under the project's [MIT License](LICENSE). Only submit materials you have the right to contribute. Identify external sources and licenses; third-party materials are not automatically relicensed under MIT.
