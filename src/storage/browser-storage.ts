import type { AssetResolver, ProjectBundle, ProjectStorage } from '../contracts';
import type { Project } from '../model/schema/project';
import { encodeBundle, decodeBundle } from './zip-container';

export function download(blob:Blob,name:string):void {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function createResolver(assets:Record<string,Uint8Array>,project:Project):AssetResolver & {dispose():void} {
  const urls=new Map<string,string>();
  return {
    url(id){let url=urls.get(id);if(!url){const asset=project.assets[id],bytes=assets[id];if(!asset || !bytes)throw new Error('Aktiv topilmadi.');const ext=asset.name.split('.').at(-1)?.toLowerCase();const type=ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='webp'?'image/webp':'image/png';url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type}));urls.set(id,url);}return url;},
    async bytes(id){if(!assets[id])throw new Error('Aktiv topilmadi.');return assets[id];},
    dispose(){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();},
  };
}
async function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('algorithco-studio',1);request.onupgradeneeded=()=>request.result.createObjectStore('recovery');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function recovery<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const database=await db();
  return new Promise((resolve,reject)=>{const tx=database.transaction('recovery',mode);const request=action(tx.objectStore('recovery'));let value:T;request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>{database.close();resolve(value);};tx.onerror=()=>{database.close();reject(tx.error);};tx.onabort=()=>{database.close();reject(tx.error);};});
}
export class BrowserStorage implements ProjectStorage {
  async open():Promise<ProjectBundle|null>{
    const file=await new Promise<File|null>(resolve=>{const input=document.createElement('input');input.type='file';input.accept='.anim';input.onchange=()=>resolve(input.files?.[0]??null);input.addEventListener('cancel',()=>resolve(null),{once:true});input.click();});
    if(!file)return null;if(file.size>100_000_000)throw new Error('Fayl 100 MB limitdan katta.');return decodeBundle(new Uint8Array(await file.arrayBuffer()));
  }
  async save(bundle:ProjectBundle){const bytes=await encodeBundle(bundle);download(new Blob([new Uint8Array(bytes)],{type:'application/zip'}),`${bundle.project.meta.name.replace(/[<>:"/\\|?*]/g,'_')}.anim`);return true;}
  async writeRecovery(bundle:ProjectBundle){await recovery('readwrite',s=>s.put(bundle,'latest'));}
  async readRecovery(){return (await recovery<ProjectBundle|undefined>('readonly',s=>s.get('latest')))??null;}
  async clearRecovery(){await recovery('readwrite',s=>s.delete('latest'));}
}
