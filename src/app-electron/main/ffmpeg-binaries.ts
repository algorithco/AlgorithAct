import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface FfmpegBinaries { ffmpeg:string; ffprobe:string }
interface Options {
  resourcesPath?:string;
  developmentRoot?:string;
  platform?:NodeJS.Platform;
  arch?:string;
  env?:Partial<Pick<NodeJS.ProcessEnv,'ANIM_FFMPEG_PATH'|'ANIM_FFPROBE_PATH'>>;
  exists?:(path:string)=>boolean;
}

// Executables must stay outside app.asar so Windows can load their adjacent DLLs.
export function resolveFfmpegBinaries({resourcesPath,developmentRoot,platform=process.platform,arch=process.arch,env=process.env,exists=existsSync}:Options={}):FfmpegBinaries {
  const extension=platform==='win32'?'.exe':'';
  const folders=[resourcesPath&&join(resourcesPath,'ffmpeg',`${platform}-${arch}`),developmentRoot&&join(developmentRoot,'resources','ffmpeg',`${platform}-${arch}`)].filter((folder):folder is string=>Boolean(folder));
  const bundled=(name:string)=>folders.map(folder=>join(folder,`${name}${extension}`)).find(exists);
  const ffmpeg=env.ANIM_FFMPEG_PATH||bundled('ffmpeg')||'ffmpeg';
  const adjacent=env.ANIM_FFMPEG_PATH?join(dirname(ffmpeg),`ffprobe${extension}`):undefined;
  const ffprobe=env.ANIM_FFPROBE_PATH||(adjacent&&exists(adjacent)?adjacent:undefined)||bundled('ffprobe')||'ffprobe';
  return {ffmpeg,ffprobe};
}
