import type { Project, RigDef, SkinDef, MotionDef, Track, Shape, Entity } from '../../../src/model/schema/project';

export const CONTENT = {
  rig: '01K8F0Z0000000000000000001', skin: '01K8F0Z0000000000000000002',
  character: '01K8F0Z0000000000000000003', tealSkin: '01K8F0Z0000000000000000004', tealCharacter: '01K8F0Z0000000000000000005',
  tallRig: '01K8F0Z0000000000000000006',
};
export const rig: RigDef = {
  id: CONTENT.rig, name: 'Sodda humanoid', profile: 'humanoid', space: '2d',
  bones: [
    {key:'torso',parent:null,rest:{x:0,y:0,rotation:0},length:125},
    {key:'head',parent:'torso',rest:{x:0,y:-58,rotation:0},length:0,limits:[-.7,.7]},
    {key:'upperArmL',parent:'torso',rest:{x:-26,y:8,rotation:.4},length:62},
    {key:'forearmL',parent:'upperArmL',rest:{x:0,y:62,rotation:.08},length:66},
    {key:'upperArmR',parent:'torso',rest:{x:26,y:8,rotation:-.4},length:62},
    {key:'forearmR',parent:'upperArmR',rest:{x:0,y:62,rotation:-.08},length:66},
    {key:'thighL',parent:'torso',rest:{x:-12,y:125,rotation:.19},length:82},
    {key:'shinL',parent:'thighL',rest:{x:0,y:82,rotation:.04},length:88},
    {key:'thighR',parent:'torso',rest:{x:12,y:125,rotation:-.19},length:82},
    {key:'shinR',parent:'thighR',rest:{x:0,y:82,rotation:-.04},length:88},
  ],
};
export const tallRig: RigDef = {
  id: CONTENT.tallRig, name: 'Novcha humanoid', profile: 'humanoid', space: '2d',
  bones: [
    {key:'torso',parent:null,rest:{x:0,y:0,rotation:0},length:112},
    {key:'head',parent:'torso',rest:{x:0,y:-52,rotation:0},length:0,limits:[-.7,.7]},
    {key:'upperArmL',parent:'torso',rest:{x:-22,y:8,rotation:.4},length:72},
    {key:'forearmL',parent:'upperArmL',rest:{x:0,y:72,rotation:.08},length:80},
    {key:'upperArmR',parent:'torso',rest:{x:22,y:8,rotation:-.4},length:72},
    {key:'forearmR',parent:'upperArmR',rest:{x:0,y:72,rotation:-.08},length:80},
    {key:'thighL',parent:'torso',rest:{x:-10,y:112,rotation:.19},length:108},
    {key:'shinL',parent:'thighL',rest:{x:0,y:108,rotation:.04},length:116},
    {key:'thighR',parent:'torso',rest:{x:10,y:112,rotation:-.19},length:108},
    {key:'shinR',parent:'thighR',rest:{x:0,y:108,rotation:-.04},length:116},
  ],
};
const limb = (length: number, width=11): Shape[] => [{t:'line',x1:0,y1:0,x2:0,y2:length,stroke:{color:'$body',width,cap:'round'}}];
export const skin: SkinDef = {
  id:CONTENT.skin,name:'Original · Qora',rigProfile:'humanoid',palette:{body:'#242A25',eyes:'#FFFFFF'},
  parts:[
    ...['thighL','shinL','upperArmL','forearmL','thighR','shinR','upperArmR','forearmR'].map((bone,i)=>({
      bone,drawOrder:i,pivot:{x:0,y:0},art:{kind:'vector' as const,shapes:limb(rig.bones.find(b=>b.key===bone)!.length)},
    })),
    {bone:'torso',drawOrder:10,pivot:{x:0,y:0},art:{kind:'vector',shapes:[
      {t:'line',x1:0,y1:-22,x2:0,y2:5,stroke:{color:'$body',width:11,cap:'round'}},
      {t:'path',d:'M -26 0 L 26 0 L 19 126 L -19 126 Z',fill:'$body',stroke:{color:'$body',width:8}},
    ]}},
    {bone:'head',drawOrder:11,pivot:{x:0,y:0},art:{kind:'vector',shapes:[
      {t:'ellipse',x:0,y:0,rx:37,ry:37,fill:'$body'},
      {t:'ellipse',x:-12,y:-2,rx:3.5,ry:6,fill:'$eyes'},
      {t:'ellipse',x:12,y:-2,rx:3.5,ry:6,fill:'$eyes'},
    ]}},
  ],
};
export const tallSkin: SkinDef = {
  id:CONTENT.tealSkin,name:'Novcha · Yashil',rigProfile:'humanoid',palette:{body:'#367568',eyes:'#FFFFFF'},
  parts:[
    ...['thighL','shinL','upperArmL','forearmL','thighR','shinR','upperArmR','forearmR'].map((bone,i)=>({
      bone,drawOrder:i,pivot:{x:0,y:0},art:{kind:'vector' as const,shapes:limb(tallRig.bones.find(b=>b.key===bone)!.length,9)},
    })),
    {bone:'torso',drawOrder:10,pivot:{x:0,y:0},art:{kind:'vector',shapes:[
      {t:'line',x1:0,y1:-22,x2:0,y2:5,stroke:{color:'$body',width:9,cap:'round'}},
      {t:'path',d:'M -22 0 L 22 0 L 16 113 L -16 113 Z',fill:'$body',stroke:{color:'$body',width:7}},
    ]}},
    {bone:'head',drawOrder:11,pivot:{x:0,y:0},art:{kind:'vector',shapes:[
      {t:'ellipse',x:0,y:0,rx:31,ry:31,fill:'$body'},
      {t:'ellipse',x:-10,y:-2,rx:3,ry:5,fill:'$eyes'},
      {t:'ellipse',x:10,y:-2,rx:3,ry:5,fill:'$eyes'},
    ]}},
  ],
};
const motionTrack=(id:string,bone:string,values:[number,number][]): Track=>({id,path:`pose.${bone}`,type:'number',blend:'replace',keys:values.map(([t,v])=>({t,v,ease:'inOut'}))});
export const motions: MotionDef[] = [
  {id:'01K8F0Z0000000000000000010',name:'Tinch turish',profile:'humanoid',space:'2d',durationMs:2400,loop:true,tags:['idle'],tracks:[
    motionTrack('idle-torso','torso',[[0,-.018],[1200,.018],[2400,-.018]]),
    motionTrack('idle-head','head',[[0,.04],[1200,-.025],[2400,.04]]),
    motionTrack('idle-arm','upperArmR',[[0,0],[1200,.05],[2400,0]]),
  ]},
  {id:'01K8F0Z0000000000000000011',name:'Yurish',profile:'humanoid',space:'2d',durationMs:1000,loop:true,tags:['walk'],tracks:[
    motionTrack('walk-leg-l','thighL',[[0,-.48],[500,.48],[1000,-.48]]),
    motionTrack('walk-leg-r','thighR',[[0,.48],[500,-.48],[1000,.48]]),
    motionTrack('walk-knee-l','shinL',[[0,0],[250,-.65],[500,0],[1000,0]]),
    motionTrack('walk-knee-r','shinR',[[0,0],[500,0],[750,-.65],[1000,0]]),
    motionTrack('walk-arm-l','upperArmL',[[0,.45],[500,-.45],[1000,.45]]),
    motionTrack('walk-arm-r','upperArmR',[[0,-.45],[500,.45],[1000,-.45]]),
    motionTrack('walk-body','torso',[[0,-.02],[500,.02],[1000,-.02]]),
  ]},
  {id:'01K8F0Z0000000000000000012',name:'Qo‘l silkitish',profile:'humanoid',space:'2d',durationMs:2400,loop:true,tags:['wave'],tracks:[
    motionTrack('wave-arm','upperArmR',[[0,0],[450,-1.75],[1900,-1.75],[2400,0]]),
    motionTrack('wave-elbow','forearmR',[[0,0],[500,-.75],[750,-1.35],[1000,-.6],[1250,-1.35],[1500,-.6],[1850,-1.05],[2400,0]]),
    motionTrack('wave-head','head',[[0,0],[900,-.1],[1700,.06],[2400,0]]),
  ]},
  {id:'01K8F0Z0000000000000000013',name:'Qo‘l ko‘tarish',profile:'humanoid',space:'2d',durationMs:1800,loop:false,tags:['raise'],tracks:[
    motionTrack('raise-arm','upperArmR',[[0,0],[800,-2.55],[1800,-2.55]]),
    motionTrack('raise-elbow','forearmR',[[0,0],[800,-.15],[1800,-.15]]),
  ]},
  {id:'01K8F0Z0000000000000000014',name:'Ta’zim',profile:'humanoid',space:'2d',durationMs:2200,loop:false,tags:['bend'],tracks:[
    motionTrack('bend-body','torso',[[0,0],[900,.38],[1400,.38],[2200,0]]),
    motionTrack('bend-head','head',[[0,0],[900,.4],[1400,.4],[2200,0]]),
    motionTrack('bend-l','upperArmL',[[0,0],[900,-.4],[2200,0]]),
    motionTrack('bend-r','upperArmR',[[0,0],[900,-.35],[2200,0]]),
  ]},
];
export function createDemoProject(id: () => string, now: string): Project {
  const projectId=id(), sceneId=id(), characterId=id(), cameraId=id();
  const base=(name:string)=>({id:id(),name,visible:true,locked:false,extensions:{}});
  const text=(name:string,value:string,x:number,y:number,size:number,color:string): Entity => ({...base(name),kind:'text',text:value,size,color,opacity:1,transform:{x,y,rotation:0,scaleX:1,scaleY:1}});
  const entities: Entity[]=[
    {id:cameraId,name:'Kamera',kind:'camera',x:960,y:540,zoom:1,rotation:0,visible:true,locked:false,extensions:{}},
    text('Kichik sarlavha','TASAVVURDAN HARAKATGA',170,235,24,'#64745D'),
    text('Asosiy sarlavha','Kichik g‘oya.\nKatta harakat.',165,310,100,'#27332A'),
    text('Izoh','Personajingizga hayot bering.',172,600,31,'#788172'),
    text('Pastki yozuv','Birinchi sahna  /  01',172,887,23,'#788172'),
    {id:characterId,kind:'character',characterId:CONTENT.character,name:'Qahramon',visible:true,locked:false,opacity:1,pose:{},transform:{x:1390,y:410,rotation:0,scaleX:1.5,scaleY:1.5},extensions:{}},
  ];
  const clipId=id();
  return {
    formatVersion:1,id:projectId,meta:{name:'Birinchi harakat',createdAt:now,modifiedAt:now,writtenBy:'algorithco/0.1.0'},
    settings:{fps:30,frame:{width:1920,height:1080}},assets:{},
    library:{rigs:{[rig.id]:rig,[tallRig.id]:tallRig},skins:{[skin.id]:skin,[tallSkin.id]:tallSkin},
      characters:{[CONTENT.character]:{id:CONTENT.character,name:'Original',rigId:rig.id,skinId:skin.id},[CONTENT.tealCharacter]:{id:CONTENT.tealCharacter,name:'Novcha',rigId:tallRig.id,skinId:tallSkin.id}},
      motions:Object.fromEntries(motions.map(m=>[m.id,m]))},
    scenes:{[sceneId]:{id:sceneId,name:'Birinchi sahna',space:'2d',durationMs:10000,background:{type:'color',color:'#E9EEE7'},
      entities:Object.fromEntries(entities.map(e=>[e.id,e])),entityOrder:entities.map(e=>e.id),cameraId,
      timeline:{tracks:{},clips:{[clipId]:{id:clipId,kind:'motion',entityId:characterId,motionId:motions[2].id,startMs:0,durationMs:4800,offsetMs:0,speed:1,loop:true,blendInMs:120,blendOutMs:200,weight:1,lane:0,muted:false,extensions:{}}}},extensions:{}}},
    sceneOrder:[sceneId],extensions:{},
  };
}
