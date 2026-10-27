# Camera golden: bounded text-edge rounding

The original five PNG references remain unchanged. The camera reference previously exceeded the generic 16-pixel rounding budget: 27 changed pixels were already recorded in the dated [progress notes](../PROGRESS.md). The source-publication checks reproduced the same count locally and in Windows CI.

Byte analysis of the 1920×1080 camera frame found 27 differences, all exactly one 8-bit level in a single RGB channel, with no alpha change. Twenty-six are in the blue channel and one in green, at the text edges. Preview/export RGBA hashes and PNG/raw hashes remained identical. The other four frames each differed in nine pixels, inside the existing budget.

The [reviewed mask](../../tests/golden-frames/camera-rounding-mask.json) records those exact `(x, y, channel)` positions and is bound to the original reference PNG's SHA-256. The test retains the generic 16-pixel budget. A frame exceeding it passes only when **every** difference is a one-level change at the reviewed channel/coordinate, with no more pixels than the explicit list. Larger channel differences, unlisted extra pixels and changed baseline bytes still fail. The preview/export and PNG/raw equality assertions are unchanged.

Do not expand this list automatically. A renderer, artwork, text or reference update requires inspection and a separate review of the mask. This narrow exception handles the measured camera-text quantization; it is not a general visual tolerance increase.
