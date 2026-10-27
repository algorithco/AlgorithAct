import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { unzipSync } from 'fflate';

async function digest(path){
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(path))hash.update(chunk);
  return hash.digest('hex');
}

export async function ensureFfmpegBundle(root,platform,arch,archivePath=process.env.ANIM_FFMPEG_ARCHIVE??join(root,'.qa','ffmpeg','download.zip')){
  if(!/^[a-z0-9-]+$/.test(`${platform}-${arch}`))throw new Error('Invalid FFmpeg platform.');
  const directory=join(root,'resources','ffmpeg'),target=join(directory,`${platform}-${arch}`);
  if(relative(directory,target).startsWith('..'))throw new Error('Invalid FFmpeg resource path.');
  let manifest;
  try{manifest=JSON.parse(await readFile(join(directory,`${platform}-${arch}.json`),'utf8'));}
  catch{throw new Error(`No pinned FFmpeg bundle for ${platform}-${arch}.`);}
  if(manifest.platform!==platform||manifest.arch!==arch||!manifest.files?.some(file=>file.name==='ffmpeg.exe')||!manifest.files?.some(file=>file.name==='ffprobe.exe'))throw new Error('Invalid FFmpeg bundle manifest.');
  for(const file of manifest.files)if(basename(file.name)!==file.name)throw new Error('Invalid FFmpeg filename.');
  const valid=async()=>{
    for(const file of manifest.files){
      const path=join(target,file.name);
      try{if((await stat(path)).size!==file.bytes||await digest(path)!==file.sha256)return false;}catch{return false;}
    }
    return true;
  };
  if(!await valid()){
    let archive;
    try{archive=await readFile(archivePath);}catch{throw new Error('FFmpeg bundle missing. Set ANIM_FFMPEG_ARCHIVE to the pinned archive and run npm run prepare:ffmpeg. See resources/ffmpeg/README.md.');}
    if(createHash('sha256').update(archive).digest('hex')!==manifest.archiveSha256)throw new Error('FFmpeg archive checksum mismatch.');
    const names=new Map(manifest.files.map(file=>[`${manifest.archiveDirectory}/bin/${file.name}`,file.name]));
    const extracted=unzipSync(archive,{filter:entry=>names.has(entry.name)});
    await mkdir(target,{recursive:true});
    for(const [name,file]of names){
      if(!extracted[name])throw new Error(`FFmpeg archive is missing ${file}.`);
      await writeFile(join(target,file),extracted[name]);
    }
    if(!await valid())throw new Error('FFmpeg file checksum mismatch after extraction.');
  }
  for(const file of ['COPYING.LGPLv3','COPYING.GPLv3','NOTICE.txt','BUILD-CONFIG.txt'])await stat(join(target,file));
  return {directory,target,manifest};
}
