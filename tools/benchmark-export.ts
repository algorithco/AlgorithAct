import { _electron as electron } from '@playwright/test';
import { mkdir, writeFile, stat, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { cpus, totalmem, platform, release } from 'node:os';
import fixture from '../tests/fixtures/project.v1.json' with { type: 'json' };
import { toneWav } from '../tests/helpers/audio-fixture';
import { parseProject } from '../src/model/validate';
import type { ExportProgress, ExportTimings } from '../src/contracts';

const binary=process.env.ANIM_FFMPEG_PATH;
if(!binary)throw new Error('ANIM_FFMPEG_PATH ni belgilang va avval npm run build bajaring.');
const software=process.argv.includes('--software');
const seconds=Number(process.argv.find(arg=>arg.startsWith('--seconds='))?.split('=')[1]??60),continuous=process.argv.includes('--continuous');
if(!Number.isInteger(seconds)||seconds<3||seconds>300)throw new Error('--seconds 3 dan 300 gacha butun son bo‘lsin.');
const expectedFrames=seconds*30,durationMs=seconds*1000,lastMarker=durationMs-1000;
const variant=`${continuous?'-continuous':''}${software?'-software':''}`;
const reportPath=`docs/benchmarks/windows-1080p${seconds}s-audio${variant}.json`;
const startedAt=new Date().toISOString();let started=performance.now(),lastFrame=0,peakWorkingSetMiB=0;
let exportTimings:ExportTimings|undefined;
await mkdir('.qa',{recursive:true});await mkdir('docs/benchmarks',{recursive:true});
const environment=Object.fromEntries(Object.entries(process.env).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));delete environment.ELECTRON_RUN_AS_NODE;
const application=await electron.launch({args:['dist-electron/main.cjs',...(software?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]),`--user-data-dir=${resolve(`.qa/benchmark-${software?'software':'hardware'}-profile`)}`],env:environment});
application.process().stderr?.on('data',(chunk:Buffer)=>{void appendFile('.qa/benchmark-electron.log',chunk);});
application.process().stdout?.on('data',(chunk:Buffer)=>{void appendFile('.qa/benchmark-electron.log',chunk);});
application.process().once('exit',(code,signal)=>console.log(`Electron exit: ${code} ${signal??''}`));
let timeout:ReturnType<typeof setTimeout>|undefined;
try{
  const page=await application.firstWindow();await page.getByRole('heading',{name:'Xususiyatlar',exact:true}).waitFor();await page.getByText('Sahna tayyorlanmoqda…').waitFor({state:'hidden'});
  await application.evaluate(({app,BrowserWindow})=>{app.on('render-process-gone',(_event,_contents,details)=>console.error('Renderer gone',JSON.stringify(details)));app.on('child-process-gone',(_event,details)=>console.error('Child gone',JSON.stringify(details)));for(const window of BrowserWindow.getAllWindows())window.hide();});
  const renderer=await page.evaluate(()=>{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl');if(!gl)return 'WebGL unavailable';const debug=gl.getExtension('WEBGL_debug_renderer_info');const name=debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):String(gl.getParameter(gl.RENDERER));gl.getExtension('WEBGL_lose_context')?.loseContext();return name;});
  console.log(`Renderer: ${renderer}`);
  const output=resolve(`.qa/benchmark-1080p${seconds}s${variant}.mp4`);await application.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path});},output);
  await page.exposeFunction('benchmarkProgress',async(p:ExportProgress)=>{
    if(p.timings)exportTimings=p.timings;
    if(p.frame%150!==0 && p.frame!==p.total)return;
    lastFrame=p.frame;
    const memory=await application.evaluate(({app})=>app.getAppMetrics().reduce((sum,m)=>sum+m.memory.workingSetSize,0));peakWorkingSetMiB=Math.max(peakWorkingSetMiB,memory/1024);
    console.log(`${p.stage??'encoding'} ${p.frame}/${p.total} ${Math.round(p.progress*100)}% · ${Math.round((performance.now()-started)/1000)} s · working set ${Math.round(memory/1024)} MiB`);
  });
  await page.evaluate(()=>window.studioDesktop!.onExportProgress(p=>{void(window as unknown as {benchmarkProgress:(p:ExportProgress)=>Promise<void>}).benchmarkProgress(p);}));
  const project=parseProject(fixture),scene=project.scenes[project.sceneOrder[0]],wav=toneWav(durationMs);scene.durationMs=durationMs;
  if(continuous)for(const clip of Object.values(scene.timeline.clips))if(clip.kind==='motion')clip.durationMs=durationMs;
  // Two audible markers establish drift at the beginning and end of the timeline.
  const view=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);
  for(let i=0;i<48000*seconds;i++){const t=i/48;if(!((t>=1000&&t<1100)||(t>=lastMarker&&t<lastMarker+100))){view.setInt16(44+i*4,0,true);view.setInt16(46+i*4,0,true);}}
  project.assets.marker={id:'marker',kind:'audio',name:'AV markers.wav',hash:createHash('sha256').update(wav).digest('hex'),bytes:wav.length,meta:{durationMs}};
  scene.timeline.clips.marker={id:'marker',kind:'audio',assetId:'marker',startMs:0,durationMs,trimInMs:0,gain:.8,fadeInMs:0,fadeOutMs:0,lane:0,muted:false,extensions:{}};
  started=performance.now();
  const result=await Promise.race([
    page.evaluate(async payload=>window.studioDesktop!.requestExport({project:payload.project,sceneId:payload.project.sceneOrder[0],presetId:'mp4',assets:{marker:Uint8Array.from(atob(payload.wav),c=>c.charCodeAt(0))}}),{project,wav:Buffer.from(wav).toString('base64')}),
    new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Benchmark 10 daqiqada tugamadi.')),600000);}),
  ]);
  if(result!==output)throw new Error('Benchmark eksporti tugallanmadi.');
  const elapsedSeconds=(performance.now()-started)/1000,probe=process.env.ANIM_FFPROBE_PATH??resolve(dirname(binary),'ffprobe.exe');
  const metadata=JSON.parse(execFileSync(probe,['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,sample_rate,channels,start_time,duration:format=duration','-of','json',output],{encoding:'utf8',windowsHide:true}));
  const video=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video'),audio=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='audio');
  const pcm=execFileSync(binary,['-v','error','-i',output,'-map','0:a:0','-af','pan=mono|c0=c0','-f','f32le','-ar','48000','-ac','1','pipe:1'],{windowsHide:true,maxBuffer:Math.max(32_000_000,seconds*48000*4+1_000_000)});
  const onset=(nearMs:number)=>{for(let i=(nearMs-30)*48;i<(nearMs+30)*48;i++)if(Math.abs(pcm.readFloatLE(i*4))>.01)return i/48;return Infinity;};
  const markerMs=[onset(1000),onset(lastMarker)],markerErrorMs=markerMs.map((t,i)=>Math.abs(t-[1000,lastMarker][i]));
  const correctnessPassed=video.width===1920&&video.height===1080&&Number(video.nb_read_frames)===expectedFrames&&video.avg_frame_rate==='30/1'&&audio.sample_rate==='48000'&&audio.channels===2&&Math.abs(Number(metadata.format.duration)-seconds)<=1/30&&markerErrorMs.every(n=>n<1000/30),performanceTargetPassed=elapsedSeconds<=seconds*2;
  const report={completed:true,passed:correctnessPassed&&performanceTargetPassed,correctnessPassed,performanceTargetPassed,startedAt,scene:`one vector character, four text layers, ${continuous?'continuous':'initial'} wave motion, stereo audio markers`,size:'1920x1080',fps:30,frames:Number(video.nb_read_frames),durationSeconds:Number(metadata.format.duration),elapsedSeconds:Number(elapsedSeconds.toFixed(3)),exportSecondsPerVideoSecond:Number((elapsedSeconds/seconds).toFixed(3)),peakWorkingSetMiB:Number(peakWorkingSetMiB.toFixed(1)),fileBytes:(await stat(output)).size,markerMs,markerErrorMs,exportTimings,metadata,environment:{os:`${platform()} ${release()}`,cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalRamGiB:Number((totalmem()/1024**3).toFixed(1)),renderer,userAgent:await page.evaluate(()=>navigator.userAgent),ffmpeg:execFileSync(binary,['-version'],{encoding:'utf8',windowsHide:true}).split('\n')[0]},scope:'Single Windows environment, one export, no 10-character stress test or multi-OS validation.'};
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  if(!report.passed)process.exitCode=1;
}catch(error){
  await writeFile(reportPath,JSON.stringify({completed:false,passed:false,startedAt,lastFrame,total:expectedFrames,elapsedSeconds:Number(((performance.now()-started)/1000).toFixed(3)),peakWorkingSetMiB:Number(peakWorkingSetMiB.toFixed(1)),software,error:error instanceof Error?error.message:String(error)},null,2)+'\n');throw error;
}finally{if(timeout)clearTimeout(timeout);await application.close();}
