import type { DesktopWindowControls, EncodeSpec, ExportProgress, ExportRequest } from './index';

export interface DesktopBridge {
  windowControls: DesktopWindowControls;
  openProject(): Promise<Uint8Array | null>;
  saveProject(bytes: Uint8Array, name: string): Promise<boolean>;
  writeRecovery(bytes: Uint8Array): Promise<void>;
  readRecovery(): Promise<Uint8Array | null>;
  clearRecovery(): Promise<void>;
  requestExport(request: ExportRequest): Promise<string | null>;
  cancelExport(): Promise<void>;
  onExportProgress(callback: (p: ExportProgress) => void): () => void;
  exportWorkerReady(callback: (request: ExportRequest & { spec: EncodeSpec }) => void): () => void;
  encoderStart(spec: EncodeSpec): Promise<void>;
  encoderFinish(audioWav?: Uint8Array): Promise<{ outPath: string; frames: number }>;
  encoderAbort(): Promise<void>;
  exportProgress(progress: ExportProgress): void;
  exportWorkerDone(error?: string): void;
  onExportCancel(callback: () => void): () => void;
}
declare global { interface Window { studioDesktop?: DesktopBridge } }
