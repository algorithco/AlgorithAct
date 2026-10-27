import { app, BrowserWindow, dialog, ipcMain, MessageChannelMain, type IpcMainInvokeEvent, type MessagePortMain } from 'electron';
import { readFile, writeFile, mkdir, rename, rm, stat, open } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseProject } from '../../model/validate';
import type { EncodeSpec, ExportProgress, ExportRequest } from '../../contracts';
import { FfmpegProcess } from './ffmpeg-process';
import { resolveFfmpegBinaries } from './ffmpeg-binaries';
import { decodeFramePacket } from '../shared/frame-packet';

// Keep existing recovery files and browser data available after the product rename.
const explicitUserDataPath=app.commandLine.getSwitchValue('user-data-dir');
const userDataPath=explicitUserDataPath?resolve(explicitUserDataPath):join(app.getPath('appData'),'algorithco-animation');
mkdirSync(userDataPath,{recursive:true});
app.setPath('userData',userDataPath);
app.setName('AlgorithAct');
if(process.platform==='win32')app.setAppUserModelId('com.algorithact.desktop');

let main:BrowserWindow|undefined;
// Resolve bundled files from the application, independently of its launch folder.
const appRoot=app.isPackaged?app.getAppPath():resolve(__dirname,'..');
const preload=join(appRoot,'dist-electron/preload.cjs');
const devUrl=process.env.ANIM_DEV_URL;
const appUrl=devUrl??pathToFileURL(join(appRoot,'dist/index.html')).href;
let job:{window:BrowserWindow;request:ExportRequest;spec:EncodeSpec;encoder:FfmpegProcess;port?:MessagePortMain;resolve:(path:string|null)=>void;reject:(e:Error)=>void;expected:number;cancelled:boolean;frameBusy:boolean;finished:boolean}|undefined;
const recoveryPath=()=>join(app.getPath('userData'),'recovery','latest.anim');
function isMain(event:IpcMainInvokeEvent){if(!main || event.sender!==main.webContents || event.senderFrame!==main.webContents.mainFrame)throw new Error('IPC manbasi ruxsat etilmagan.');}
function isWorker(event:IpcMainInvokeEvent){if(!job || event.sender!==job.window.webContents || event.senderFrame!==job.window.webContents.mainFrame)throw new Error('Export IPC manbasi noto‘g‘ri.');return job;}
function checkedBytes(bytes:unknown):Uint8Array{if(!(bytes instanceof Uint8Array)||bytes.byteLength>100_000_000)throw new Error('Fayl hajmi/turi noto‘g‘ri.');return bytes;}
async function atomicWrite(path:string,bytes:Uint8Array,backup:boolean){
  await mkdir(dirname(path),{recursive:true});const temp=`${path}.${randomUUID()}.tmp`;
  try{const handle=await open(temp,'wx');try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
    if(backup){try{const previous=await readFile(path);await writeFile(`${path}.bak`,previous);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
    await rename(temp,path);
  }finally{await rm(temp,{force:true});}
}
async function limitedRead(path:string){if((await stat(path)).size>100_000_000)throw new Error('Fayl 100 MB dan katta.');return new Uint8Array(await readFile(path));}
function secureWindow(show:boolean){
  const icon=join(appRoot,devUrl?'public/brand':'dist/brand',process.platform==='win32'?'algorithact.ico':'algorithact-icon.png');
  const win=new BrowserWindow({width:1500,height:980,minWidth:1100,minHeight:740,show,backgroundColor:'#111214',title:'AlgorithAct',icon,autoHideMenuBar:true,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:show}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  return win;
}
async function settleExport(error?:string){
  const current=job;if(!current)return;job=undefined;
  current.port?.close();
  try{
    if(error || current.cancelled || !current.finished){await current.encoder.abort();if(current.cancelled)current.resolve(null);else current.reject(new Error(error||'Eksport tugallanmagan.'));}
    else current.resolve(current.spec.outPath);
  }catch(cleanupError){current.reject(new Error(`Eksportni tozalash xatosi: ${cleanupError instanceof Error?cleanupError.message:String(cleanupError)}`));}
  finally{if(!current.window.isDestroyed())current.window.destroy();}
}
function registerIpc(){
  ipcMain.handle('project:open',async event=>{isMain(event);const result=await dialog.showOpenDialog(main!,{properties:['openFile'],filters:[{name:'Animatsiya loyihasi',extensions:['anim']}]});return result.canceled?null:limitedRead(result.filePaths[0]);});
  ipcMain.handle('project:save',async(event,raw,name:unknown)=>{isMain(event);const bytes=checkedBytes(raw);if(typeof name!=='string')throw new Error('Noto‘g‘ri nom.');const result=await dialog.showSaveDialog(main!,{defaultPath:`${name.slice(0,100).replace(/[<>:"/\\|?*]/g,'_')}.anim`,filters:[{name:'Animatsiya loyihasi',extensions:['anim']}]});if(result.canceled||!result.filePath)return false;await atomicWrite(result.filePath,bytes,true);return true;});
  ipcMain.handle('recovery:write',async(event,raw)=>{isMain(event);await atomicWrite(recoveryPath(),checkedBytes(raw),false);});
  ipcMain.handle('recovery:read',async event=>{isMain(event);try{return await limitedRead(recoveryPath());}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}});
  ipcMain.handle('recovery:clear',async event=>{isMain(event);await rm(recoveryPath(),{force:true});});
  ipcMain.handle('export:request',async(event,request:ExportRequest)=>{
    isMain(event);if(job)throw new Error('Boshqa eksport hali tugamadi.');
    const project=parseProject(request.project),scene=project.scenes[request.sceneId];
    if(!scene || !['mp4','webm'].includes(request.presetId))throw new Error('Eksport parametrlari noto‘g‘ri.');
    if(project.settings.frame.width%2 || project.settings.frame.height%2)throw new Error('Video o‘lchamlari juft son bo‘lishi kerak.');
    let totalBytes=0;for(const bytes of Object.values(request.assets)){checkedBytes(bytes);totalBytes+=bytes.byteLength;}if(totalBytes>100_000_000)throw new Error('Aktivlar hajmi limitdan oshdi.');
    const result=await dialog.showSaveDialog(main!,{defaultPath:`${project.meta.name.replace(/[<>:"/\\|?*]/g,'_')}.${request.presetId}`,filters:[{name:request.presetId.toUpperCase(),extensions:[request.presetId]}]});
    if(result.canceled || !result.filePath)return null;
    return new Promise<string|null>((resolveJob,reject)=>{
      const worker=secureWindow(false),spec:EncodeSpec={...project.settings.frame,fps:project.settings.fps,presetId:request.presetId,outPath:result.filePath!};
      job={window:worker,request:{...request,project},spec,encoder:new FfmpegProcess(resolveFfmpegBinaries({resourcesPath:process.resourcesPath,developmentRoot:app.isPackaged?undefined:appRoot})),resolve:resolveJob,reject,expected:Math.ceil(scene.durationMs*spec.fps/1000),cancelled:false,frameBusy:false,finished:false};
      worker.webContents.once('render-process-gone',()=>{void settleExport('Eksport oynasi kutilmaganda yopildi.');});
      worker.once('unresponsive',()=>{void settleExport('Eksport oynasi javob bermayapti.');});
      void worker.loadURL(`${appUrl}${appUrl.includes('?')?'&':'?'}mode=export`).catch(error=>{void settleExport(error.message);});
    });
  });
  ipcMain.handle('export:cancel',async event=>{isMain(event);if(job){job.cancelled=true;job.window.webContents.send('export:cancel');await settleExport();}});
  ipcMain.on('export:worker-ready',event=>{if(job && event.sender===job.window.webContents)event.sender.send('export:worker-data',{...job.request,spec:job.spec});});
  ipcMain.handle('encoder:start',async(event)=>{
    const current=isWorker(event);await current.encoder.start(current.spec);
    const channel=new MessageChannelMain();current.port=channel.port1;
    channel.port1.on('message',async event=>{
      if(job!==current)return;
      if(current.frameBusy){channel.port1.postMessage({error:'Encoder navbati band.'});return;}
      current.frameBusy=true;
      try{const decodeStarted=performance.now(),frame=decodeFramePacket(event.data,current.spec.width,current.spec.height),decodeMs=performance.now()-decodeStarted,at=performance.now();await current.encoder.writeFrame(frame);channel.port1.postMessage({ok:true,writeMs:performance.now()-at,decodeMs});}
      catch(error){channel.port1.postMessage({error:error instanceof Error?error.message:String(error)});}
      finally{current.frameBusy=false;}
    });channel.port1.start();current.window.webContents.postMessage('encoder:port',null,[channel.port2]);
  });
  ipcMain.handle('encoder:finish',async(event,audioWav:unknown)=>{const current=isWorker(event);const result=await current.encoder.finish(audioWav===undefined?undefined:checkedBytes(audioWav));if(result.frames!==current.expected)throw new Error('Eksport kadr soni noto‘g‘ri.');current.finished=true;return result;});
  ipcMain.handle('encoder:abort',async event=>{if(job && event.sender===job.window.webContents)await job.encoder.abort();});
  ipcMain.on('export:progress',(event,progress:ExportProgress)=>{if(job && event.sender===job.window.webContents && Number.isFinite(progress.progress))main?.webContents.send('export:progress',progress);});
  ipcMain.on('export:done',(event,error?:string)=>{if(job && event.sender===job.window.webContents)void settleExport(error);});
}
void app.whenReady().then(async()=>{
  registerIpc();main=secureWindow(true);await main.loadURL(appUrl);
  main.on('closed',()=>{main=undefined;if(job)void settleExport('Asosiy oyna yopildi.');});
});
app.on('window-all-closed',()=>app.quit());
