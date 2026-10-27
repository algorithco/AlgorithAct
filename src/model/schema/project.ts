import { z } from 'zod';

export type Id = string;
export type Ms = number;
const json: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(json), z.record(z.string(), json)]));
const id = z.string().min(1).max(160).refine(v => !['__proto__', 'constructor', 'prototype'].includes(v), 'Noto‘g‘ri ID');
const n = z.number().finite();
const ms = n.int().min(0).max(86_400_000);
const color = z.string().regex(/^(#[\da-fA-F]{6}([\da-fA-F]{2})?|\$[\w]+)$/);
const extensions = z.record(z.string(), json);
const record = <T extends z.ZodType>(schema: T) => z.record(id, schema);
export const transformSchema = z.object({ x: n, y: n, rotation: n, scaleX: n, scaleY: n });
export const easeSchema = z.union([z.enum(['linear', 'step', 'in', 'out', 'inOut']), z.object({ bezier: z.tuple([n.min(0).max(1), n, n.min(0).max(1), n]) })]);
export const valueSchema = z.union([n, z.string(), z.boolean(), z.tuple([n, n])]);
const keySchema = z.object({ t: ms, v: valueSchema, ease: easeSchema });
export const trackSchema = z.object({
  id, path: z.string().regex(/^(pose\.[A-Za-z][\w]*|transform\.(x|y|rotation|scaleX|scaleY)|opacity|size|color|text|x|y|zoom|rotation)$/),
  type: z.enum(['number', 'vec2', 'color', 'bool', 'string']), blend: z.enum(['replace', 'add']), keys: z.array(keySchema).max(100_000),
});
const base = { id, name: z.string().max(500), visible: z.boolean(), locked: z.boolean(), extensions };
export const entitySchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('character'), characterId: id, transform: transformSchema, opacity: n.min(0).max(1), paletteOverride: record(color).optional(), pose: record(n) }),
  z.object({ ...base, kind: z.literal('text'), text: z.string().max(10_000), fontAssetId: id.optional(), size: n.min(1).max(1000), color, transform: transformSchema, opacity: n.min(0).max(1) }),
  z.object({ ...base, kind: z.literal('image'), assetId: id, transform: transformSchema, opacity: n.min(0).max(1) }),
  z.object({ ...base, kind: z.literal('camera'), x: n, y: n, zoom: n.min(.01).max(100), rotation: n }),
]);
const clipBase = { id, startMs: ms, durationMs: ms.min(1), lane: n.int().min(0), muted: z.boolean(), extensions };
export const clipSchema = z.discriminatedUnion('kind', [
  z.object({ ...clipBase, kind: z.literal('motion'), entityId: id, motionId: id, offsetMs: ms, speed: n.positive().max(20), loop: z.boolean(), blendInMs: ms, blendOutMs: ms, weight: n.min(0).max(1) }),
  z.object({ ...clipBase, kind: z.literal('audio'), assetId: id, trimInMs: ms, gain: n.min(0).max(10), fadeInMs: ms, fadeOutMs: ms }),
]);
const stroke = z.object({ color, width: n.positive(), cap: z.enum(['round', 'butt']).optional() });
const shapeSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('path'), d: z.string().max(100_000), fill: color.optional(), stroke: stroke.optional() }),
  z.object({ t: z.literal('rect'), x: n, y: n, width: n, height: n, radius: n.min(0).optional(), fill: color, stroke: stroke.optional() }),
  z.object({ t: z.literal('ellipse'), x: n, y: n, rx: n.positive(), ry: n.positive(), fill: color, stroke: stroke.optional() }),
  z.object({ t: z.literal('line'), x1: n, y1: n, x2: n, y2: n, stroke }),
]);
export const rigSchema = z.object({ id, name: z.string(), profile: id, space: z.literal('2d'), bones: z.array(z.object({ key: id, parent: id.nullable(), rest: z.object({ x: n, y: n, rotation: n }), length: n.min(0), limits: z.tuple([n, n]).optional() })).max(256) });
export const skinSchema = z.object({ id, name: z.string(), rigProfile: id, palette: record(color), parts: z.array(z.object({ bone: id, drawOrder: n, pivot: z.object({ x: n, y: n }), art: z.discriminatedUnion('kind', [z.object({ kind: z.literal('vector'), shapes: z.array(shapeSchema).max(500) }), z.object({ kind: z.literal('image'), assetId: id })]) })).max(500) });
export const characterSchema = z.object({ id, name: z.string(), rigId: id, skinId: id });
export const motionSchema = z.object({ id, name: z.string(), profile: id, space: z.literal('2d'), durationMs: ms.min(1), loop: z.boolean(), tracks: z.array(trackSchema), tags: z.array(z.string()), origin: z.object({ libraryId: id, version: n.int().positive() }).optional() });
export const assetSchema = z.object({ id, kind: z.enum(['image', 'audio', 'font', 'video', 'model3d']), name: z.string().max(500), hash: z.string().regex(/^[a-f0-9]{64}$/), bytes: n.int().min(0).max(100_000_000), meta: z.object({ width: n.positive().max(16384).optional(), height: n.positive().max(16384).optional(), durationMs: ms.optional() }).optional() });
export const backgroundSchema = z.discriminatedUnion('type', [z.object({ type: z.literal('color'), color }), z.object({ type: z.literal('image'), assetId: id, fit: z.enum(['cover', 'contain']) })]);
export const sceneSchema = z.object({
  id, name: z.string(), space: z.literal('2d'), durationMs: ms.min(1).max(300_000), background: backgroundSchema,
  entities: record(entitySchema), entityOrder: z.array(id), cameraId: id,
  timeline: z.object({ tracks: record(trackSchema.extend({ entityId: id })), clips: record(clipSchema) }), extensions,
});
export const projectSchema = z.object({
  formatVersion: z.literal(1), id,
  meta: z.object({ name: z.string().min(1).max(500), createdAt: z.iso.datetime(), modifiedAt: z.iso.datetime(), writtenBy: z.string() }),
  settings: z.object({ fps: n.int().min(1).max(60), frame: z.object({ width: n.int().min(64).max(3840), height: n.int().min(64).max(3840) }) }),
  assets: record(assetSchema),
  library: z.object({ rigs: record(rigSchema), skins: record(skinSchema), characters: record(characterSchema), motions: record(motionSchema) }),
  scenes: record(sceneSchema), sceneOrder: z.array(id).min(1), extensions,
});

export type Transform2D = z.infer<typeof transformSchema>;
export type Ease = z.infer<typeof easeSchema>;
export type Value = z.infer<typeof valueSchema>;
export type Key = z.infer<typeof keySchema>;
export type Track = z.infer<typeof trackSchema>;
export type SceneTrack = Track & { entityId: Id };
export type Entity = z.infer<typeof entitySchema>;
export type CharacterEntity = Extract<Entity, { kind: 'character' }>;
export type MotionClip = Extract<z.infer<typeof clipSchema>, { kind: 'motion' }>;
export type AudioClip = Extract<z.infer<typeof clipSchema>, { kind: 'audio' }>;
export type Clip = z.infer<typeof clipSchema>;
export type RigDef = z.infer<typeof rigSchema>;
export type SkinDef = z.infer<typeof skinSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type MotionDef = z.infer<typeof motionSchema>;
export type CharacterDef = z.infer<typeof characterSchema>;
export type AssetRef = z.infer<typeof assetSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Project = z.infer<typeof projectSchema>;
