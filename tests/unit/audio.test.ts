import { describe, expect, it } from 'vitest';
import type { AudioClip } from '../../src/model/schema/project';
import { gainAt, planAudioClip } from '../../src/audio/clip-schedule';
import { encodePcmWav } from '../../src/audio/pcm-wav';

const clip:AudioClip={id:'audio',kind:'audio',assetId:'sound',startMs:500,durationMs:2000,trimInMs:100,gain:.8,fadeInMs:200,fadeOutMs:400,lane:0,muted:false,extensions:{}};
describe('shared preview/export audio schedule',()=>{
  it('schedules source offset, start and duration independently',()=>{
    const plan=planAudioClip(clip,0,3000,5000)!;expect(plan.whenMs).toBe(500);expect(plan.offsetMs).toBe(100);expect(plan.durationMs).toBe(2000);
    expect(plan.envelope).toEqual([{atMs:0,value:0},{atMs:200,value:.8},{atMs:2000/3,value:.8},{atMs:1600,value:.8},{atMs:2000,value:0}]);
  });
  it('seeks into the existing clip and preserves fade gain at the seek point',()=>{
    const plan=planAudioClip(clip,600,3000,5000)!;expect(plan.whenMs).toBe(0);expect(plan.offsetMs).toBe(200);expect(plan.durationMs).toBe(1900);expect(plan.envelope[0]).toEqual({atMs:0,value:.4});
  });
  it('clamps at both the scene and decoded media boundaries',()=>{
    expect(planAudioClip(clip,0,1000,5000)?.durationMs).toBe(500);expect(planAudioClip(clip,0,3000,600)?.durationMs).toBe(500);
  });
  it('omits muted, zero-gain, ended and trimmed-out clips',()=>{
    for(const c of [{...clip,muted:true},{...clip,gain:0}])expect(planAudioClip(c,0,3000,5000)).toBeNull();
    expect(planAudioClip(clip,2500,3000,5000)).toBeNull();expect(planAudioClip(clip,0,3000,50)).toBeNull();
  });
  it('uses the true crossing when fade-in and fade-out overlap',()=>{
    const c={...clip,durationMs:1000,fadeInMs:800,fadeOutMs:800,gain:1};
    expect(gainAt(c,500)).toBe(.625);expect(planAudioClip(c,0,3000,5000)?.envelope).toContainEqual({atMs:500,value:.625});
    expect(gainAt(c,250)).toBe(.3125);expect(gainAt(c,750)).toBe(.3125);
  });
  it('preserves a constant level without fades',()=>{
    const c={...clip,fadeInMs:0,fadeOutMs:0};expect(gainAt(c,0)).toBe(.8);expect(gainAt(c,1000)).toBe(.8);
  });
});
describe('PCM WAV output',()=>{
  it('writes a standard stereo PCM16 header and interleaves/clamps samples',()=>{
    const bytes=encodePcmWav({length:3,numberOfChannels:2,sampleRate:48000,getChannelData:channel=>channel?new Float32Array([1,0,-2]):new Float32Array([-1,.5,2])}),view=new DataView(bytes.buffer);
    expect(new TextDecoder().decode(bytes.subarray(0,4))).toBe('RIFF');expect(new TextDecoder().decode(bytes.subarray(8,12))).toBe('WAVE');expect(view.getUint32(24,true)).toBe(48000);expect(view.getUint16(22,true)).toBe(2);expect(view.getUint32(40,true)).toBe(12);expect(bytes.length).toBe(56);
    expect(Array.from({length:6},(_,i)=>view.getInt16(44+i*2,true))).toEqual([-32768,32767,16384,0,32767,-32768]);
  });
  it('rejects unsupported channel counts',()=>expect(()=>encodePcmWav({length:1,numberOfChannels:3,sampleRate:48000,getChannelData:()=>new Float32Array(1)})).toThrow('hajmi'));
});
