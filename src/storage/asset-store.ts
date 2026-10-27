import type { AssetRef } from '../model/schema/project';
import { sha256 } from './zip-container';

export async function importImage(file:File,id:string):Promise<{asset:AssetRef;bytes:Uint8Array}>{
  if(file.size>20_000_000)throw new Error('Rasm hajmi 20 MB dan oshmasin.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG, JPG yoki WebP rasmini tanlang.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const bitmap=await createImageBitmap(file);
  const width=bitmap.width,height=bitmap.height;bitmap.close();
  if(width>8192 || height>8192)throw new Error('Rasm o‘lchami 8192 pikseldan oshmasin.');
  return {bytes,asset:{id,kind:'image',name:file.name,hash:await sha256(bytes),bytes:bytes.length,meta:{width,height}}};
}

export async function readAudioFile(file:File,id:string):Promise<{asset:AssetRef;bytes:Uint8Array}>{
  if(file.size>50_000_000)throw new Error('Audio fayli 50 MB dan oshmasin.');
  if(!/\.(wav|mp3|ogg|oga|m4a|aac|flac|webm)$/i.test(file.name))throw new Error('WAV, MP3, OGG, M4A, AAC, FLAC yoki WebM audio tanlang.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  return {bytes,asset:{id,kind:'audio',name:file.name,hash:await sha256(bytes),bytes:bytes.length}};
}
