# Project format: `.anim` v1

The runtime schema in `src/model/schema/project.ts`, semantic checks in `src/model/validate.ts` and ZIP implementation in `src/storage/zip-container.ts` are authoritative. [The test fixture](../tests/fixtures/project.v1.json) is a concrete project JSON example.

## Container

A `.anim` file is a ZIP archive with these paths:

```text
manifest.json
project.json
assets/<64-character lowercase SHA-256>
thumb.png                              # optional; currently not written by save
```

The manifest contains `container: 1`, `formatVersion: 1`, `projectId` and `writtenBy`. Project ID/version must agree with `project.json`. Media paths use content hashes; project asset IDs map to that content through `assets` metadata. Names are not executable paths. Assets are stored without ZIP recompression; JSON is compressed.

Opening preflights the central directory, checks allowed paths, duplicate entries, compression/encryption restrictions and expanded sizes, then parses the project and verifies every referenced asset's byte length and SHA-256. Multi-disk and encrypted ZIPs are not supported. Saving validates data and referenced media again.

## Project structure

| Field | Contents |
| --- | --- |
| `formatVersion` | Literal `1` |
| `id`, `meta` | Project identity, display name, ISO timestamps and writer |
| `settings` | FPS and output frame dimensions |
| `assets` | Asset ID to kind, original display name, hash, bytes and optional metadata |
| `library` | Rigs, skins, character definitions and reusable motions |
| `scenes`, `sceneOrder` | Scene dictionary and ordered scene IDs |
| `extensions` | JSON extension data; not executable plugins |

Scenes contain entities, display order, a camera ID, property tracks, motion/audio clips, background and extensions. Entity kinds are character, text, image and camera. Character definitions join a rig and skin; motions use a rig profile and tracks.

Tracks store a property path, value type, replace/add blend and ordered keys. Key time is in milliseconds; values can be numbers, strings, booleans or two-element vectors. Easing supports named curves and cubic Bézier control points. The validator also checks allowed paths, reference consistency, rig structure and key ordering.

## Limits

All MB values below are decimal bytes.

| Input | Limit |
| --- | --- |
| Compressed `.anim` file | 100,000,000 bytes |
| Total advertised expanded ZIP size | 200,000,000 bytes |
| One JSON entry | 12,000,000 bytes |
| ZIP directory entries | 512 |
| Scene duration | 1–300,000 ms |
| FPS | Integer 1–60 |
| Frame dimension | Integer 64–3840; video export also requires even dimensions |
| Rig bones | 256 |
| Track keys | 100,000 per track |
| Image import | 20,000,000 bytes; 8192 pixels per dimension |
| Audio import | 50,000,000 bytes; 300,000 ms after decoding |

Model-level bounds and import-specific limits serve different purposes. Schema support for asset kinds such as `font`, `video` and `model3d` is not a claim that those import/edit workflows exist.

## Compatibility and privacy

Unknown future project versions are rejected with a readable format error; migration scaffolding is present but there is currently only v1. A future format change must provide an explicit compatibility strategy and tests. Preserve recognized extension data when transforming files.

Projects contain original imported bytes, including audio, plus names and timestamps. Hashes provide integrity and deduplication, not encryption. Inspect a file before sharing it. Recovery and backup copies follow the same privacy considerations.
