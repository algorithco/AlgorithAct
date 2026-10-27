import { spawn, execFile, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join, dirname } from 'node:path';
import { promisify } from 'node:util';
import type { EncodeSpec, RawFrame } from '../../contracts';
import type { FfmpegBinaries } from './ffmpeg-binaries';

function executableError(name:string,error:Error){
  if((error as NodeJS.ErrnoException).code==='ENOENT')return new Error(`${name} fayli topilmadi. Video eksport fayllari to‘liq emas. Ilovani qayta o‘rnating.`);
  return new Error(`${name} ishga tushmadi: ${error.message}`);
}

export class FfmpegProcess {
  constructor(private readonly binaries:FfmpegBinaries){}
  private child?:ChildProcessWithoutNullStreams;
  private completed?:Promise<number|null>;
  private spec?:EncodeSpec;
  private temporary='';
  private frames=0;
  private errorLog='';
  private aborted=false;
  private audioTemporary='';
  private muxTemporary='';
  private muxProcess?:ReturnType<typeof execFile>;
  private muxCompleted?:Promise<unknown>;
  async start(spec:EncodeSpec):Promise<void>{
    if(this.child)throw new Error('Encoder allaqachon ishlayapti.');
    this.aborted=false;
    // Check the verifier before spending time rendering a video we cannot validate.
    const preflight=promisify(execFile)(this.binaries.ffprobe,['-version'],{windowsHide:true,maxBuffer:30_000,timeout:10_000});
    this.muxProcess=preflight.child;this.muxCompleted=preflight;
    try{await preflight;}
    catch(error){if(this.aborted)throw new Error('Eksport bekor qilindi.');throw executableError('FFprobe',error as Error);}
    finally{this.muxProcess=undefined;}
    if(this.aborted)throw new Error('Eksport bekor qilindi.');
    this.spec=spec;this.frames=0;
    this.temporary=join(dirname(spec.outPath),`.algorithco-${randomUUID()}.tmp${extname(spec.outPath)}`);
    const codec=spec.presetId==='webm'?['-c:v','libvpx-vp9','-crf','32','-b:v','0','-deadline','good','-cpu-used','4']:['-c:v','libopenh264','-b:v','6M','-movflags','+faststart'];
    const args=['-hide_banner','-loglevel','error','-nostdin','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${spec.width}x${spec.height}`,'-r',String(spec.fps),'-i','pipe:0','-an',...codec,'-pix_fmt','yuv420p',this.temporary];
    const binary=this.binaries.ffmpeg;
    const child=spawn(binary,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});this.child=child;
    child.stdout.resume();child.stderr.on('data',(chunk:Buffer)=>{this.errorLog=(this.errorLog+chunk.toString()).slice(-5000);});
    child.stdin.on('error',()=>{});
    this.completed=new Promise((resolve,reject)=>{child.once('error',error=>reject(executableError('FFmpeg',error)));child.once('close',code=>resolve(code));});
    // Keep a rejection handled even when a failed spawn precedes the first frame.
    void this.completed.catch(()=>{});
    await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',error=>reject(executableError('FFmpeg',error)));});
  }
  async writeFrame(frame:RawFrame):Promise<void>{
    if(!this.child || !this.spec || this.aborted)throw new Error('Encoder tayyor emas.');
    if(frame.width!==this.spec.width || frame.height!==this.spec.height || frame.rgba.byteLength!==frame.width*frame.height*4)throw new Error('Kadr hajmi encoderga mos emas.');
    const child=this.child;
    if(child.exitCode!==null)throw new Error(`FFmpeg to‘xtadi: ${this.errorLog}`);
    await new Promise<void>((resolve,reject)=>child.stdin.write(frame.rgba,error=>error?reject(new Error(this.errorLog||error.message)):resolve()));
    this.frames++;
  }
  async finish(audioWav?:Uint8Array):Promise<{outPath:string;frames:number}>{
    if(!this.child || !this.spec || !this.completed)throw new Error('Encoder tayyor emas.');
    this.child.stdin.end();const code=await this.completed;
    if(code!==0)throw new Error(`FFmpeg eksport xatosi: ${this.errorLog || `exit ${code}`}`);
    if(this.aborted)throw new Error('Eksport bekor qilindi.');
    let output=this.temporary;
    if(audioWav){
      const view=new DataView(audioWav.buffer,audioWav.byteOffset,audioWav.byteLength),samples=Math.round(this.frames*48000/this.spec.fps);
      if(audioWav.length!==44+samples*4 || view.getUint32(0,false)!==0x52494646 || view.getUint32(8,false)!==0x57415645 || view.getUint32(12,false)!==0x666d7420 || view.getUint32(36,false)!==0x64617461 || view.getUint16(20,true)!==1 || view.getUint16(22,true)!==2 || view.getUint32(24,true)!==48000 || view.getUint16(34,true)!==16 || view.getUint32(40,true)!==samples*4)throw new Error('Audio miks WAV formati yoki davomiyligi noto‘g‘ri.');
      this.audioTemporary=`${this.temporary}.wav`;this.muxTemporary=`${this.temporary}.mux${extname(this.spec.outPath)}`;
      await writeFile(this.audioTemporary,audioWav);if(this.aborted)throw new Error('Eksport bekor qilindi.');
      const args=['-hide_banner','-loglevel','error','-nostdin','-y','-i',this.temporary,'-i',this.audioTemporary,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a',this.spec.presetId==='webm'?'libopus':'aac','-b:a','160k','-ar','48000','-ac','2','-t',(this.frames/this.spec.fps).toFixed(9),...(this.spec.presetId==='mp4'?['-movflags','+faststart']:[]),this.muxTemporary];
      const operation=promisify(execFile)(this.binaries.ffmpeg,args,{windowsHide:true,maxBuffer:100_000,timeout:120_000});
      this.muxProcess=operation.child;this.muxCompleted=operation;await operation;this.muxProcess=undefined;
      if(this.aborted)throw new Error('Eksport bekor qilindi.');output=this.muxTemporary;
    }
    const ffprobe=this.binaries.ffprobe;
    const probeOperation=promisify(execFile)(ffprobe,['-v','error','-count_frames','-show_entries','stream=codec_type,width,height,nb_read_frames,sample_rate,channels,start_time:format=duration','-of','json',output],{windowsHide:true,maxBuffer:100_000,timeout:120_000});
    this.muxProcess=probeOperation.child;this.muxCompleted=probeOperation;const {stdout}=await probeOperation;this.muxProcess=undefined;
    const probe=JSON.parse(stdout) as {streams:{codec_type:string;width:number;height:number;nb_read_frames:string;sample_rate?:string;channels?:number;start_time?:string}[];format:{duration:string}};
    const video=probe.streams.find(s=>s.codec_type==='video'),duration=Number(probe.format.duration),sound=probe.streams.find(s=>s.codec_type==='audio');
    if(!video || Number(video.nb_read_frames)!==this.frames || video.width!==this.spec.width || video.height!==this.spec.height || Math.abs(duration-this.frames/this.spec.fps)>1/this.spec.fps+.001)throw new Error('FFprobe: eksport kadr soni, o‘lchami yoki davomiyligi noto‘g‘ri.');
    if(audioWav && (!sound || Number(sound.sample_rate)!==48000 || sound.channels!==2 || Math.abs(Number(sound.start_time??0))>1/this.spec.fps+.001))throw new Error('FFprobe: audio treki yoki sinxronligi noto‘g‘ri.');
    if(this.aborted)throw new Error('Eksport bekor qilindi.');
    // The original output is only replaced after ffmpeg has closed successfully.
    await rename(output,this.spec.outPath);
    await this.cleanTemporary();
    const result={outPath:this.spec.outPath,frames:this.frames};this.child=undefined;return result;
  }
  async abort():Promise<void>{
    this.aborted=true;
    if(this.muxProcess){this.muxProcess.kill();try{await this.muxCompleted;}catch{/* cancelled mux */}this.muxProcess=undefined;}
    if(this.child){this.child.stdin.destroy();this.child.kill();try{await this.completed;}catch{/* failed spawn */}this.child=undefined;}
    await this.cleanTemporary();
  }
  private async cleanTemporary(){for(const path of [this.temporary,this.audioTemporary,this.muxTemporary])if(path)await rm(path,{force:true});}
}
