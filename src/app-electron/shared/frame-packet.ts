import type { RawFrame } from '../../contracts';

export interface FramePacket { width:number; height:number; encoding:'rgba'|'rle32'; data:Uint8Array }
const littleEndian=new Uint8Array(new Uint32Array([0x01020304]).buffer)[0]===4;

/** Lossless transport for flat vector frames; noisy images fall back to exact RGBA. */
export function encodeFramePacket(frame:RawFrame):FramePacket {
  const {width,height,rgba}=frame,pixelCount=width*height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>3840||height>3840||rgba.byteLength!==pixelCount*4)throw new Error('Kadr hajmi noto‘g‘ri.');
  const raw=():FramePacket=>({width,height,encoding:'rgba',data:rgba.byteOffset===0&&rgba.buffer.byteLength===rgba.byteLength?rgba:rgba.slice()});
  if(!littleEndian)return raw();
  const pixels=rgba.byteOffset%4===0?new Uint32Array(rgba.buffer,rgba.byteOffset,pixelCount):new Uint32Array(rgba.slice().buffer);
  // Cap temporary work and wire bytes; abandon high-entropy input early.
  const capacity=Math.max(2,Math.floor(Math.min(rgba.byteLength/4,1_048_576)/8)*2),runs=new Uint32Array(capacity);
  let start=0,color=pixels[0],out=0;
  for(let i=1;i<=pixelCount;i++)if(i===pixelCount||pixels[i]!==color){
    if(out+2>runs.length)return raw();
    runs[out++]=i-start;runs[out++]=color;start=i;color=pixels[i];
  }
  if(out*4>=rgba.byteLength)return raw();
  const packed=runs.slice(0,out);
  return {width,height,encoding:'rle32',data:new Uint8Array(packed.buffer)};
}

export function decodeFramePacket(packet:unknown,width:number,height:number):RawFrame {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>3840||height>3840)throw new Error('Encoder o‘lchami noto‘g‘ri.');
  if(!packet||typeof packet!=='object')throw new Error('Kadr paketi topilmadi.');
  const p=packet as Partial<FramePacket>,bytes=width*height*4;
  if(p.width!==width||p.height!==height||!(p.data instanceof Uint8Array))throw new Error('Kadr paketi encoderga mos emas.');
  if(p.encoding==='rgba'){
    if(p.data.byteLength!==bytes)throw new Error('RGBA kadr hajmi noto‘g‘ri.');
    return {width,height,rgba:p.data};
  }
  if(p.encoding!=='rle32'||!littleEndian||!p.data.length||p.data.byteLength%8!==0||p.data.byteLength>Math.min(bytes,1_048_576))throw new Error('RLE kadr formati noto‘g‘ri.');
  const rgba=new Uint8Array(bytes),pixels=new Uint32Array(rgba.buffer),view=new DataView(p.data.buffer,p.data.byteOffset,p.data.byteLength);
  let offset=0;
  for(let i=0;i<p.data.byteLength;i+=8){
    const count=view.getUint32(i,true),color=view.getUint32(i+4,true);
    if(!count||offset+count>pixels.length)throw new Error('RLE kadr chegarasi noto‘g‘ri.');
    pixels.fill(color,offset,offset+count);offset+=count;
  }
  if(offset!==pixels.length)throw new Error('RLE kadr uzilgan.');
  return {width,height,rgba};
}
