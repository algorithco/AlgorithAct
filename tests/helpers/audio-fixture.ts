/** Independent PCM fixture: stereo sine wave, optionally preceded by silence. */
export function toneWav(durationMs=1000,leadingSilenceMs=0,frequency=440):Uint8Array {
  const rate=48000,frames=Math.round(durationMs*rate/1000),bytes=Buffer.alloc(44+frames*4);
  bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(frames*4,40);
  for(let i=0;i<frames;i++){const value=i*1000/rate<leadingSilenceMs?0:Math.round(Math.sin(2*Math.PI*frequency*i/rate)*.25*32767);bytes.writeInt16LE(value,44+i*4);bytes.writeInt16LE(value,46+i*4);}
  return new Uint8Array(bytes);
}
export function rmsFloat32(bytes:Buffer,fromMs:number,toMs:number,sampleRate=48000):number {
  const start=Math.floor(fromMs*sampleRate/1000),end=Math.min(Math.floor(toMs*sampleRate/1000),bytes.length/4);let sum=0;
  for(let i=start;i<end;i++)sum+=bytes.readFloatLE(i*4)**2;
  return Math.sqrt(sum/Math.max(1,end-start));
}
