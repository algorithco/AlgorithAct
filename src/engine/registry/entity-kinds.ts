import type { EntityKindDef, DrawNode2D } from '../../contracts';
import { identity, multiply, transform } from '../eval/matrix';

export const builtinEntityKinds: EntityKindDef[] = [
  { kind:'character', toNodes(entity,project,poses) {
    if (entity.kind!=='character') return [];
    const character=project.library.characters[entity.characterId], skin=project.library.skins[character.skinId];
    return skin.parts.map((part,index) => ({ part,index })).sort((a,b)=>a.part.drawOrder-b.part.drawOrder).map(({part,index}) => ({
      key:`${entity.id}/${index}`, entityId:entity.id, opacity:entity.opacity,
      world:multiply(poses[part.bone],{...identity(),tx:-part.pivot.x,ty:-part.pivot.y}),
      draw:{type:'art',skinId:skin.id,part:index,palette:{...skin.palette,...entity.paletteOverride}},
    }));
  } },
  { kind:'image', toNodes(entity) {
    return entity.kind==='image' ? [{key:entity.id,entityId:entity.id,world:transform(entity.transform),opacity:entity.opacity,draw:{type:'image',assetId:entity.assetId}}] : [];
  } },
  { kind:'text', toNodes(entity) {
    return entity.kind==='text' ? [{key:entity.id,entityId:entity.id,world:transform(entity.transform),opacity:entity.opacity,draw:{type:'text',text:entity.text,size:entity.size,color:entity.color}}] : [];
  } },
  { kind:'camera', toNodes: () => [] },
];
export function createEntityRegistry(kinds: EntityKindDef[]) {
  const registry=new Map(kinds.map(k=>[k.kind,k]));
  return (kind: EntityKindDef['kind']) => registry.get(kind);
}
export type NodeList = DrawNode2D[];
