import { ulid } from 'ulid';
import type { EditorServices } from '../../contracts';
import '../../contracts/desktop';
import { createDemoProject } from '../../../content/characters/hero/build';
import { createEvaluator, builtinEntityKinds } from '../../engine';
import { PixiRenderer } from '../../render-pixi2d/renderer';
import { BrowserStorage, createResolver, download } from '../../storage/browser-storage';
import { DesktopStorage } from '../../storage/desktop-storage';
import { importImage, readAudioFile } from '../../storage/asset-store';
import { WebAudioEngine, inspectAudio } from '../../audio/webaudio-engine';

const bridge=window.studioDesktop;
export const services:EditorServices={
  evaluator:createEvaluator(builtinEntityKinds),
  createRenderer:purpose=>new PixiRenderer(purpose==='export'),
  createAudioEngine:()=>new WebAudioEngine(),
  storage:bridge?new DesktopStorage(bridge):new BrowserStorage(),
  resolver:createResolver,createId:ulid,createProject:()=>createDemoProject(ulid,new Date().toISOString()),
  importImage,saveImage:download,
  async importAudio(file,id){const result=await readAudioFile(file,id);result.asset.meta=await inspectAudio(result.bytes);return result;},
  exportVideo:bridge?(request,onProgress)=>{
    const unsubscribe=bridge.onExportProgress(onProgress);
    return {done:bridge.requestExport(request).finally(unsubscribe),cancel:()=>{void bridge.cancelExport();}};
  }:undefined,
};
