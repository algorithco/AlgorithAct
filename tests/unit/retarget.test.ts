import { describe, expect, it } from 'vitest';
import { CONTENT, motions, rig, tallRig } from '../../content/characters/hero/build';
import { builtinEntityKinds, createEvaluator, point } from '../../src/engine';
import type { CharacterEntity } from '../../src/model/schema/project';
import { retargetIds, retargetProject } from '../helpers/retarget-fixture';

const evaluator=createEvaluator(builtinEntityKinds);
describe('motion reuse across different humanoid proportions',()=>{
  it('uses a distinct rig and matching skin geometry rather than a scaled recolor',()=>{
    const project=retargetProject(motions[0]),original=project.library.characters[CONTENT.character],tall=project.library.characters[CONTENT.tealCharacter];
    expect(tall.rigId).not.toBe(original.rigId);
    const length=(which:typeof rig,key:string)=>which.bones.find(b=>b.key===key)!.length;
    expect(length(tallRig,'shinL')/length(tallRig,'torso')).toBeGreaterThan(length(rig,'shinL')/length(rig,'torso')*1.4);
    for(const def of [original,tall]){
      const rig=project.library.rigs[def.rigId],skin=project.library.skins[def.skinId];
      for(const bone of rig.bones.filter(b=>b.parent&&b.length)){
        const part=skin.parts.find(p=>p.bone===bone.key)!;expect(part.art.kind).toBe('vector');
        if(part.art.kind==='vector'){const line=part.art.shapes.find(s=>s.t==='line');expect(line?.t==='line'?line.y2:undefined).toBe(bone.length);}
      }
    }
  });
  it.each(motions)('$name preserves joint angles and each rig’s own joint connections through reverse seeks',motion=>{
    const project=retargetProject(motion),before=JSON.stringify(project),sceneId=project.sceneOrder[0];
    const times=[0,Math.round(motion.durationMs*.25),Math.round(motion.durationMs*.5),Math.round(motion.durationMs*.75),motion.durationMs-1];
    const expected=times.map(time=>evaluator.evaluate(project,sceneId,time));
    for(const time of [...times].reverse()){
      const frame=evaluator.evaluate(project,sceneId,time),[left,right]=retargetIds;
      expect(frame).toEqual(expected[times.indexOf(time)]);
      expect((frame.resolved[left] as CharacterEntity).pose).toEqual((frame.resolved[right] as CharacterEntity).pose);
      expect(frame.nodes.filter(n=>retargetIds.some(id=>n.entityId===id))).toHaveLength(20);
      for(const id of retargetIds){
        const entity=frame.resolved[id] as CharacterEntity,definition=project.library.characters[entity.characterId],rig=project.library.rigs[definition.rigId],poses=frame.poses[id];
        for(const bone of rig.bones){
          const matrix=poses[bone.key];expect(Object.values(matrix).every(Number.isFinite)).toBe(true);
          const counterpart=poses===frame.poses[left]?frame.poses[right][bone.key]:frame.poses[left][bone.key];
          for(const axis of ['a','b','c','d'] as const)expect(matrix[axis]).toBeCloseTo(counterpart[axis],12);
          if(bone.parent){const joint=point(poses[bone.parent],bone.rest.x,bone.rest.y);expect(matrix.tx).toBeCloseTo(joint.x,10);expect(matrix.ty).toBeCloseTo(joint.y,10);}
        }
      }
      expect(frame.poses[left].shinL.ty).not.toBeCloseTo(frame.poses[right].shinL.ty,1);
    }
    expect(JSON.stringify(project)).toBe(before);
  });
});
