import { test, expect, _electron as electron } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { mkdir, stat, readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import fixture from '../fixtures/project.v1.json' with { type: 'json' };
import { parseProject } from '../../src/model/validate';
import { createHash } from 'node:crypto';
import { toneWav,rmsFloat32 } from '../helpers/audio-fixture';

for(const preset of ['webm','mp4'] as const)test(`Electron exports real ${preset} through hidden renderer, transfer port and ffprobe`,async()=>{
  test.skip(!process.env.ANIM_FFMPEG_PATH,'Set ANIM_FFMPEG_PATH and build first to test native export.');
  test.setTimeout(90000);
  await mkdir('.qa',{recursive:true});
  const environment=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));delete environment.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({args:['dist-electron/main.cjs','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--user-data-dir=${resolve('.qa/electron-profile')}`],env:environment});
  try{
    const page=await application.firstWindow();await page.waitForLoadState();
    await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:25000});
    expect(await page.evaluate(()=>typeof window.studioDesktop?.requestExport)).toBe('function');
    const output=resolve(`.qa/native-smoke.${preset}`);
    await application.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path});},output);
    const project=parseProject(fixture);project.settings.frame={width:640,height:360};project.scenes[project.sceneOrder[0]].durationMs=1000;
    for(const entity of Object.values(project.scenes[project.sceneOrder[0]].entities)){if(entity.kind==='camera'){entity.x/=3;entity.y/=3;}else{entity.transform.x/=3;entity.transform.y/=3;entity.transform.scaleX/=3;entity.transform.scaleY/=3;}}
    const result=await page.evaluate(async request=>window.studioDesktop!.requestExport(request),{project,assets:{},sceneId:project.sceneOrder[0],presetId:preset});
    expect(result).toBe(output);expect((await stat(output)).size).toBeGreaterThan(1000);
    const probe=process.env.ANIM_FFPROBE_PATH??resolve(dirname(process.env.ANIM_FFMPEG_PATH!),'ffprobe.exe');
    const data=JSON.parse(execFileSync(probe,['-v','error','-count_frames','-show_entries','stream=width,height,nb_read_frames:format=duration','-of','json',output],{encoding:'utf8',windowsHide:true}));
    expect(data.streams[0].nb_read_frames).toBe('30');expect(data.streams[0].width).toBe(640);expect(Number(data.format.duration)).toBeCloseTo(1,1);
    await page.screenshot({path:'.qa/desktop.png'});
  }finally{await application.close();}
});

test('cancelled audio export preserves the previous file and keeps the editor responsive',async()=>{
  test.skip(!process.env.ANIM_FFMPEG_PATH,'Set ANIM_FFMPEG_PATH and build first.');test.setTimeout(90000);
  await mkdir('.qa',{recursive:true});const environment=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));delete environment.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({args:['dist-electron/main.cjs','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--user-data-dir=${resolve('.qa/electron-cancel-profile')}`],env:environment});
  try{
    const page=await application.firstWindow();await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:25000});
    const output=resolve('.qa/cancelled-audio.mp4');await writeFile(output,'previous-output');const before=await readdir('.qa');
    await application.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path});},output);
    const project=parseProject(fixture),scene=project.scenes[project.sceneOrder[0]],wav=toneWav(1000);project.settings.frame={width:640,height:360};
    project.assets.sound={id:'sound',kind:'audio',name:'cancel.wav',hash:createHash('sha256').update(wav).digest('hex'),bytes:wav.length,meta:{durationMs:1000}};
    scene.timeline.clips.sound={id:'sound',kind:'audio',assetId:'sound',startMs:0,durationMs:1000,trimInMs:0,gain:1,fadeInMs:0,fadeOutMs:0,lane:0,muted:false,extensions:{}};
    const result=await page.evaluate(async payload=>{
      const bridge=window.studioDesktop!,unsubscribe=bridge.onExportProgress(p=>{if(p.frame>=2){unsubscribe();void bridge.cancelExport();}});
      try{return await bridge.requestExport({project:payload.project,assets:{sound:new Uint8Array(payload.wav)},sceneId:payload.project.sceneOrder[0],presetId:'mp4'});}finally{unsubscribe();}
    },{project,wav:Array.from(wav)});
    expect(result).toBeNull();expect(await readFile(output,'utf8')).toBe('previous-output');
    expect((await readdir('.qa')).filter(name=>name.startsWith('.algorithco-')&&!before.includes(name))).toEqual([]);
    await expect(page.getByRole('button',{name:'Ijro etish',exact:true})).toBeVisible();
  }finally{await application.close();}
});

for(const preset of ['webm','mp4'] as const)test(`Electron exports ${preset} with trimmed, delayed stereo audio`,async()=>{
  test.skip(!process.env.ANIM_FFMPEG_PATH,'Set ANIM_FFMPEG_PATH and build first to test native export.');test.setTimeout(90000);
  await mkdir('.qa',{recursive:true});const environment=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));delete environment.ELECTRON_RUN_AS_NODE;
  const application=await electron.launch({args:['dist-electron/main.cjs','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--user-data-dir=${resolve('.qa/electron-audio-profile')}`],env:environment});
  try{
    const page=await application.firstWindow();await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:25000});
    const output=resolve(`.qa/audio-smoke.${preset}`);await application.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path});},output);
    const project=parseProject(fixture),scene=project.scenes[project.sceneOrder[0]],wav=toneWav(1000,200);scene.durationMs=1000;project.settings.frame={width:640,height:360};
    project.assets.sound={id:'sound',kind:'audio',name:'tone.wav',hash:createHash('sha256').update(wav).digest('hex'),bytes:wav.length,meta:{durationMs:1000}};
    scene.timeline.clips.sound={id:'sound',kind:'audio',assetId:'sound',startMs:250,durationMs:500,trimInMs:200,gain:.5,fadeInMs:50,fadeOutMs:50,lane:0,muted:false,extensions:{}};
    const result=await page.evaluate(async payload=>window.studioDesktop!.requestExport({project:payload.project,assets:{sound:new Uint8Array(payload.wav)},sceneId:payload.project.sceneOrder[0],presetId:payload.preset}),{project,wav:Array.from(wav),preset});
    expect(result).toBe(output);
    const probe=process.env.ANIM_FFPROBE_PATH??resolve(dirname(process.env.ANIM_FFMPEG_PATH!),'ffprobe.exe');
    const data=JSON.parse(execFileSync(probe,['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,nb_read_frames,sample_rate,channels,start_time:format=duration','-of','json',output],{encoding:'utf8',windowsHide:true}));
    const video=data.streams.find((s:{codec_type:string})=>s.codec_type==='video'),audio=data.streams.find((s:{codec_type:string})=>s.codec_type==='audio');
    expect(video.nb_read_frames).toBe('30');expect(audio.sample_rate).toBe('48000');expect(audio.channels).toBe(2);expect(audio.codec_name).toBe(preset==='mp4'?'aac':'opus');expect(Math.abs(Number(data.format.duration)-1)).toBeLessThan(1/30+.001);
    const pcm=execFileSync(process.env.ANIM_FFMPEG_PATH!,['-v','error','-i',output,'-map','0:a:0','-af','pan=mono|c0=c0','-f','f32le','-ar','48000','-ac','1','pipe:1'],{windowsHide:true,maxBuffer:1_000_000});
    expect(rmsFloat32(pcm,40,200)).toBeLessThan(.003);expect(rmsFloat32(pcm,350,650)).toBeGreaterThan(.08);expect(rmsFloat32(pcm,350,650)).toBeLessThan(.095);expect(rmsFloat32(pcm,850,980)).toBeLessThan(.003);
  }finally{await application.close();}
});
