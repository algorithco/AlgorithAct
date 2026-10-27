import { test, expect } from '@playwright/test';
import { mkdir,readFile } from 'node:fs/promises';
import { toneWav } from '../helpers/audio-fixture';
import { decodeBundle } from '../../src/storage/zip-container';

test('audio import, waveform, trim, fades, preview, mute and .anim roundtrip',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByText('Sahna tayyorlanmoqda…')).toBeHidden({timeout:20000});
  await page.getByLabel('Audio fayli',{exact:true}).setInputFiles({name:'Hikoya.wav',mimeType:'audio/wav',buffer:Buffer.from(toneWav(4000))});
  await expect(page.getByRole('heading',{name:'Audio xususiyatlari',exact:true})).toBeVisible();
  const audioClip=page.getByRole('button',{name:'Hikoya.wav audio klipi',exact:true});await expect(audioClip).toBeVisible();
  await expect(audioClip.locator('svg')).toBeVisible();await expect(audioClip.locator('svg line')).toHaveCount(160);
  await page.getByRole('spinbutton',{name:'Audio boshlanishi',exact:true}).fill('1');await page.getByRole('spinbutton',{name:'Manbadan boshlash',exact:true}).fill('.2');
  await page.getByRole('spinbutton',{name:'Audio davomiyligi',exact:true}).fill('2');await page.getByRole('spinbutton',{name:'Fade in',exact:true}).fill('.2');await page.getByRole('spinbutton',{name:'Fade out',exact:true}).fill('.3');
  await page.getByRole('spinbutton',{name:'Audio ovoz foizi',exact:true}).fill('50');
  await page.getByRole('button',{name:'Audioni o‘chirish',exact:true}).click();await expect(page.getByRole('button',{name:'Audioni yoqish',exact:true})).toBeVisible();await page.getByRole('button',{name:'Audioni yoqish',exact:true}).click();
  await page.getByRole('button',{name:'Ijro etish',exact:true}).click();await expect(page.getByRole('button',{name:'Pauza',exact:true})).toBeVisible();await expect(page.getByTestId('timecode')).not.toHaveText(/^00:00:00/);await page.getByRole('button',{name:'Pauza',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Loyihani saqlash',exact:true}).click();const download=await downloadPromise,path=(await download.path())!;
  const bundle=await decodeBundle(new Uint8Array(await readFile(path))),clips=Object.values(bundle.project.scenes[bundle.project.sceneOrder[0]].timeline.clips),clip=clips.find(c=>c.kind==='audio')!;
  expect(clip).toMatchObject({kind:'audio',startMs:1000,durationMs:2000,trimInMs:200,gain:.5,fadeInMs:200,fadeOutMs:300,muted:false});
  const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Loyiha ochish',exact:true}).click();await(await chooserPromise).setFiles(path);
  await audioClip.click();await expect(page.getByRole('spinbutton',{name:'Fade in',exact:true})).toHaveValue('0.2');
  await mkdir('.qa',{recursive:true});await page.screenshot({path:'.qa/audio-editor.png',fullPage:true});
  expect(errors).toEqual([]);
});

test('offline audio preserves delayed start, source trim, gain and exact PCM duration',async({page})=>{
  await page.goto('/');const result=await page.evaluate(async wav=>{
    const enginePath='/src/audio/webaudio-engine.ts',compositionPath='/src/app-electron/renderer/composition.ts';
    const {WebAudioEngine}=await import(enginePath) as typeof import('../../src/audio/webaudio-engine');
    const {services}=await import(compositionPath) as typeof import('../../src/app-electron/renderer/composition');
    const project=services.createProject(),scene=project.scenes[project.sceneOrder[0]],id='test-audio';scene.durationMs=1000;
    project.assets[id]={id,kind:'audio',name:'tone.wav',hash:'a'.repeat(64),bytes:wav.length,meta:{durationMs:1000}};
    scene.timeline.clips.sound={id:'sound',kind:'audio',assetId:id,startMs:250,durationMs:500,trimInMs:200,gain:.5,fadeInMs:50,fadeOutMs:50,lane:0,muted:false,extensions:{}};
    const engine=new WebAudioEngine(),resolver={url:()=>'',bytes:async()=>new Uint8Array(wav)};
    try{
      const output=(await engine.renderOffline(project,scene.id,resolver,1000,new AbortController().signal))!,v=new DataView(output.buffer);
      const rms=(a:number,b:number)=>{let sum=0;for(let i=a*48;i<b*48;i++)sum+=(v.getInt16(44+i*4,true)/32768)**2;return Math.sqrt(sum/((b-a)*48));};
      return {bytes:output.length,silent:rms(0,220),plateau:rms(320,650),after:rms(800,980),peaks:engine.waveform(id).length};
    }finally{engine.dispose();}
  },Array.from(toneWav(1000,200)));
  expect(result.bytes).toBe(44+48000*4);expect(result.silent).toBe(0);expect(result.after).toBe(0);expect(result.plateau).toBeGreaterThan(.08);expect(result.plateau).toBeLessThan(.095);expect(result.peaks).toBe(160);
});
