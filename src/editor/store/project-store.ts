import { applyPatches, enablePatches, produceWithPatches, type Draft, type Patch } from 'immer';
import type { Project } from '../../model/schema/project';
import { validateRefs } from '../../model/validate';

enablePatches();
interface Entry {
  label: string; patches: Patch[]; inverse: Patch[]; at: number; key?: string;
  beforeRevision: number; afterRevision: number; beforeSelection: string | null; afterSelection: string | null;
}
export class ProjectStore {
  private project: Project;
  private undoStack: Entry[]=[];
  private redoStack: Entry[]=[];
  private listeners=new Set<() => void>();
  private revision=0;
  private nextRevision=0;
  private savedRevision=0;
  private version=0;
  selection: string | null=null;
  constructor(project: Project) { this.project=project; }
  get=()=>this.project;
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
  getVersion=()=>this.version;
  private emit(){this.version++;for(const fn of this.listeners)fn();}
  transact(label:string,recipe:(draft:Draft<Project>)=>void,opts?:{coalesceKey?:string;selection?:string|null;at?:number}):void {
    const at=opts?.at??Date.now();
    const [next,patches,inverse]=produceWithPatches(this.project,recipe);
    if(!patches.length)return;
    if(import.meta.env?.DEV)validateRefs(next);
    const afterRevision=++this.nextRevision, previous=this.undoStack.at(-1);
    const afterSelection=opts?.selection===undefined?this.selection:opts.selection;
    if(opts?.coalesceKey && previous?.key===opts.coalesceKey && at-previous.at<500 && previous.afterRevision!==this.savedRevision) {
      previous.patches.push(...patches);previous.inverse.unshift(...inverse);previous.at=at;previous.afterRevision=afterRevision;previous.afterSelection=afterSelection;
    } else {
      this.undoStack.push({label,patches,inverse,at,key:opts?.coalesceKey,beforeRevision:this.revision,afterRevision,beforeSelection:this.selection,afterSelection});
      if(this.undoStack.length>200)this.undoStack.shift();
    }
    this.redoStack=[];this.project=next;this.revision=afterRevision;this.selection=afterSelection;this.emit();
  }
  undo=()=>{const entry=this.undoStack.pop();if(!entry)return;this.project=applyPatches(this.project,entry.inverse);this.revision=entry.beforeRevision;this.selection=entry.beforeSelection;this.redoStack.push(entry);this.emit();};
  redo=()=>{const entry=this.redoStack.pop();if(!entry)return;this.project=applyPatches(this.project,entry.patches);this.revision=entry.afterRevision;this.selection=entry.afterSelection;this.undoStack.push(entry);this.emit();};
  canUndo=()=>this.undoStack.length>0;
  canRedo=()=>this.redoStack.length>0;
  isDirty=()=>this.revision!==this.savedRevision;
  markSaved=(snapshot:Project=this.project)=>{if(snapshot===this.project){this.savedRevision=this.revision;this.emit();}};
  replace=(project:Project)=>{this.project=project;this.undoStack=[];this.redoStack=[];this.revision=++this.nextRevision;this.savedRevision=this.revision;this.selection=null;this.emit();};
  historyLabel=()=>this.undoStack.at(-1)?.label;
}
