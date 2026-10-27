import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '../../contracts/desktop';

const bridge:DesktopBridge={
  windowControls:{
    getState:()=>ipcRenderer.invoke('window:state'),
    minimize:()=>ipcRenderer.invoke('window:minimize'),
    toggleMaximize:()=>ipcRenderer.invoke('window:toggle-maximize'),
    requestClose:()=>ipcRenderer.invoke('window:request-close'),
    confirmClose:()=>ipcRenderer.invoke('window:confirm-close'),
    onStateChange(callback){const listener=(_event:unknown,state:Parameters<typeof callback>[0])=>callback(state);ipcRenderer.on('window:state-changed',listener);return()=>{ipcRenderer.removeListener('window:state-changed',listener);};},
    onCloseRequested(callback){const listener=()=>callback();ipcRenderer.on('window:close-requested',listener);return()=>{ipcRenderer.removeListener('window:close-requested',listener);};},
  },
  openProject:()=>ipcRenderer.invoke('project:open'),
  saveProject:(bytes,name)=>ipcRenderer.invoke('project:save',bytes,name),
  writeRecovery:bytes=>ipcRenderer.invoke('recovery:write',bytes),
  readRecovery:()=>ipcRenderer.invoke('recovery:read'),
  clearRecovery:()=>ipcRenderer.invoke('recovery:clear'),
  requestExport:request=>ipcRenderer.invoke('export:request',request),
  cancelExport:()=>ipcRenderer.invoke('export:cancel'),
  onExportProgress(callback){const listener=(_event:unknown,progress:Parameters<typeof callback>[0])=>callback(progress);ipcRenderer.on('export:progress',listener);return()=>{ipcRenderer.removeListener('export:progress',listener);};},
  exportWorkerReady(callback){const listener=(_event:unknown,request:Parameters<typeof callback>[0])=>callback(request);ipcRenderer.on('export:worker-data',listener);ipcRenderer.send('export:worker-ready');return()=>{ipcRenderer.removeListener('export:worker-data',listener);};},
  encoderStart:spec=>ipcRenderer.invoke('encoder:start',spec),
  encoderFinish:audioWav=>ipcRenderer.invoke('encoder:finish',audioWav),
  encoderAbort:()=>ipcRenderer.invoke('encoder:abort'),
  exportProgress:progress=>ipcRenderer.send('export:progress',progress),
  exportWorkerDone:error=>ipcRenderer.send('export:done',error),
  onExportCancel(callback){const listener=()=>callback();ipcRenderer.on('export:cancel',listener);return()=>{ipcRenderer.removeListener('export:cancel',listener);};},
};
ipcRenderer.on('encoder:port',event=>{window.postMessage({type:'algorithco:encoder-port'},window.location.origin==='null'?'*':window.location.origin,event.ports);});
contextBridge.exposeInMainWorld('studioDesktop',bridge);
