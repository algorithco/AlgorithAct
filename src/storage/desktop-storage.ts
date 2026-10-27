import type { ProjectBundle, ProjectStorage } from '../contracts';
import type { DesktopBridge } from '../contracts/desktop';
import { encodeBundle, decodeBundle } from './zip-container';

export class DesktopStorage implements ProjectStorage {
  constructor(private bridge:DesktopBridge){}
  async open(){const bytes=await this.bridge.openProject();return bytes?decodeBundle(bytes):null;}
  async save(bundle:ProjectBundle){return this.bridge.saveProject(await encodeBundle(bundle),bundle.project.meta.name);}
  async writeRecovery(bundle:ProjectBundle){await this.bridge.writeRecovery(await encodeBundle(bundle));}
  async readRecovery(){const bytes=await this.bridge.readRecovery();return bytes?decodeBundle(bytes):null;}
  async clearRecovery(){await this.bridge.clearRecovery();}
}
