import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import fixture from '../fixtures/project.v1.json';
import { parseProject,validateRefs } from '../../src/model/validate';
import { ProjectStore } from '../../src/editor/store/project-store';
import { addEntity,removeEntity,setKey } from '../../src/engine';

const propertyRuns=Number(process.env.HISTORY_PROPERTY_RUNS??100);
if(!Number.isInteger(propertyRuns)||propertyRuns<1)throw new Error('HISTORY_PROPERTY_RUNS must be a positive integer.');

describe('patch history',()=>{
  it('returns exactly to the initial and final state across randomized edits',()=>{
    fc.assert(fc.property(fc.array(fc.record({kind:fc.constantFrom('move','pose','text','delete-text','audio','delete-audio'),x:fc.integer({min:-2000,max:4000}),t:fc.integer({min:0,max:10000}),rotation:fc.double({min:-10,max:10,noNaN:true})}),{minLength:1,maxLength:100}),values=>{
      const initial=parseProject(fixture),store=new ProjectStore(initial),sceneId=initial.sceneOrder[0],id=Object.values(initial.scenes[sceneId].entities).find(e=>e.kind==='character')!.id;
      for(const [index,value]of values.entries()){
        store.transact('Random edit',p=>{
          const scene=p.scenes[sceneId],e=scene.entities[id];
          if(value.kind==='move'&&e.kind==='character')e.transform.x=value.x;
          else if(value.kind==='pose')setKey(scene,id,'pose.upperArmR',value.t,value.rotation,`track-${index}`);
          else if(value.kind==='text')addEntity(scene,{id:`random-text-${index}`,name:'Random text',kind:'text',text:String(value.x),size:24,color:'#242A25',visible:true,locked:false,opacity:1,transform:{x:value.x,y:300,rotation:0,scaleX:1,scaleY:1},extensions:{}});
          else if(value.kind==='delete-text'){const text=Object.values(scene.entities).find(e=>e.id.startsWith('random-text-'));if(text)removeEntity(scene,text.id);}
          else if(value.kind==='audio'){
            const assetId=`random-asset-${index}`,clipId=`random-audio-${index}`;
            p.assets[assetId]={id:assetId,kind:'audio',name:'random.wav',hash:'0'.repeat(64),bytes:0,meta:{durationMs:1000}};
            scene.timeline.clips[clipId]={id:clipId,kind:'audio',assetId,startMs:0,durationMs:1000,trimInMs:0,gain:1,fadeInMs:0,fadeOutMs:0,lane:index,muted:false,extensions:{}};
          }else if(value.kind==='delete-audio'){
            const audio=Object.values(scene.timeline.clips).find(c=>c.kind==='audio');if(audio?.kind==='audio'){delete scene.timeline.clips[audio.id];delete p.assets[audio.assetId];}
          }
        });
        validateRefs(store.get());
      }
      const final=store.get();while(store.canUndo())store.undo();expect(store.get()).toEqual(initial);expect(store.isDirty()).toBe(false);while(store.canRedo())store.redo();expect(store.get()).toEqual(final);
    }),{numRuns:propertyRuns,seed:20261025});
  },180000);
  it('coalesces one drag and retains selection',()=>{const p=parseProject(fixture),store=new ProjectStore(p);store.selection='before';store.transact('drag',d=>{d.meta.name='A';},{coalesceKey:'drag',at:1,selection:'after'});store.transact('drag',d=>{d.meta.name='B';},{coalesceKey:'drag',at:100});store.undo();expect(store.get()).toEqual(p);expect(store.selection).toBe('before');expect(store.canUndo()).toBe(false);store.redo();expect(store.get().meta.name).toBe('B');expect(store.selection).toBe('after');});
  it('does not coalesce across a save boundary and tracks undo-to-saved',()=>{const store=new ProjectStore(parseProject(fixture));store.transact('A',d=>{d.meta.name='A';},{coalesceKey:'name',at:1});store.markSaved();store.transact('B',d=>{d.meta.name='B';},{coalesceKey:'name',at:100});expect(store.isDirty()).toBe(true);store.undo();expect(store.get().meta.name).toBe('A');expect(store.isDirty()).toBe(false);store.redo();expect(store.isDirty()).toBe(true);});
  it('does not mark newer edits saved after an asynchronous save of an older snapshot',()=>{const store=new ProjectStore(parseProject(fixture));const snapshot=store.get();store.transact('edit',p=>{p.meta.name='Unsaved';});store.markSaved(snapshot);expect(store.isDirty()).toBe(true);});
  it('clears redo when a new branch is edited',()=>{const store=new ProjectStore(parseProject(fixture));store.transact('A',p=>{p.meta.name='A';});store.undo();store.transact('B',p=>{p.meta.name='B';});expect(store.canRedo()).toBe(false);});
});
