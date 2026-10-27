import type { AudioClip } from '../model/schema/project';

export interface AudioSchedule {
  whenMs: number;
  offsetMs: number;
  durationMs: number;
  envelope: { atMs: number; value: number }[];
}
export function gainAt(clip: AudioClip, localMs: number): number {
  if (clip.muted || localMs < 0 || localMs > clip.durationMs) return 0;
  const fadeIn = clip.fadeInMs ? localMs / clip.fadeInMs : 1;
  const fadeOut = clip.fadeOutMs ? (clip.durationMs - localMs) / clip.fadeOutMs : 1;
  return clip.gain * Math.max(0, Math.min(1, fadeIn, fadeOut));
}
/** Pure schedule shared by realtime and offline Web Audio graphs. */
export function planAudioClip(clip: AudioClip, fromMs: number, untilMs: number, assetDurationMs: number): AudioSchedule | null {
  if (clip.muted || clip.gain === 0) return null;
  const start = Math.max(fromMs, clip.startMs);
  const end = Math.min(untilMs, clip.startMs + clip.durationMs, clip.startMs + assetDurationMs - clip.trimInMs);
  if (end <= start) return null;
  const localStart = start - clip.startMs, localEnd = end - clip.startMs;
  const crossing = clip.fadeInMs && clip.fadeOutMs ? clip.durationMs * clip.fadeInMs / (clip.fadeInMs + clip.fadeOutMs) : 0;
  const points = [...new Set([localStart, localEnd, clip.fadeInMs, clip.durationMs - clip.fadeOutMs, crossing])]
    .filter(t => t >= localStart && t <= localEnd).sort((a, b) => a - b);
  return {
    whenMs: start - fromMs, offsetMs: clip.trimInMs + localStart, durationMs: end - start,
    envelope: points.map(t => ({ atMs: t - localStart, value: gainAt(clip, t) })),
  };
}
