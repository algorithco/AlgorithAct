import { services } from './composition';
import { runExport } from '../../export/run-export';
import type { Encoder, RawFrame } from '../../contracts';
import { encodeFramePacket } from '../shared/frame-packet';

export function startExportWorker(){
  const bridge=window.studioDesktop;if(!bridge)throw new Error('Export worker faqat desktop ilovasida ishlaydi.');
  const controller=new AbortController();bridge.onExportCancel(()=>controller.abort());
  let framePort:MessagePort|undefined;
  const portReady=new Promise<void>(resolve=>window.addEventListener('message',event=>{if(event.source===window && event.data?.type==='algorithco:encoder-port' && event.ports.length){framePort=event.ports[0];resolve();}}));
  bridge.exportWorkerReady(async request=>{
    const renderer=services.createRenderer('export'),resolver=services.resolver(request.assets,request.project),audio=services.createAudioEngine();
    let encoderPipeMs=0,packetEncodeMs=0,packetDecodeMs=0,rawBytes=0,wireBytes=0,packedFrames=0;
    const encoder:Encoder={
      async start(spec){await bridge.encoderStart(spec);await portReady;},
      // Electron's main-side port does not accept ArrayBuffer ownership transfer.
      // Clone one frame and wait for its acknowledgement before producing another.
      writeFrame(frame:RawFrame){return new Promise<void>((resolve,reject)=>{if(!framePort){reject(new Error('Frame port topilmadi.'));return;}const at=performance.now(),packet=encodeFramePacket(frame);packetEncodeMs+=performance.now()-at;rawBytes+=frame.rgba.byteLength;wireBytes+=packet.data.byteLength;if(packet.encoding==='rle32')packedFrames++;framePort.onmessage=event=>{if(event.data.error){reject(new Error(event.data.error));return;}encoderPipeMs+=event.data.writeMs??0;packetDecodeMs+=event.data.decodeMs??0;resolve();};framePort.postMessage(packet);});},
      finish:audioWav=>bridge.encoderFinish(audioWav),abort:()=>bridge.encoderAbort(),
    };
    try{
      await document.fonts.ready;const canvas=document.createElement('canvas');document.body.append(canvas);
      await renderer.init(canvas,request.spec.width,request.spec.height);
      await runExport({evaluator:services.evaluator,renderer,encoder,assets:resolver,audio,onTimings:timings=>bridge.exportProgress({frame:timings.frames,total:timings.frames,progress:1,stage:'finalizing',timings:{...timings,encoderPipeMs,packetEncodeMs,packetDecodeMs,rawBytes,wireBytes,packedFrames,transportMs:Math.max(0,timings.writeMs-encoderPipeMs-packetEncodeMs-packetDecodeMs)}})},request.project,{...request.spec,sceneId:request.sceneId},controller.signal,p=>bridge.exportProgress(p));
      bridge.exportWorkerDone();
    }catch(error){bridge.exportWorkerDone(error instanceof Error?error.message:String(error));}
    finally{renderer.dispose();resolver.dispose();audio.dispose();}
  });
}
