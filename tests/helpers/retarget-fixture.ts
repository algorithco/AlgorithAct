import { CONTENT, createDemoProject } from '../../content/characters/hero/build';
import { parseProject } from '../../src/model/validate';
import type { CharacterEntity, MotionDef, Project } from '../../src/model/schema/project';

export const retargetIds=['retarget-original','retarget-novcha'] as const;
export function retargetProject(motion:MotionDef):Project {
  let serial=0;const project=createDemoProject(()=>`retarget-${++serial}`,'2026-10-25T00:00:00.000Z');
  const scene=project.scenes[project.sceneOrder[0]],camera=scene.entities[scene.cameraId];
  if(camera.kind!=='camera')throw new Error('Camera required.');
  project.settings.frame={width:960,height:720};camera.x=480;camera.y=360;
  scene.durationMs=motion.durationMs;scene.background={type:'color',color:'#F7F6F2'};
  scene.entities={[camera.id]:camera};scene.entityOrder=[camera.id];scene.timeline={tracks:{},clips:{}};
  for(const [index,characterId]of [CONTENT.character,CONTENT.tealCharacter].entries()){
    const id=retargetIds[index],entity:CharacterEntity={id,characterId,kind:'character',name:project.library.characters[characterId].name,visible:true,locked:false,opacity:1,pose:{},transform:{x:280+index*400,y:250,rotation:0,scaleX:1.1,scaleY:1.1},extensions:{}};
    scene.entities[id]=entity;scene.entityOrder.push(id);
    const clipId=`motion-${index}`;scene.timeline.clips[clipId]={id:clipId,kind:'motion',entityId:id,motionId:motion.id,startMs:0,durationMs:motion.durationMs,offsetMs:0,speed:1,loop:motion.loop,blendInMs:0,blendOutMs:0,weight:1,lane:0,muted:false,extensions:{}};
    const labelId=`label-${index}`;scene.entities[labelId]={id:labelId,name:entity.name,kind:'text',text:entity.name,size:32,color:'#27332A',opacity:1,transform:{x:210+index*400,y:70,rotation:0,scaleX:1,scaleY:1},visible:true,locked:false,extensions:{}};scene.entityOrder.push(labelId);
  }
  return parseProject(project);
}
