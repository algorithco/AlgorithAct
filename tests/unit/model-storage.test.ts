import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import fixture from '../fixtures/project.v1.json';
import { migrate, parseProject } from '../../src/model/validate';
import { decodeBundle, encodeBundle, preflightZip, sha256 } from '../../src/storage/zip-container';

describe('model v1 migration and references',()=>{
  it('loads the versioned fixture with all motion data',()=>expect(Object.keys(parseProject(fixture).library.motions)).toHaveLength(5));
  it('rejects future and unrecognized versions',()=>{expect(()=>migrate({formatVersion:2})).toThrow('yangilang');expect(()=>migrate({formatVersion:0})).toThrow('migratsiya');expect(()=>migrate(null)).toThrow();});
  it('preserves unknown extension data on roundtrip',()=>{const p=structuredClone(fixture);p.extensions={'vendor.test':{foo:[1,'bar',true,null]}};expect(parseProject(p).extensions).toEqual(p.extensions);});
  it('rejects missing characters and bad entity order',()=>{const p=parseProject(fixture),s=p.scenes[p.sceneOrder[0]],e=Object.values(s.entities).find(e=>e.kind==='character')!;if(e.kind!=='character')throw new Error();e.characterId='missing';expect(()=>parseProject(p)).toThrow('Personaj');e.characterId=Object.keys(p.library.characters)[0];s.entityOrder.push(s.entityOrder[0]);expect(()=>parseProject(p)).toThrow('tartibi');});
  it('rejects cyclic or child-first rigs',()=>{const p=parseProject(fixture),r=Object.values(p.library.rigs)[0];r.bones[0].parent='head';expect(()=>parseProject(p)).toThrow('Skelet');});
  it('rejects nonfinite state and unsafe property paths',()=>{const p=parseProject(fixture),s=p.scenes[p.sceneOrder[0]];s.durationMs=NaN;expect(()=>parseProject(p)).toThrow();s.durationMs=10000;s.timeline.tracks.bad={id:'bad',entityId:s.entityOrder[1],path:'__proto__.polluted',type:'number',blend:'replace',keys:[]};expect(()=>parseProject(p)).toThrow();});
  it('rejects mismatched track types and duplicate keys',()=>{const p=parseProject(fixture),s=p.scenes[p.sceneOrder[0]];s.timeline.tracks.bad={id:'bad',entityId:s.entityOrder[1],path:'size',type:'number',blend:'replace',keys:[{t:0,v:'wrong',ease:'linear'}]};expect(()=>parseProject(p)).toThrow('turiga');s.timeline.tracks.bad.keys=[{t:0,v:10,ease:'linear'},{t:0,v:20,ease:'linear'}];expect(()=>parseProject(p)).toThrow('takroriy');});
});
describe('.anim ZIP container',()=>{
  it('roundtrips project and content-addressed media',async()=>{const project=parseProject(fixture),bytes=new Uint8Array([137,80,78,71]),hash=await sha256(bytes);project.assets.image={id:'image',kind:'image',name:'test.png',hash,bytes:bytes.length};const bundle={project,assets:{image:bytes}},encoded=await encodeBundle(bundle),decoded=await decodeBundle(encoded);expect(decoded).toEqual(bundle);});
  it('rejects missing or corrupt media before saving',async()=>{const p=parseProject(fixture);p.assets.a={id:'a',kind:'image',name:'test.png',hash:'0'.repeat(64),bytes:2};await expect(encodeBundle({project:p,assets:{a:new Uint8Array([1,2])}})).rejects.toThrow('buzilgan');});
  it('rejects path traversal and unknown archive entries',()=>{const bytes=zipSync({'manifest.json':strToU8('{}'),'project.json':strToU8('{}'),'../../outside':new Uint8Array([1])});expect(()=>preflightZip(bytes)).toThrow('yo‘li');});
  it('rejects expanded size claims before decompression',()=>{const bytes=zipSync({'manifest.json':strToU8('{}'),'project.json':strToU8('{}')});const v=new DataView(bytes.buffer);for(let i=0;i<bytes.length-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint32(i+24,300_000_000,true);break;}expect(()=>preflightZip(bytes)).toThrow('limit');});
  it('rejects a manifest with another project identity',async()=>{const bytes=zipSync({'manifest.json':strToU8('{"container":1,"formatVersion":1,"projectId":"wrong"}'),'project.json':strToU8(JSON.stringify(fixture))});await expect(decodeBundle(bytes)).rejects.toThrow('mos emas');});
});
