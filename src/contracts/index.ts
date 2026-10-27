import type { Project, Scene, Id, Ms, Entity, SkinDef, AssetRef } from '../model/schema/project';

export interface Mat2D { a: number; b: number; c: number; d: number; tx: number; ty: number }
export interface DrawNode2D {
  key: string; entityId: Id; world: Mat2D; opacity: number;
  draw: { type: 'art'; skinId: Id; part: number; palette: Record<string, string> }
    | { type: 'image'; assetId: Id }
    | { type: 'text'; text: string; size: number; color: string };
}
export interface FrameState {
  space: '2d'; t: Ms; size: { width: number; height: number }; background: Scene['background']; camera: Mat2D;
  nodes: DrawNode2D[]; poses: Record<Id, Record<string, Mat2D>>; resolved: Record<Id, Entity>;
}
export interface Evaluator { evaluate(project: Project, sceneId: Id, t: Ms): FrameState }
export interface RawFrame { width: number; height: number; rgba: Uint8Array }
export interface AssetResolver { url(id: Id): string; bytes(id: Id): Promise<Uint8Array> }
export interface Renderer {
  init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void>;
  load(project: Project, assets: AssetResolver): Promise<void>;
  render(frame: FrameState): void;
  capture(): Promise<RawFrame>;
  capturePng(): Promise<Blob>;
  dispose(): void;
}
export interface ProjectBundle { project: Project; assets: Record<Id, Uint8Array> }
export interface ProjectStorage {
  open(): Promise<ProjectBundle | null>;
  save(bundle: ProjectBundle): Promise<boolean>;
  writeRecovery(bundle: ProjectBundle): Promise<void>;
  readRecovery(): Promise<ProjectBundle | null>;
  clearRecovery(): Promise<void>;
}
export interface EncodeSpec { width: number; height: number; fps: number; presetId: 'webm' | 'mp4'; outPath: string }
export interface Encoder {
  start(spec: EncodeSpec): Promise<void>;
  // Borrows RGBA until this promise settles; implementations must not mutate or detach it.
  writeFrame(frame: RawFrame): Promise<void>;
  finish(audioWav?: Uint8Array): Promise<{ outPath: string; frames: number }>;
  abort(): Promise<void>;
}
export interface ExportJob extends EncodeSpec { sceneId: Id }
export interface ExportTimings { frames:number; loadMs:number; audioMs:number; startMs:number; evaluateMs:number; renderMs:number; captureMs:number; writeMs:number; waitMs:number; finishMs:number; totalMs:number; encoderPipeMs?:number; transportMs?:number; packetEncodeMs?:number; packetDecodeMs?:number; rawBytes?:number; wireBytes?:number; packedFrames?:number }
export interface ExportProgress { frame: number; total: number; progress: number; stage?: 'mixing' | 'finalizing'; timings?:ExportTimings }
export interface ExportRequest { project: Project; assets: Record<Id, Uint8Array>; presetId: 'mp4' | 'webm'; sceneId: Id }
export interface ExportHandle { cancel(): void; done: Promise<string | null> }
export interface AudioEngine {
  load(project: Project, sceneId: Id, assets: AssetResolver): Promise<void>;
  play(fromMs: Ms): Promise<void>;
  pause(): void;
  currentMs(): Ms;
  waveform(assetId: Id): readonly number[];
  renderOffline(project: Project, sceneId: Id, assets: AssetResolver, durationMs: number, signal: AbortSignal): Promise<Uint8Array | undefined>;
  dispose(): void;
}
export interface EditorServices {
  evaluator: Evaluator;
  createRenderer(purpose?:'preview'|'export'): Renderer;
  createAudioEngine(): AudioEngine;
  storage: ProjectStorage;
  resolver(assets: Record<Id, Uint8Array>, project: Project): AssetResolver & { dispose(): void };
  createId(): Id;
  createProject(): Project;
  importImage(file: File, id: string): Promise<{ asset: AssetRef; bytes: Uint8Array }>;
  importAudio(file: File, id: string): Promise<{ asset: AssetRef; bytes: Uint8Array }>;
  saveImage(blob: Blob, name: string): void;
  exportVideo?: (request: ExportRequest, onProgress: (p: ExportProgress) => void) => ExportHandle;
}
export interface EntityKindDef {
  kind: Entity['kind'];
  toNodes(entity: Entity, project: Project, poses: Record<string, Mat2D>): DrawNode2D[];
}
export interface RenderContent { skins: Record<Id, SkinDef> }
