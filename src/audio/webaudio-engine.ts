import type { AssetResolver, AudioEngine } from '../contracts';
import type { AudioClip, Project } from '../model/schema/project';
import { planAudioClip } from './clip-schedule';
import { encodePcmWav } from './pcm-wav';

const SAMPLE_RATE = 48000;
interface Decoded { buffer: AudioBuffer; peaks: number[] }
function peaks(buffer: AudioBuffer): number[] {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  return Array.from({ length: 160 }, (_, bin) => {
    const from = Math.floor(bin * buffer.length / 160), to = Math.max(from + 1, Math.floor((bin + 1) * buffer.length / 160));
    let peak = 0;
    for (const channel of channels) for (let i = from; i < to; i += Math.max(1, Math.floor((to - from) / 512))) peak = Math.max(peak, Math.abs(channel[i] ?? 0));
    return peak;
  });
}
function decoder() { return new OfflineAudioContext(2, 1, SAMPLE_RATE); }
export async function inspectAudio(bytes: Uint8Array): Promise<{ durationMs: number }> {
  let buffer: AudioBuffer;
  try { buffer = await decoder().decodeAudioData(new Uint8Array(bytes).buffer); }
  catch { throw new Error('Audio o‘qilmadi. WAV, MP3, OGG, M4A yoki FLAC faylini tanlang.'); }
  if (buffer.duration > 300 || buffer.numberOfChannels * buffer.length * 4 > 128_000_000) throw new Error('Audio 5 daqiqadan yoki dekodlangan hajmi 128 MB dan oshmasin.');
  return { durationMs: Math.max(1, Math.round(buffer.duration * 1000)) };
}
function schedule(context: BaseAudioContext, clips: AudioClip[], buffers: Map<string, AudioBuffer>, fromMs: number, untilMs: number, startTime: number): AudioBufferSourceNode[] {
  const sources: AudioBufferSourceNode[] = [];
  for (const clip of clips) {
    const buffer = buffers.get(clip.assetId); if (!buffer) continue;
    const plan = planAudioClip(clip, fromMs, untilMs, buffer.duration * 1000); if (!plan) continue;
    const source = context.createBufferSource(), gain = context.createGain(); source.buffer = buffer;
    const when = startTime + plan.whenMs / 1000;
    gain.gain.setValueAtTime(plan.envelope[0].value, when);
    for (const event of plan.envelope.slice(1)) gain.gain.linearRampToValueAtTime(event.value, when + event.atMs / 1000);
    source.connect(gain); gain.connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(when, plan.offsetMs / 1000, plan.durationMs / 1000); sources.push(source);
  }
  return sources;
}
export class WebAudioEngine implements AudioEngine {
  private context?: AudioContext;
  private decoded = new Map<string, Decoded>();
  private assetHashes = new Map<string, string>();
  private clips: AudioClip[] = [];
  private buffers = new Map<string, AudioBuffer>();
  private sources: AudioBufferSourceNode[] = [];
  private durationMs = 0;
  private positionMs = 0;
  private startTime = 0;
  private running = false;
  private playVersion = 0;
  private loadVersion = 0;
  private disposed = false;
  async load(project: Project, sceneId: string, assets: AssetResolver): Promise<void> {
    const version = ++this.loadVersion, scene = project.scenes[sceneId];
    if (!scene) throw new Error('Audio sahnasi topilmadi.');
    const clips = Object.values(scene.timeline.clips).filter((c): c is AudioClip => c.kind === 'audio');
    const ids = [...new Set(clips.map(c => c.assetId))], buffers = new Map<string, AudioBuffer>(), hashes = new Map<string, string>();
    const needed = new Set(ids.map(id => project.assets[id]?.hash));
    for (const hash of this.decoded.keys()) if (!needed.has(hash)) this.decoded.delete(hash);
    let memory = 0;
    for (const id of ids) {
      const asset = project.assets[id]; if (!asset || asset.kind !== 'audio') throw new Error('Audio aktivi topilmadi.');
      let entry = this.decoded.get(asset.hash);
      if (!entry) {
        const bytes = await assets.bytes(id);
        let buffer: AudioBuffer;
        try { buffer = await decoder().decodeAudioData(new Uint8Array(bytes).buffer); }
        catch { throw new Error(`Audio o‘qilmadi: ${asset.name}`); }
        if (buffer.duration > 300 || buffer.numberOfChannels * buffer.length * 4 > 128_000_000) throw new Error('Audio hajmi limitdan katta.');
        if (version !== this.loadVersion || this.disposed) return;
        entry = { buffer, peaks: peaks(buffer) }; this.decoded.set(asset.hash, entry);
      }
      if (![...hashes.values()].includes(asset.hash)) memory += entry.buffer.length * entry.buffer.numberOfChannels * 4;
      if (memory > 192_000_000) throw new Error('Loyihada dekodlangan audio hajmi 192 MB dan oshdi.');
      buffers.set(id, entry.buffer); hashes.set(id, asset.hash);
    }
    if (version !== this.loadVersion || this.disposed) return;
    this.pause(); this.clips = clips; this.buffers = buffers; this.assetHashes = hashes; this.durationMs = scene.durationMs;
  }
  async play(fromMs: number): Promise<void> {
    this.pause(); const version = this.playVersion;
    this.context ??= new AudioContext({ sampleRate: SAMPLE_RATE });
    await this.context.resume();
    if (version !== this.playVersion || this.disposed) return;
    this.positionMs = Math.max(0, Math.min(this.durationMs, fromMs));
    this.startTime = this.context.currentTime + .02;
    this.sources = schedule(this.context, this.clips, this.buffers, this.positionMs, this.durationMs, this.startTime); this.running = true;
  }
  pause(): void {
    this.positionMs = this.currentMs(); this.running = false; this.playVersion++;
    for (const source of this.sources) { try { source.stop(); } catch { /* already ended */ } source.disconnect(); }
    this.sources = [];
  }
  currentMs(): number {
    if(!this.running || !this.context)return this.positionMs;
    const timestamp=this.context.getOutputTimestamp(),performanceTime=timestamp.performanceTime??0,contextTime=timestamp.contextTime??0;
    const clock=performanceTime>0&&contextTime>0
      ?Math.min(this.context.currentTime,contextTime+Math.max(0,performance.now()-performanceTime)/1000)
      :this.context.currentTime;
    return Math.min(this.durationMs,this.positionMs+Math.max(0,clock-this.startTime)*1000);
  }
  waveform(assetId: string): readonly number[] { return this.decoded.get(this.assetHashes.get(assetId) ?? '')?.peaks ?? []; }
  async renderOffline(project: Project, sceneId: string, assets: AssetResolver, durationMs: number, signal: AbortSignal): Promise<Uint8Array | undefined> {
    const check = () => { if (signal.aborted) throw new DOMException('Eksport bekor qilindi.', 'AbortError'); };
    check(); await this.load(project, sceneId, assets); check();
    if (!this.clips.some(c => !c.muted && c.gain > 0 && c.startMs < durationMs)) return undefined;
    const context = new OfflineAudioContext(2, Math.round(durationMs * SAMPLE_RATE / 1000), SAMPLE_RATE);
    schedule(context, this.clips, this.buffers, 0, durationMs, 0);
    const buffer = await context.startRendering(); check(); return encodePcmWav(buffer);
  }
  dispose(): void { if(this.disposed)return;this.disposed = true; this.loadVersion++; this.pause(); this.decoded.clear(); this.buffers.clear(); this.assetHashes.clear(); void this.context?.close(); }
}
