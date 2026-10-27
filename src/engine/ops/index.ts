import type { Project, Scene, Value, Entity, Ease, SceneTrack } from '../../model/schema/project';
import { getProperty, setProperty } from '../eval/evaluate';

export function setKey(scene: Scene, entityId: string, path: string, t: number, v: Value, trackId: string, ease: Ease='inOut'): void {
  let track=Object.values(scene.timeline.tracks).find(track=>track.entityId===entityId && track.path===path);
  if (!track) {
    track={id:trackId,entityId,path,type:typeof v==='number'?'number':typeof v==='boolean'?'bool':Array.isArray(v)?'vec2':path==='color'?'color':'string',blend:'replace',keys:[]};
    scene.timeline.tracks[track.id]=track;
  }
  const key=track.keys.find(k=>k.t===Math.round(t));
  if (key) { key.v=v; key.ease=ease; }
  else { track.keys.push({t:Math.round(t),v,ease}); track.keys.sort((a,b)=>a.t-b.t); }
}
export function editProperty(scene: Scene, entityId: string,path: string,value: Value,t: number,autoKey: boolean,trackId: string): void {
  const entity=scene.entities[entityId]; if (!entity || entity.locked) return;
  const track=Object.values(scene.timeline.tracks).find(tr=>tr.entityId===entityId && tr.path===path);
  if (autoKey || track) {
    if (!track && t>0) setKey(scene,entityId,path,0,getProperty(entity,path),trackId);
    setKey(scene,entityId,path,t,value,trackId);
  } else setProperty(entity,path,value);
}
export function removeEntity(scene: Scene,id: string): void {
  if (id===scene.cameraId || scene.entities[id]?.locked) return;
  delete scene.entities[id]; scene.entityOrder=scene.entityOrder.filter(v=>v!==id);
  for (const [trackId,track] of Object.entries(scene.timeline.tracks)) if (track.entityId===id) delete scene.timeline.tracks[trackId];
  for (const [clipId,clip] of Object.entries(scene.timeline.clips)) if (clip.kind==='motion' && clip.entityId===id) delete scene.timeline.clips[clipId];
}
export function addEntity(scene: Scene, entity: Entity): void { scene.entities[entity.id]=entity; scene.entityOrder.push(entity.id); }
export function removeKey(scene: Scene,track: SceneTrack,t: number): void {
  const item=scene.timeline.tracks[track.id]; if (!item) return;
  item.keys=item.keys.filter(k=>k.t!==t); if (!item.keys.length) delete scene.timeline.tracks[item.id];
}
export function activeScene(project: Project): Scene { return project.scenes[project.sceneOrder[0]]; }
