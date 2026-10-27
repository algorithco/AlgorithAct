import { describe, expect, it, vi } from 'vitest';
import { runExport } from '../../src/export/run-export';
import { createEvaluator, builtinEntityKinds } from '../../src/engine';
import { parseProject } from '../../src/model/validate';
import fixture from '../fixtures/project.v1.json';
import type { Renderer, Encoder, ExportJob, AudioEngine } from '../../src/contracts';
function setup(){
  const project=parseProject(fixture);project.scenes[project.sceneOrder[0]].durationMs=101;
  const times:number[]=[],order:string[]=[];
  const renderer:Renderer={init:vi.fn(),load:vi.fn(),render:f=>{times.push(f.t);order.push('render');},capture:async()=>{order.push('capture');return {width:2,height:2,rgba:new Uint8Array(16)};},capturePng:vi.fn(),dispose:vi.fn()};
  const encoder:Encoder={start:vi.fn(),writeFrame:async()=>{order.push('write');await Promise.resolve();order.push('ack');},finish:vi.fn(async()=>({outPath:'test.webm',frames:4})),abort:vi.fn()};
  const job:ExportJob={sceneId:project.sceneOrder[0],width:2,height:2,fps:30,presetId:'webm',outPath:'test.webm'};
  return {project,renderer,encoder,job,times,order,deps:{evaluator:createEvaluator(builtinEntityKinds),renderer,encoder,assets:{url:()=>'',bytes:async()=>new Uint8Array()}}};
}
describe('export pipeline',()=>{
  it('uses integer frame time and waits for writes before finalization',async()=>{const s=setup(),progress=vi.fn();await runExport(s.deps,s.project,s.job,new AbortController().signal,progress);expect(s.times).toEqual([0,33,67,100]);expect(s.order.filter(v=>v==='write')).toHaveLength(4);expect(s.order.filter(v=>v==='ack')).toHaveLength(4);expect(progress).toHaveBeenLastCalledWith({frame:4,total:4,progress:1,stage:'finalizing'});expect(s.encoder.finish).toHaveBeenCalledOnce();});
  it('stops after at most one prepared frame when cancelled',async()=>{const s=setup(),controller=new AbortController();await expect(runExport(s.deps,s.project,s.job,controller.signal,()=>controller.abort())).rejects.toThrow('bekor');expect(s.times.length).toBeLessThanOrEqual(2);expect(s.order.filter(v=>v==='write')).toHaveLength(1);expect(s.encoder.abort).toHaveBeenCalledOnce();expect(s.encoder.finish).not.toHaveBeenCalled();});
  it('aborts and preserves the original failure',async()=>{const s=setup();s.encoder.writeFrame=async()=>{throw new Error('disk-full');};await expect(runExport(s.deps,s.project,s.job,new AbortController().signal,()=>{})).rejects.toThrow('disk-full');expect(s.encoder.abort).toHaveBeenCalledOnce();});
  it('mixes audio for the quantized video duration and passes WAV to finalization',async()=>{
    const s=setup(),wav=new Uint8Array([82,73,70,70]),audio:AudioEngine={load:vi.fn(),play:vi.fn(),pause:vi.fn(),currentMs:()=>0,waveform:()=>[],renderOffline:vi.fn(async()=>wav),dispose:vi.fn()},scene=s.project.scenes[s.job.sceneId];
    scene.timeline.clips.audio={id:'audio',kind:'audio',assetId:'sound',startMs:0,durationMs:101,trimInMs:0,gain:1,fadeInMs:0,fadeOutMs:0,lane:0,muted:false,extensions:{}};
    await runExport({...s.deps,audio},s.project,s.job,new AbortController().signal,()=>{});
    expect(audio.renderOffline).toHaveBeenCalledWith(s.project,s.job.sceneId,s.deps.assets,4*1000/30,expect.any(AbortSignal));expect(s.encoder.finish).toHaveBeenCalledWith(wav);
  });
  it('does not silently drop active audio when a mixer is unavailable',async()=>{
    const s=setup();s.project.scenes[s.job.sceneId].timeline.clips.audio={id:'audio',kind:'audio',assetId:'sound',startMs:0,durationMs:101,trimInMs:0,gain:1,fadeInMs:0,fadeOutMs:0,lane:0,muted:false,extensions:{}};
    await expect(runExport(s.deps,s.project,s.job,new AbortController().signal,()=>{})).rejects.toThrow('miks xizmati');expect(s.encoder.start).not.toHaveBeenCalled();
  });
  it('overlaps rendering with one pending write without reordering or unbounded production',async()=>{
    const s=setup();let inFlight=0,overlap=false;const written:number[]=[];
    s.renderer.render=f=>{s.times.push(f.t);if(inFlight)overlap=true;};
    s.renderer.capture=async()=>{const rgba=new Uint8Array(16);rgba[0]=s.times.at(-1)!;return {width:2,height:2,rgba};};
    s.encoder.writeFrame=async frame=>{expect(inFlight).toBe(0);inFlight++;written.push(frame.rgba[0]);await new Promise(resolve=>setTimeout(resolve,2));inFlight--;};
    await runExport(s.deps,s.project,s.job,new AbortController().signal,()=>{});
    expect(overlap).toBe(true);expect(written).toEqual([0,33,67,100]);expect(inFlight).toBe(0);
  });
  it('preserves a render failure and observes a rejected in-flight write during abort',async()=>{
    const s=setup();let rejectWrite:(error:Error)=>void=()=>{};
    s.renderer.render=()=>{if(s.times.length)throw new Error('render-failed');s.times.push(0);};
    s.encoder.writeFrame=()=>new Promise((_,reject)=>{rejectWrite=reject;});
    s.encoder.abort=vi.fn(async()=>rejectWrite(new Error('pipe-closed')));
    await expect(runExport(s.deps,s.project,s.job,new AbortController().signal,()=>{})).rejects.toThrow('render-failed');expect(s.encoder.abort).toHaveBeenCalledOnce();
  });
});
