import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { resolveFfmpegBinaries } from '../../src/app-electron/main/ffmpeg-binaries';

describe('FFmpeg binary selection',()=>{
  const resources=join('application','resources'),development=join('workspace','resources','ffmpeg','win32-x64');
  const bundled=join(resources,'ffmpeg','win32-x64');
  const binaries=(folder:string)=>({ffmpeg:join(folder,'ffmpeg.exe'),ffprobe:join(folder,'ffprobe.exe')});
  const options={platform:'win32' as const,arch:'x64',resourcesPath:resources,env:{}};
  it('uses both packaged tools without environment variables or PATH',()=>{
    const paths=binaries(bundled);
    expect(resolveFfmpegBinaries({...options,exists:path=>Object.values(paths).includes(path)})).toEqual(paths);
  });
  it('finds development resources and handles spaces in the installation folder',()=>{
    const paths=binaries(join('My Applications','AlgorithAct','resources','ffmpeg','win32-x64'));
    expect(resolveFfmpegBinaries({...options,resourcesPath:join('My Applications','AlgorithAct','resources'),exists:path=>Object.values(paths).includes(path)})).toEqual(paths);
    expect(resolveFfmpegBinaries({...options,developmentRoot:'workspace',exists:path=>Object.values(binaries(development)).includes(path)})).toEqual(binaries(development));
  });
  it('honors an explicit encoder and its adjacent verifier before bundled tools',()=>{
    const paths=binaries(join('custom','encoder'));
    expect(resolveFfmpegBinaries({...options,env:{ANIM_FFMPEG_PATH:paths.ffmpeg},exists:()=>true})).toEqual(paths);
  });
  it('honors an independently configured verifier',()=>{
    expect(resolveFfmpegBinaries({...options,env:{ANIM_FFPROBE_PATH:'custom-probe'},exists:()=>true})).toEqual({ffmpeg:binaries(bundled).ffmpeg,ffprobe:'custom-probe'});
  });
  it('falls back to PATH only when no bundled or explicit binaries are present',()=>{
    expect(resolveFfmpegBinaries({...options,exists:()=>false})).toEqual({ffmpeg:'ffmpeg',ffprobe:'ffprobe'});
  });
  for(const platform of ['darwin','linux'] as const)for(const arch of ['x64','arm64'])it(`finds packaged ${platform}-${arch} tools without a Windows extension`,()=>{
    const folder=join(resources,'ffmpeg',`${platform}-${arch}`),paths={ffmpeg:join(folder,'ffmpeg'),ffprobe:join(folder,'ffprobe')};
    expect(resolveFfmpegBinaries({resourcesPath:resources,platform,arch,env:{},exists:path=>Object.values(paths).includes(path)})).toEqual(paths);
  });
});
