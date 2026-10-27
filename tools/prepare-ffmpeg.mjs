import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ensureFfmpegBundle } from './ffmpeg-bundle.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const argument=process.argv[2];
if(process.argv.length>3||argument?.startsWith('--')&&argument!=='--download')throw new Error('Usage: npm run prepare:ffmpeg -- [--download | archive.zip]');
let archive=argument;
if(argument==='--download'){
  const manifest=JSON.parse(await readFile(resolve(root,'resources','ffmpeg',`${process.platform}-${process.arch}.json`),'utf8'));
  const url=new URL(manifest.archiveUrl);
  if(url.origin!=='https://github.com'||!url.pathname.startsWith('/BtbN/FFmpeg-Builds/releases/download/'))throw new Error('Unexpected FFmpeg archive source.');
  const directory=resolve(root,'.qa','ffmpeg');await mkdir(directory,{recursive:true});
  archive=resolve(directory,'download.zip');
  const temporary=`${archive}.${randomUUID()}.tmp`;
  console.log(`Downloading ${manifest.archive} from the pinned upstream release...`);
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(300_000)});
    if(!response.ok||!response.body)throw new Error(`HTTP ${response.status}`);
    const hash=createHash('sha256');let received=0,reported=0;
    await pipeline(Readable.fromWeb(response.body),async function* (chunks){
      for await(const chunk of chunks){
        hash.update(chunk);received+=chunk.length;
        if(received-reported>=16_000_000){console.log(`Downloaded ${Math.floor(received/1_000_000)} MB...`);reported=received;}
        yield chunk;
      }
    },createWriteStream(temporary,{flags:'wx'}));
    if(hash.digest('hex')!==manifest.archiveSha256)throw new Error('Downloaded FFmpeg archive checksum mismatch.');
    await rename(temporary,archive);
  }finally{await rm(temporary,{force:true});}
  console.log(`Downloaded and verified ${manifest.archive}`);
}
const bundle=await ensureFfmpegBundle(root,process.platform,process.arch,archive);
console.log(`Verified FFmpeg bundle: ${bundle.target} (${bundle.manifest.version})`);
