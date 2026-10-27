import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { ProjectBundle } from '../contracts';
import { parseProject, ProjectFormatError } from '../model/validate';

const MAX_ARCHIVE=100_000_000,MAX_EXPANDED=200_000_000,MAX_JSON=12_000_000;
export async function sha256(bytes:Uint8Array):Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function encodeBundle(bundle:ProjectBundle):Promise<Uint8Array> {
  const project=parseProject(bundle.project);
  const files:Zippable={
    'manifest.json':strToU8(JSON.stringify({container:1,formatVersion:1,projectId:project.id,writtenBy:project.meta.writtenBy})),
    'project.json':strToU8(JSON.stringify(project)),
  };
  for(const asset of Object.values(project.assets)) {
    const bytes=bundle.assets[asset.id];
    if(!bytes || bytes.length!==asset.bytes || await sha256(bytes)!==asset.hash)throw new ProjectFormatError(`Aktiv buzilgan yoki topilmadi: ${asset.name}`);
    files[`assets/${asset.hash}`]=[bytes,{level:0}];
  }
  return zipSync(files,{level:6});
}
export function preflightZip(bytes:Uint8Array):void {
  if(bytes.length>MAX_ARCHIVE || bytes.length<22)throw new ProjectFormatError('Loyiha fayli hajmi noto‘g‘ri (maksimum 100 MB).');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw new ProjectFormatError('ZIP konteyneri noto‘g‘ri.');
  const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true),directorySize=view.getUint32(end+12,true);
  if(count>512 || view.getUint16(end+4,true)!==0 || view.getUint16(end+6,true)!==0 || offset+directorySize>end)throw new ProjectFormatError('ZIP chegaralari yoki turi qo‘llanmaydi.');
  let cursor=offset,total=0;
  const names=new Set<string>();
  for(let i=0;i<count;i++) {
    if(cursor+46>end || view.getUint32(cursor,true)!==0x02014b50)throw new ProjectFormatError('ZIP katalogi buzilgan.');
    const size=view.getUint32(cursor+24,true),length=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
    if(cursor+46+length+extra+comment>end)throw new ProjectFormatError('ZIP katalogi uzilgan.');
    const name=strFromU8(bytes.subarray(cursor+46,cursor+46+length));
    if(!/^(manifest\.json|project\.json|thumb\.png|assets\/[a-f0-9]{64})$/.test(name) || names.has(name))throw new ProjectFormatError('Konteyner yo‘li noto‘g‘ri yoki takroriy.');
    if((view.getUint16(cursor+8,true)&1) || ![0,8].includes(view.getUint16(cursor+10,true)))throw new ProjectFormatError('ZIP shifrlash yoki siqish turi qo‘llanmaydi.');
    names.add(name);total+=size;
    if(total>MAX_EXPANDED || (name.endsWith('.json') && size>MAX_JSON))throw new ProjectFormatError('Ochilgan loyiha hajmi limitdan oshadi.');
    cursor+=46+length+extra+comment;
  }
  if(cursor!==offset+directorySize || !names.has('manifest.json') || !names.has('project.json'))throw new ProjectFormatError('Loyiha manifesti yoki katalogi noto‘g‘ri.');
}
export async function decodeBundle(bytes:Uint8Array):Promise<ProjectBundle> {
  preflightZip(bytes);
  const files=unzipSync(bytes),manifest=JSON.parse(strFromU8(files['manifest.json'])) as Record<string,unknown>;
  if(manifest.container!==1)throw new ProjectFormatError('Konteyner versiyasi qo‘llanmaydi.');
  const project=parseProject(JSON.parse(strFromU8(files['project.json'])));
  if(manifest.projectId!==project.id || manifest.formatVersion!==project.formatVersion)throw new ProjectFormatError('Manifest loyiha bilan mos emas.');
  const assets:ProjectBundle['assets']={};
  for(const asset of Object.values(project.assets)) {
    const data=files[`assets/${asset.hash}`];
    if(!data || data.length!==asset.bytes || await sha256(data)!==asset.hash)throw new ProjectFormatError(`Aktiv buzilgan: ${asset.name}`);
    assets[asset.id]=data;
  }
  return {project,assets};
}
