import type { Evaluator, EntityKindDef, FrameState } from '../../contracts';
import type { Project, Scene, MotionClip, SceneTrack, Entity, Value } from '../../model/schema/project';
import { fk2d } from './fk2d';
import { identity, multiply, transform } from './matrix';
import { sample, interpolate, addValues } from './sample';
import { createEntityRegistry } from '../registry/entity-kinds';

interface Index { tracks: Record<string, SceneTrack[]>; clips: Record<string, MotionClip[]> }
const indices=new WeakMap<Scene,Index>();
function index(scene: Scene): Index {
  const existing=indices.get(scene); if (existing) return existing;
  const result: Index={tracks:{},clips:{}};
  for (const track of Object.values(scene.timeline.tracks)) (result.tracks[track.entityId]??=[]).push(track);
  for (const clip of Object.values(scene.timeline.clips)) if (clip.kind==='motion') (result.clips[clip.entityId]??=[]).push(clip);
  for (const clips of Object.values(result.clips)) clips.sort((a,b)=>a.lane-b.lane || a.id.localeCompare(b.id));
  indices.set(scene,result); return result;
}
export function getProperty(entity: Entity, path: string): Value {
  const [head,tail]=path.split('.');
  if (head==='pose' && entity.kind==='character') return entity.pose[tail]??0;
  if (head==='transform' && entity.kind!=='camera') return entity.transform[tail as keyof typeof entity.transform];
  return (entity as unknown as Record<string,Value>)[head];
}
export function setProperty(entity: Entity, path: string, value: Value): void {
  const [head,tail]=path.split('.');
  if (head==='pose' && entity.kind==='character' && typeof value==='number') entity.pose[tail]=value;
  else if (head==='transform' && entity.kind!=='camera' && typeof value==='number') entity.transform[tail as keyof typeof entity.transform]=value;
  else if (['opacity','size','color','text','x','y','zoom','rotation'].includes(head)) (entity as unknown as Record<string,Value>)[head]=value;
}
export function clipWeight(clip: MotionClip, t: number): number {
  const relative=t-clip.startMs;
  if (clip.muted || relative<0 || relative>=clip.durationMs) return 0;
  return clip.weight*Math.min(1,clip.blendInMs ? relative/clip.blendInMs : 1,clip.blendOutMs ? (clip.durationMs-relative)/clip.blendOutMs : 1);
}
export function createEvaluator(kinds: EntityKindDef[]): Evaluator {
  const registry=createEntityRegistry(kinds);
  return { evaluate(project: Project,sceneId: string,time: number): FrameState {
    const scene=project.scenes[sceneId];
    if (!scene) throw new Error(`Sahna topilmadi: ${sceneId}`);
    const t=Math.max(0,Math.min(scene.durationMs,Math.round(time))), cache=index(scene);
    const frame: FrameState={space:'2d',t,size:project.settings.frame,background:scene.background,camera:identity(),nodes:[],poses:{},resolved:{}};
    for (const id of scene.entityOrder) {
      const base=scene.entities[id];
      const entity: Entity=base.kind==='character' ? {...base,transform:{...base.transform},pose:{...base.pose}} : base.kind==='camera' ? {...base} : {...base,transform:{...base.transform}};
      for (const clip of cache.clips[id]??[]) {
        const weight=clipWeight(clip,t); if (!weight) continue;
        const motion=project.library.motions[clip.motionId];
        let local=clip.offsetMs+(t-clip.startMs)*clip.speed;
        local=clip.loop ? ((local%motion.durationMs)+motion.durationMs)%motion.durationMs : Math.min(local,motion.durationMs);
        for (const track of motion.tracks) {
          const v=sample(track,local); if (v===undefined) continue;
          const current=getProperty(entity,track.path);
          const target=track.blend==='add' ? addValues(current,v) : v;
          setProperty(entity,track.path,interpolate(current,target,weight,track.type));
        }
      }
      for (const track of cache.tracks[id]??[]) {
        const v=sample(track,t); if (v!==undefined) setProperty(entity,track.path,track.blend==='add' ? addValues(getProperty(entity,track.path),v) : v);
      }
      frame.resolved[id]=entity;
      if (entity.kind==='character') {
        const def=project.library.characters[entity.characterId];
        frame.poses[id]=fk2d(project.library.rigs[def.rigId],entity.pose,entity.transform);
      }
      if (entity.visible && entity.kind!=='camera') frame.nodes.push(...(registry(entity.kind)?.toNodes(entity,project,frame.poses[id]??{})??[]));
    }
    const camera=frame.resolved[scene.cameraId];
    if (camera?.kind==='camera') frame.camera=multiply(transform({x:frame.size.width/2,y:frame.size.height/2,rotation:-camera.rotation,scaleX:camera.zoom,scaleY:camera.zoom}),{...identity(),tx:-camera.x,ty:-camera.y});
    return frame;
  } };
}
