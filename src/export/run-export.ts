import type { Evaluator, Encoder, Renderer, ExportJob, ExportProgress, AssetResolver, AudioEngine, ExportTimings } from '../contracts';
import type { Project } from '../model/schema/project';

export async function runExport(deps:{evaluator:Evaluator;renderer:Renderer;encoder:Encoder;assets:AssetResolver;audio?:AudioEngine;onTimings?:(timings:ExportTimings)=>void},project:Project,job:ExportJob,signal:AbortSignal,onProgress:(p:ExportProgress)=>void):Promise<string>{
  const scene=project.scenes[job.sceneId];if(!scene)throw new Error('Sahna topilmadi.');
  const total=Math.ceil(scene.durationMs*job.fps/1000);
  const started=performance.now(),timings:ExportTimings={frames:total,loadMs:0,audioMs:0,startMs:0,evaluateMs:0,renderMs:0,captureMs:0,writeMs:0,waitMs:0,finishMs:0,totalMs:0};
  let pending:Promise<void>|undefined;
  const check=()=>{if(signal.aborted)throw new DOMException('Eksport bekor qilindi.','AbortError');};
  try {
    check();let at=performance.now();await deps.renderer.load(project,deps.assets);timings.loadMs=performance.now()-at;check();
    let audioWav:Uint8Array|undefined;
    if(Object.values(scene.timeline.clips).some(c=>c.kind==='audio' && !c.muted && c.gain>0 && c.startMs<scene.durationMs)){
      if(!deps.audio)throw new Error('Audio miks xizmati topilmadi.');
      onProgress({frame:0,total,progress:0,stage:'mixing'});
      at=performance.now();
      audioWav=await deps.audio.renderOffline(project,job.sceneId,deps.assets,total*1000/job.fps,signal);
      timings.audioMs=performance.now()-at;
    }
    check();at=performance.now();await deps.encoder.start(job);timings.startMs=performance.now()-at;
    for(let i=0;i<total;i++){
      check();at=performance.now();const frame=deps.evaluator.evaluate(project,job.sceneId,Math.round(i*1000/job.fps));timings.evaluateMs+=performance.now()-at;
      at=performance.now();deps.renderer.render(frame);timings.renderMs+=performance.now()-at;
      at=performance.now();const raw=await deps.renderer.capture();timings.captureMs+=performance.now()-at;
      // One submitted frame plus one prepared frame: bounded lookahead overlaps GPU
      // work with IPC/pipe I/O. A second write never starts before the first ACK.
      check();if(pending){at=performance.now();await pending;timings.waitMs+=performance.now()-at;check();}
      const writeStarted=performance.now(),frameNumber=i+1;
      pending=deps.encoder.writeFrame(raw).then(()=>{timings.writeMs+=performance.now()-writeStarted;onProgress({frame:frameNumber,total,progress:frameNumber/total});});
      // Rendering the next frame can fail before the outstanding write is awaited.
      // Observe its rejection immediately; the catch path still awaits cleanup.
      void pending.catch(()=>{});
    }
    if(pending){const at=performance.now();await pending;timings.waitMs+=performance.now()-at;}
    check();onProgress({frame:total,total,progress:1,stage:'finalizing'});at=performance.now();const result=await deps.encoder.finish(audioWav);timings.finishMs=performance.now()-at;timings.totalMs=performance.now()-started;deps.onTimings?.(timings);return result.outPath;
  } catch(error){await deps.encoder.abort();await pending?.catch(()=>{});throw error;}
}
