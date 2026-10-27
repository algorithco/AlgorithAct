import { test,expect,_electron as electron } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir,readFile,stat,writeFile } from 'node:fs/promises';
import { dirname,join,resolve } from 'node:path';
import fixture from '../fixtures/project.v1.json' with {type:'json'};
import { parseProject } from '../../src/model/validate';
import { encodeBundle } from '../../src/storage/zip-container';
import { toneWav } from '../helpers/audio-fixture';

const executable=process.env.ANIM_PACKAGED_APP;
test.skip(!executable||!existsSync(executable),'Build the desktop package and set ANIM_PACKAGED_APP to test bundled media tools.');

function cleanEnvironment(){
  const environment=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
  for(const key of Object.keys(environment))if(key.toLowerCase()==='path'||['ANIM_FFMPEG_PATH','ANIM_FFPROBE_PATH','ANIM_DEV_URL','ELECTRON_RUN_AS_NODE'].includes(key))delete environment[key];
  environment.PATH='';
  return environment;
}

async function inputProject(name:string){
  await mkdir('.qa/packaged-exports',{recursive:true});
  const project=parseProject(fixture),scene=project.scenes[project.sceneOrder[0]],wav=toneWav(1000,200);
  project.meta.name=name;project.settings.frame={width:480,height:270};scene.durationMs=1000;
  for(const entity of Object.values(scene.entities)){if(entity.kind==='camera'){entity.x/=4;entity.y/=4;}else{entity.transform.x/=4;entity.transform.y/=4;entity.transform.scaleX/=4;entity.transform.scaleY/=4;}}
  project.assets.sound={id:'sound',kind:'audio',name:'tone.wav',hash:createHash('sha256').update(wav).digest('hex'),bytes:wav.length,meta:{durationMs:1000}};
  scene.timeline.clips.sound={id:'sound',kind:'audio',assetId:'sound',startMs:100,durationMs:800,trimInMs:100,gain:.5,fadeInMs:50,fadeOutMs:50,lane:0,muted:false,extensions:{}};
  const input=resolve(`.qa/packaged-exports/${name}.anim`);
  await writeFile(input,await encodeBundle({project,assets:{sound:wav}}));
  return input;
}

for(const preset of ['mp4','webm'] as const)test(`packaged ${preset} export works with no FFmpeg environment or PATH`,async()=>{
  test.setTimeout(90000);
  const name=`bundled-${preset}`,input=await inputProject(name),output=resolve(`.qa/packaged-exports/${name}.${preset}`);
  const application=await electron.launch({executablePath:executable!,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader',`--user-data-dir=${resolve(`.qa/packaged-${preset}-profile`)}`],env:cleanEnvironment()});
  try{
    const page=await application.firstWindow();
    await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:25000});
    expect(await application.evaluate(()=>process.env.PATH??'')).toBe('');
    expect(await application.evaluate(()=>process.env.ANIM_FFMPEG_PATH)).toBeUndefined();
    await application.evaluate(({dialog},paths)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[paths.input]});dialog.showSaveDialog=async()=>({canceled:false,filePath:paths.output});},{input,output});
    await page.getByRole('button',{name:'Loyiha ochish',exact:true}).click();
    await expect(page.getByLabel('Loyiha nomi',{exact:true})).toHaveValue(name);
    await page.getByRole('button',{name:'Eksport',exact:true}).click();
    await page.getByRole('button',{name:new RegExp(`^${preset.toUpperCase()}`)}).click();
    await page.getByRole('button',{name:'Eksport qilish',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Eksport sozlamalari'})).toBeHidden({timeout:60000});
    expect((await stat(output)).size).toBeGreaterThan(1000);
    const probe=join(dirname(executable!),'resources','ffmpeg','win32-x64','ffprobe.exe');
    const data=JSON.parse(execFileSync(probe,['-v','error','-count_frames','-show_entries','stream=codec_type,width,height,nb_read_frames,sample_rate,channels:format=duration','-of','json',output],{encoding:'utf8',windowsHide:true}));
    const video=data.streams.find((stream:{codec_type:string})=>stream.codec_type==='video'),audio=data.streams.find((stream:{codec_type:string})=>stream.codec_type==='audio');
    expect(video.nb_read_frames).toBe('30');expect(video.width).toBe(480);expect(video.height).toBe(270);
    expect(audio.sample_rate).toBe('48000');expect(audio.channels).toBe(2);
    expect(Math.abs(Number(data.format.duration)-1)).toBeLessThan(1/30+.001);
  }finally{await application.close();}
});

test('export startup failures are readable and preserve an existing output',async()=>{
  test.setTimeout(60000);
  const input=await inputProject('bundled-failure'),output=resolve('.qa/packaged-exports/preserved.mp4');
  await writeFile(output,'previous-output');
  const environment=cleanEnvironment();environment.ANIM_FFMPEG_PATH=resolve('.qa/missing-media-tool/ffmpeg.exe');
  const application=await electron.launch({executablePath:executable!,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader',`--user-data-dir=${resolve('.qa/packaged-failure-profile')}`],env:environment});
  try{
    const page=await test.step('Start packaged app',()=>application.firstWindow());await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:25000});
    await application.evaluate(({dialog},paths)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[paths.input]});dialog.showSaveDialog=async()=>({canceled:false,filePath:paths.output});},{input,output});
    await page.getByRole('button',{name:'Loyiha ochish',exact:true}).click();await expect(page.getByLabel('Loyiha nomi',{exact:true})).toHaveValue('bundled-failure');
    await page.getByRole('button',{name:'Eksport',exact:true}).click();await page.getByRole('button',{name:/^MP4/}).click();await page.getByRole('button',{name:'Eksport qilish',exact:true}).click();
    const error=page.getByRole('alert');await expect(error).toContainText('Eksport bajarilmadi');await expect(error).toContainText('FFmpeg fayli topilmadi');
    await expect(error).not.toContainText('Error invoking remote method');
    await expect(page.getByRole('button',{name:'Eksport qilish',exact:true})).toBeEnabled();
    expect(await readFile(output,'utf8')).toBe('previous-output');
    await page.getByRole('button',{name:'Orqaga',exact:true}).click();await page.getByRole('button',{name:'Eksport',exact:true}).click();await expect(error).toHaveCount(0);
  }finally{await application.close();}
});
