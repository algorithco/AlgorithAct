import { projectSchema, type Project, type Track, type Entity } from './schema/project';

export const CURRENT = 1;
export class ProjectFormatError extends Error {}

export function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || !('formatVersion' in raw)) throw new ProjectFormatError('Loyiha formati topilmadi.');
  const version = raw.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) throw new ProjectFormatError('Format versiyasi noto‘g‘ri.');
  if (version > CURRENT) throw new ProjectFormatError('Bu loyiha yangiroq ilovada yaratilgan. Ilovani yangilang.');
  if (version < CURRENT) throw new ProjectFormatError(`Format ${version} uchun migratsiya mavjud emas.`);
  return raw;
}

function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new ProjectFormatError(message); }
function checkTrack(track: Track) {
  let previous = -1;
  for (const key of track.keys) {
    assert(key.t > previous, `Kalitlar tartibi yoki takroriy vaqt: ${track.id}`);
    previous = key.t;
    const valid = track.type === 'number' ? typeof key.v === 'number'
      : track.type === 'vec2' ? Array.isArray(key.v)
      : track.type === 'bool' ? typeof key.v === 'boolean'
      : typeof key.v === 'string';
    assert(valid, `Kalit qiymati track turiga mos emas: ${track.id}`);
    if (track.type === 'color') assert(typeof key.v === 'string' && /^#[\da-fA-F]{6}([\da-fA-F]{2})?$/.test(key.v), 'Track rangi noto‘g‘ri.');
    if (track.blend === 'add') assert(track.type === 'number' || track.type === 'vec2', 'Faqat son/vektor kanallari qo‘shiladi.');
  }
}
export function isPropertyAllowed(entity: Entity, path: string): boolean {
  if (path.startsWith('pose.')) return entity.kind === 'character';
  if (path.startsWith('transform.')) return entity.kind !== 'camera';
  if (entity.kind === 'camera') return ['x', 'y', 'zoom', 'rotation'].includes(path);
  return path === 'opacity' || (entity.kind === 'text' && ['text', 'size', 'color'].includes(path));
}
export function validateRefs(p: Project): void {
  const checkMap = (map: Record<string, { id: string }>) => {
    for (const [key, item] of Object.entries(map)) assert(key === item.id, `ID xaritaga mos emas: ${key}`);
  };
  for (const map of [p.scenes, p.assets, p.library.rigs, p.library.skins, p.library.characters, p.library.motions]) checkMap(map);
  assert(new Set(p.sceneOrder).size === p.sceneOrder.length && p.sceneOrder.length === Object.keys(p.scenes).length, 'Sahnalar tartibi noto‘g‘ri.');
  for (const id of p.sceneOrder) assert(p.scenes[id], `Sahna topilmadi: ${id}`);
  for (const rig of Object.values(p.library.rigs)) {
    const seen = new Set<string>();
    for (const bone of rig.bones) {
      assert(!seen.has(bone.key) && (!bone.parent || seen.has(bone.parent)), `Skelet tartibi noto‘g‘ri: ${bone.key}`);
      assert(!bone.limits || bone.limits[0] <= bone.limits[1], 'Bo‘g‘in limiti noto‘g‘ri.');
      seen.add(bone.key);
    }
  }
  for (const skin of Object.values(p.library.skins)) for (const part of skin.parts) {
    if (part.art.kind === 'image') assert(p.assets[part.art.assetId]?.kind === 'image', 'Skin rasmi topilmadi.');
  }
  for (const character of Object.values(p.library.characters)) {
    const rig = p.library.rigs[character.rigId], skin = p.library.skins[character.skinId];
    assert(rig && skin && rig.profile === skin.rigProfile, 'Character rig/skin profili mos emas.');
    for (const part of skin.parts) assert(rig.bones.some(b => b.key === part.bone), `Skin bo‘g‘ini topilmadi: ${part.bone}`);
  }
  for (const motion of Object.values(p.library.motions)) for (const track of motion.tracks) {
    checkTrack(track);
    assert(track.path.startsWith('pose.') || track.path.startsWith('transform.'), 'Motion kanali noto‘g‘ri.');
  }
  for (const scene of Object.values(p.scenes)) {
    checkMap(scene.entities); checkMap(scene.timeline.tracks); checkMap(scene.timeline.clips);
    assert(scene.entities[scene.cameraId]?.kind === 'camera', 'Sahna kamerasi topilmadi.');
    assert(scene.entityOrder.length === Object.keys(scene.entities).length && new Set(scene.entityOrder).size === scene.entityOrder.length, 'Qatlamlar tartibi noto‘g‘ri.');
    for (const id of scene.entityOrder) assert(scene.entities[id], `Qatlam topilmadi: ${id}`);
    if (scene.background.type === 'image') assert(p.assets[scene.background.assetId]?.kind === 'image', 'Fon rasmi topilmadi.');
    for (const entity of Object.values(scene.entities)) {
      if (entity.kind === 'character') assert(p.library.characters[entity.characterId], 'Personaj topilmadi.');
      if (entity.kind === 'image') assert(p.assets[entity.assetId]?.kind === 'image', 'Rasm topilmadi.');
    }
    for (const track of Object.values(scene.timeline.tracks)) {
      const entity = scene.entities[track.entityId];
      assert(entity && isPropertyAllowed(entity, track.path), 'Track uchun obyekt yoki xususiyat topilmadi.');
      if (track.path.startsWith('pose.') && entity.kind === 'character') {
        const rig = p.library.rigs[p.library.characters[entity.characterId].rigId];
        assert(rig.bones.some(b => `pose.${b.key}` === track.path), 'Track bo‘g‘ini topilmadi.');
      }
      checkTrack(track);
    }
    for (const clip of Object.values(scene.timeline.clips)) {
      if (clip.kind === 'audio') { assert(p.assets[clip.assetId]?.kind === 'audio', 'Audio topilmadi.'); continue; }
      const e = scene.entities[clip.entityId], m = p.library.motions[clip.motionId];
      assert(e?.kind === 'character' && m, 'Motion personaji yoki harakati topilmadi.');
      const rig = p.library.rigs[p.library.characters[e.characterId].rigId];
      assert(m.profile === rig.profile, 'Motion va rig profili mos emas.');
      for (const track of m.tracks) if (track.path.startsWith('pose.')) assert(rig.bones.some(b => `pose.${b.key}` === track.path), 'Motion bo‘g‘ini topilmadi.');
    }
  }
}
export function parseProject(raw: unknown): Project {
  const result = projectSchema.safeParse(migrate(raw));
  if (!result.success) throw new ProjectFormatError(`Loyiha ma’lumoti noto‘g‘ri: ${result.error.issues[0]?.path.join('.')} — ${result.error.issues[0]?.message}`);
  validateRefs(result.data);
  return result.data;
}
