import { describe,expect,it } from 'vitest';
import fc from 'fast-check';
import { encodeFramePacket,decodeFramePacket } from '../../src/app-electron/shared/frame-packet';

describe('lossless bounded frame transport',()=>{
  it('compresses flat pixels without changing any RGBA byte',()=>{
    const rgba=new Uint8Array(1920*1080*4);new Uint32Array(rgba.buffer).fill(0xff17314a);
    const packet=encodeFramePacket({width:1920,height:1080,rgba});expect(packet.encoding).toBe('rle32');expect(packet.data.byteLength).toBe(8);expect(Buffer.compare(decodeFramePacket(packet,1920,1080).rgba,rgba)).toBe(0);
  });
  it('roundtrips arbitrary pixels and repeated runs',()=>{
    fc.assert(fc.property(fc.array(fc.record({color:fc.integer({min:0,max:0xffffffff}),count:fc.integer({min:1,max:40})}),{minLength:1,maxLength:30}),runs=>{
      const pixels=new Uint32Array(runs.flatMap(run=>Array(run.count).fill(run.color))),rgba=new Uint8Array(pixels.buffer),before=rgba.slice(),frame={width:pixels.length,height:1,rgba};
      expect(decodeFramePacket(encodeFramePacket(frame),frame.width,frame.height).rgba).toEqual(before);expect(rgba).toEqual(before);
    }),{numRuns:200});
  });
  it('falls back to raw bytes for high-entropy input and excludes unused backing bytes',()=>{
    const source=new Uint8Array(3+256*4+5);for(let i=0;i<256;i++)source[3+i*4]=i;
    const rgba=source.subarray(3,3+256*4),packet=encodeFramePacket({width:256,height:1,rgba});expect(packet.encoding).toBe('rgba');expect(packet.data.buffer.byteLength).toBe(rgba.length);expect(decodeFramePacket(packet,256,1).rgba).toEqual(rgba);
  });
  it('rejects dimension changes, truncated raw data and unknown formats',()=>{
    expect(()=>decodeFramePacket({width:2,height:2,encoding:'rgba',data:new Uint8Array(16)},4,1)).toThrow('mos emas');
    expect(()=>decodeFramePacket({width:2,height:2,encoding:'rgba',data:new Uint8Array(12)},2,2)).toThrow('hajmi');
    expect(()=>decodeFramePacket({width:2,height:2,encoding:'zip',data:new Uint8Array(8)},2,2)).toThrow('formati');
  });
  it('rejects zero, overflowing and incomplete RLE runs before writing outside the frame',()=>{
    for(const count of [0,5,3])expect(()=>decodeFramePacket({width:2,height:2,encoding:'rle32',data:new Uint8Array(new Uint32Array([count,0xff000000]).buffer)},2,2)).toThrow('RLE');
    expect(()=>decodeFramePacket({width:2,height:2,encoding:'rle32',data:new Uint8Array(7)},2,2)).toThrow('formati');
  });
});
