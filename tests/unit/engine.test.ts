import { describe, expect, it } from 'vitest';
import { createDemoProject, rig, motions } from '../../content/characters/hero/build';
import { builtinEntityKinds, createEvaluator, easeAt, fk2d, sample, setKey, clipWeight, invert, multiply, point, transform } from '../../src/engine';
import type { Project, Track, CharacterEntity } from '../../src/model/schema/project';
const demo=()=>createDemoProject((()=>{let i=0;return()=>`test-${++i}`;})(),'2026-10-25T00:00:00.000Z');
const evaluator=createEvaluator(builtinEntityKinds);
const character=(p:Project)=>Object.values(p.scenes[p.sceneOrder[0]].entities).find(e=>e.kind==='character') as CharacterEntity;
const track:Track={id:'test',path:'opacity',type:'number',blend:'replace',keys:[{t:0,v:0,ease:'linear'},{t:1000,v:10,ease:'linear'}]};
describe('track sampling',()=>{
  it('clamps and interpolates arbitrary seek times',()=>{expect(sample(track,-1)).toBe(0);expect(sample(track,250)).toBe(2.5);expect(sample(track,1001)).toBe(10);});
  it('uses outgoing easing and steps at exact key boundaries',()=>{expect(sample({...track,keys:[{t:0,v:0,ease:'step'},{t:500,v:5,ease:'linear'},{t:1000,v:10,ease:'linear'}]},499)).toBe(0);expect(sample({...track,keys:[{t:0,v:0,ease:'step'},{t:500,v:5,ease:'linear'},{t:1000,v:10,ease:'linear'}]},500)).toBe(5);});
  it('does not wrap rotation angles',()=>expect(sample({...track,keys:[{t:0,v:0,ease:'linear'},{t:1000,v:Math.PI*4,ease:'linear'}]},500)).toBe(Math.PI*2));
  it('interpolates color and vectors',()=>{expect(sample({...track,type:'color',keys:[{t:0,v:'#000000',ease:'linear'},{t:1000,v:'#ffffff',ease:'linear'}]},500)).toBe('#808080ff');expect(sample({...track,type:'vec2',keys:[{t:0,v:[0,2],ease:'linear'},{t:1000,v:[4,6],ease:'linear'}]},500)).toEqual([2,4]);});
  it('inverts cubic-bezier x rather than treating it as a time parameter',()=>{expect(easeAt({bezier:[0,0,1,1]},.3)).toBeCloseTo(.3,5);expect(easeAt('inOut',.5)).toBe(.5);});
});
describe('deterministic evaluator',()=>{
  it('seeks backward and forward without accumulated state or project mutation',()=>{const p=demo(),before=JSON.stringify(p),expected=evaluator.evaluate(p,p.sceneOrder[0],1300);for(const t of [9000,0,720,1300,50])evaluator.evaluate(p,p.sceneOrder[0],t);expect(evaluator.evaluate(p,p.sceneOrder[0],1300)).toEqual(expected);expect(JSON.stringify(p)).toBe(before);expect(expected.nodes.length).toBe(14);});
  it('applies manual replacement after clips, then supports additive fine tuning',()=>{const p=demo(),scene=p.scenes[p.sceneOrder[0]],e=character(p);setKey(scene,e.id,'pose.upperArmR',0,.2,'manual');expect((evaluator.evaluate(p,scene.id,900).resolved[e.id] as CharacterEntity).pose.upperArmR).toBe(.2);scene.timeline.tracks.manual.blend='add';const base=demo(),original=(evaluator.evaluate(base,base.sceneOrder[0],900).resolved[character(base).id] as CharacterEntity).pose.upperArmR;expect((evaluator.evaluate(p,scene.id,900).resolved[e.id] as CharacterEntity).pose.upperArmR).toBeCloseTo(original+.2);});
  it('clips obey active range, fade and mute',()=>{const p=demo(),clip=Object.values(p.scenes[p.sceneOrder[0]].timeline.clips)[0];if(clip.kind!=='motion')throw new Error();expect(clipWeight(clip,-1)).toBe(0);expect(clipWeight(clip,0)).toBe(0);expect(clipWeight(clip,60)).toBeCloseTo(.5);expect(clipWeight(clip,4800)).toBe(0);expect(clipWeight({...clip,muted:true},900)).toBe(0);});
  it('loops a motion at local clip time',()=>{const p=demo(),scene=p.scenes[p.sceneOrder[0]],clip=Object.values(scene.timeline.clips)[0];if(clip.kind!=='motion')throw new Error();clip.blendInMs=0;clip.blendOutMs=0;const a=evaluator.evaluate(p,scene.id,600),b=evaluator.evaluate(p,scene.id,600+motions[2].durationMs);expect(a.poses).toEqual(b.poses);});
  it('honors hidden layers and camera transform',()=>{const p=demo(),scene=p.scenes[p.sceneOrder[0]],e=character(p);e.visible=false;const cam=scene.entities[scene.cameraId];if(cam.kind!=='camera')throw new Error();cam.zoom=2;expect(evaluator.evaluate(p,scene.id,0).nodes.every(n=>n.entityId!==e.id)).toBe(true);expect(point(evaluator.evaluate(p,scene.id,0).camera,960,540)).toEqual({x:960,y:540});});
});
describe('FK and matrix contracts',()=>{
  it('includes parent rotations and local rest offset',()=>{const world=fk2d(rig,{torso:Math.PI/2},{x:100,y:200,rotation:0,scaleX:1,scaleY:1});expect(world.head.tx).toBeCloseTo(158);expect(world.head.ty).toBeCloseTo(200);});
  it('clamps joint limits',()=>{const a=fk2d(rig,{head:10},{x:0,y:0,rotation:0,scaleX:1,scaleY:1});expect(Math.atan2(a.head.b,a.head.a)).toBeCloseTo(.7);});
  it('roundtrips nonuniform rotated transforms',()=>{const a=transform({x:310,y:240,rotation:1.3,scaleX:-1.2,scaleY:.7});const p=point(multiply(invert(a),a),42,-17);expect(p.x).toBeCloseTo(42);expect(p.y).toBeCloseTo(-17);});
});
