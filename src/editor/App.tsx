import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowDownToLine, ArrowUpRight, Camera, Check, CircleAlert, CircleHelp, Clapperboard, Copy, Diamond, Download, Eye, EyeOff, FilePlus2, FolderOpen, Hand, ImagePlus, Layers3, LoaderCircle, LockKeyhole, MousePointer2, PanelRight, Maximize2, Minimize2, Pause, PersonStanding, Play, Plus, Redo2, Save, SkipBack, SkipForward, Sparkles, Trash2, Type, Undo2, UserRound, Waves, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { EditorServices, ExportHandle, ExportProgress, ProjectBundle, Renderer } from '../contracts';
import type { AudioClip, MotionClip, Project, Value, Ease } from '../model/schema/project';
import { parseProject, isPropertyAllowed } from '../model/validate';
import { addEntity, editProperty, getProperty, removeEntity, removeKey, setKey } from '../engine';
import { ProjectStore } from './store/project-store';
import { Viewport } from './panels/viewport/Viewport';
import { Library, type LibraryTab } from './panels/library/Library';
import { Timeline, type KeySelection } from './panels/timeline/Timeline';
import { Inspector } from './panels/inspector/Inspector';
import { AudioInspector } from './panels/inspector/AudioInspector';
import { Music2, Volume2, VolumeX } from 'lucide-react';
import './workspace.css';
import './audio.css';
import './redesign.css';
import { AIWorkspace, WorkspaceModes, type WorkspaceMode } from './WorkspaceModes';
import { CloseWindowDialog, WindowControls } from './WindowControls';

function timecode(t:number,fps:number){const frames=Math.floor(t*fps/1000);return `${String(Math.floor(frames/fps/60)).padStart(2,'0')}:${String(Math.floor(frames/fps)%60).padStart(2,'0')}:${String(frames%fps).padStart(2,'0')}`;}
const message=(e:unknown)=>(e instanceof Error?e.message:String(e)).replace(/(?:Error: )?Error invoking remote method '[^']+':\s*/g,'').replace(/^(?:Error:\s*)+/,'');
export function App({services}:{services:EditorServices}){
  const [workspaceMode,setWorkspaceMode]=useState<WorkspaceMode>('manual');
  const [timelineCollapsed,setTimelineCollapsed]=useState(false);
  const [layersOpen,setLayersOpen]=useState(false),[inspectorOpen,setInspectorOpen]=useState(true),[focusMode,setFocusMode]=useState(false);
  const [timelineHeight,setTimelineHeight]=useState<number|null>(null),[fitScale,setFitScale]=useState(.5),[viewReset,setViewReset]=useState(0);
  const [windowSize,setWindowSize]=useState(()=>({width:window.innerWidth,height:window.innerHeight}));
  const compact=windowSize.width<1440;
  const inspectorVisible=inspectorOpen&&!focusMode&&!(compact&&layersOpen);
  const maxTimelineHeight=Math.max(140,Math.min(440,windowSize.height-360));
  const resizeTimeline=(height:number|null)=>setTimelineHeight(height===null?null:Math.max(128,Math.min(maxTimelineHeight,height)));
  const toggleInspector=()=>{if(focusMode||compact&&layersOpen){setFocusMode(false);setLayersOpen(false);setInspectorOpen(true);}else setInspectorOpen(value=>!value);};
  const toggleLayers=()=>{setFocusMode(false);setLayersOpen(value=>!value);setLibraryOpen(false);};
  const fitView=()=>{setZoom(null);setViewReset(value=>value+1);};
  useEffect(()=>{const resize=()=>setWindowSize({width:window.innerWidth,height:window.innerHeight});window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const [store]=useState(()=>new ProjectStore(services.createProject()));
  const [audioEngine]=useState(()=>services.createAudioEngine());
  const [audioReady,setAudioReady]=useState(true),[audioVersion,setAudioVersion]=useState(0),[importingAudio,setImportingAudio]=useState(false);
  useSyncExternalStore(store.subscribe,store.getVersion);
  const project=store.get(),sceneId=project.sceneOrder[0],scene=project.scenes[sceneId];
  const [assets,setAssets]=useState<Record<string,Uint8Array>>({});
  const [selected,setSelected]=useState<string|null>(()=>scene.entityOrder.find(id=>scene.entities[id].kind==='character')??null);
  const [selectedClip,setSelectedClip]=useState<string|null>(null),[selectedKey,setSelectedKey]=useState<KeySelection|null>(null);
  const [time,setTime]=useState(0),[playing,setPlaying]=useState(false),[loop,setLoop]=useState(true);
  const [tab,setTab]=useState<LibraryTab>('characters'),[libraryOpen,setLibraryOpen]=useState(false),[mode,setMode]=useState<'select'|'pose'|'pan'>('select'),[zoom,setZoom]=useState<number|null>(null),[autoKey,setAutoKey]=useState(true);
  const [toast,setToast]=useState(''),[dialog,setDialog]=useState<'export'|'help'|'new'|'open'|'close'|null>(null),[exportFormat,setExportFormat]=useState<'png'|'mp4'|'webm'>(services.exportVideo?'webm':'png');
  const [closing,setClosing]=useState(false);
  const closingRef=useRef(false),closePendingRef=useRef(false);
  const closeReturnDialog=useRef<'export'|'help'|'new'|'open'|null>(null);
  const [exportProgress,setExportProgress]=useState<ExportProgress|null>(null),[exporting,setExporting]=useState(false),[saving,setSaving]=useState(false),[exportError,setExportError]=useState('');
  const [recovery,setRecovery]=useState<ProjectBundle|null>(null),[autosave,setAutosave]=useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [lastPath,setLastPath]=useState('transform.x');
  const rendererRef=useRef<Renderer|null>(null),exportRef=useRef<ExportHandle|null>(null),timeRef=useRef(time);
  const assetInput=useRef<HTMLInputElement>(null),audioInput=useRef<HTMLInputElement>(null),autosaveMax=useRef<ReturnType<typeof setTimeout>|null>(null),autosaveErrors=useRef(0),mounted=useRef(true);
  const currentBundle=useRef({project,assets});currentBundle.current={project,assets};timeRef.current=time;
  const frame=useMemo(()=>services.evaluator.evaluate(project,sceneId,time),[services,project,sceneId,time]);
  const entity=selected?frame.resolved[selected]:undefined;
  const selectedMotion=selectedClip?scene.timeline.clips[selectedClip]:undefined;
  const selectedTrack=selectedKey?scene.timeline.tracks[selectedKey.trackId]:undefined;
  const audioClips=useMemo(()=>Object.values(scene.timeline.clips).filter((clip):clip is AudioClip=>clip.kind==='audio'),[scene.timeline.clips]);
  const hasAudio=audioClips.some(clip=>!clip.muted&&clip.gain>0);
  const waveforms=useMemo(()=>Object.fromEntries(audioClips.map(clip=>[clip.assetId,audioEngine.waveform(clip.assetId)])),[audioClips,audioEngine,audioVersion]);
  const notify=useCallback((value:string)=>setToast(value),[]);
  const windowError=useCallback((error:unknown)=>notify(message(error)),[notify]);
  const closeWindow=useCallback(async()=>{
    if(!services.windowControls || closePendingRef.current)return;
    closePendingRef.current=true;setClosing(true);
    try{
      // Finish recovery before unloading; beforeunload cannot await filesystem work.
      // A confirmed discard can still close when recovery storage is unavailable.
      if(store.isDirty())await services.storage.writeRecovery(currentBundle.current).catch(()=>{});
      closingRef.current=true;
      await services.windowControls.confirmClose();
    }catch(error){closingRef.current=false;closePendingRef.current=false;setClosing(false);windowError(error);}
  },[services,store,windowError]);
  useEffect(()=>services.windowControls?.onCloseRequested(()=>{
    if(closePendingRef.current)return;
    setPlaying(false);
    if(store.isDirty() || exporting || saving){if(dialog!=='close')closeReturnDialog.current=dialog;setDialog('close');}else void closeWindow();
  }),[services,store,exporting,saving,dialog,closeWindow]);
  const changeWorkspace=(next:WorkspaceMode)=>{if(next===workspaceMode)return;setWorkspaceMode(next);setPlaying(false);setLibraryOpen(false);};
  const openLibrary=(next:LibraryTab)=>{setLibraryOpen(previous=>next===tab?!previous:true);setTab(next);};
  const select=(id:string|null)=>{if(id&&compact&&layersOpen){setLayersOpen(false);setInspectorOpen(true);}setSelected(id);store.selection=id;setSelectedClip(null);setSelectedKey(null);};
  function selectClip(id:string){if(scene.timeline.clips[id]?.kind==='audio'){setSelected(null);store.selection=null;setSelectedKey(null);}setSelectedClip(id);}
  function transact(label:string,recipe:(draft:Project)=>void,key?:string,nextSelection?:string|null){
    store.selection=selected;store.transact(label,draft=>{recipe(draft);draft.meta.modifiedAt=new Date().toISOString();},{coalesceKey:key,selection:nextSelection});
    if(nextSelection!==undefined)setSelected(nextSelection);
  }
  const scrub=(t:number)=>{setPlaying(false);setTime(Math.max(0,Math.min(scene.durationMs,Math.round(t))));};
  function property(path:string,value:Value,key?:string){
    if(!selected || !entity || entity.locked)return;
    setLastPath(path==='palette'?lastPath:path);
    transact('Xususiyatni tahrirlash',draft=>{
      const e=draft.scenes[sceneId].entities[selected];
      if(path==='palette' && e.kind==='character' && typeof value==='string'){e.paletteOverride={...e.paletteOverride,body:value};return;}
      editProperty(draft.scenes[sceneId],selected,path,value,time,autoKey,services.createId());
    },key);
  }
  function addKey(path=lastPath){
    if(!entity || entity.locked || !selected)return;
    if(entity.kind==='camera' && path.startsWith('transform.'))path='x';
    if(entity.kind!=='character' && path.startsWith('pose.'))path=entity.kind==='camera'?'x':'transform.x';
    if(!isPropertyAllowed(entity,path))path=entity.kind==='camera'?'x':'transform.x';
    const value=getProperty(entity,path);if(value===undefined)return;
    const trackId=services.createId();
    transact('Kalit qo‘shish',draft=>setKey(draft.scenes[sceneId],selected,path,time,value,trackId));
    const track=Object.values(store.get().scenes[sceneId].timeline.tracks).find(t=>t.entityId===selected && t.path===path);
    if(track)setSelectedKey({trackId:track.id,t:time});notify(`${(time/1000).toFixed(2)} s da kalit qo‘shildi`);
  }
  function addCharacter(characterId:string){
    const id=services.createId();
    transact('Personaj qo‘shish',draft=>addEntity(draft.scenes[sceneId],{id,kind:'character',characterId,name:`${draft.library.characters[characterId].name} ${Object.values(scene.entities).filter(e=>e.kind==='character').length+1}`,visible:true,locked:false,extensions:{},pose:{},opacity:1,transform:{x:960,y:440,rotation:0,scaleX:1.4,scaleY:1.4}}),undefined,id);
    setSelectedClip(null);setMode('select');notify('Personaj sahnaga qo‘shildi');
  }
  function addText(){
    setInspectorOpen(true);if(compact)setLayersOpen(false);
    const id=services.createId();transact('Matn qo‘shish',draft=>addEntity(draft.scenes[sceneId],{id,kind:'text',name:'Yangi matn',text:'Sizning hikoyangiz',size:64,color:'#27332A',visible:true,locked:false,opacity:1,transform:{x:350,y:700,rotation:0,scaleX:1,scaleY:1},extensions:{}}),undefined,id);setMode('select');
  }
  async function importImage(file?:File){
    if(!file)return;
    try{const assetId=services.createId(),id=services.createId(),result=await services.importImage(file,assetId);const scale=Math.min(1,800/(result.asset.meta?.width??800));
      setAssets(previous=>({...previous,[assetId]:result.bytes}));
      transact('Rasm qo‘shish',draft=>{draft.assets[assetId]=result.asset;addEntity(draft.scenes[sceneId],{id,kind:'image',assetId,name:file.name,visible:true,locked:false,extensions:{},opacity:1,transform:{x:400,y:200,rotation:0,scaleX:scale,scaleY:scale}});},undefined,id);setMode('select');notify('Rasm sahnaga qo‘shildi');
    }catch(e){notify(message(e));}
  }
  async function importAudio(file?:File){
    if(!file||importingAudio)return;
    setImportingAudio(true);setPlaying(false);
    try{
      const assetId=services.createId(),clipId=services.createId(),result=await services.importAudio(file,assetId),startMs=Math.min(time,scene.durationMs-1);
      setAssets(previous=>({...previous,[assetId]:result.bytes}));
      transact('Audio qo‘shish',draft=>{draft.assets[assetId]=result.asset;draft.scenes[sceneId].timeline.clips[clipId]={id:clipId,kind:'audio',assetId,startMs,durationMs:Math.min(result.asset.meta!.durationMs!,scene.durationMs-startMs),trimInMs:0,gain:1,fadeInMs:0,fadeOutMs:0,lane:audioClips.length,muted:false,extensions:{}};},undefined,null);
      setSelectedClip(clipId);setSelectedKey(null);setLibraryOpen(false);notify('Audio sahnaga qo‘shildi');
    }catch(e){notify(message(e));}finally{setImportingAudio(false);}
  }
  function editAudio(values:Partial<AudioClip>,id=selectedClip,key?:string){
    if(!id)return;
    transact('Audio sozlamasi',draft=>{
      const clip=draft.scenes[sceneId].timeline.clips[id];if(clip?.kind!=='audio')return;
      Object.assign(clip,values);const sourceMs=draft.assets[clip.assetId].meta?.durationMs??clip.trimInMs+clip.durationMs;
      clip.startMs=Math.max(0,Math.min(scene.durationMs-1,clip.startMs));clip.trimInMs=Math.max(0,Math.min(sourceMs-1,clip.trimInMs));
      clip.durationMs=Math.max(1,Math.min(clip.durationMs,sourceMs-clip.trimInMs,scene.durationMs-clip.startMs));
      clip.fadeInMs=Math.min(clip.fadeInMs,clip.durationMs);clip.fadeOutMs=Math.min(clip.fadeOutMs,clip.durationMs);
    },key??`audio:${id}:${Object.keys(values).sort().join(',')}`);
  }
  function addMotion(motionId:string){
    const target=entity?.kind==='character'?entity:Object.values(scene.entities).find(e=>e.kind==='character' && !e.locked);
    if(!target || target.kind!=='character' || target.locked){notify('Avval qulflanmagan personajni tanlang.');return;}
    const motion=project.library.motions[motionId],id=services.createId(),startMs=Math.min(time,scene.durationMs-100);
    const clips=Object.values(scene.timeline.clips).filter(c=>c.kind==='motion' && c.entityId===target.id);
    transact('Harakat qo‘shish',draft=>{draft.scenes[sceneId].timeline.clips[id]={id,kind:'motion',entityId:target.id,motionId,startMs,durationMs:Math.min(motion.durationMs*(motion.loop?2:1),scene.durationMs-startMs),offsetMs:0,speed:1,loop:motion.loop,blendInMs:120,blendOutMs:200,weight:1,lane:clips.length?Math.max(...clips.map(c=>c.lane))+1:0,muted:false,extensions:{}};},undefined,target.id);
    setSelectedClip(id);setSelectedKey(null);notify(`${motion.name} qo‘shildi`);
  }
  function undo(){store.undo();setSelected(store.selection);setSelectedClip(null);setSelectedKey(null);}
  function redo(){store.redo();setSelected(store.selection);setSelectedClip(null);setSelectedKey(null);}
  function remove(){
    if(selectedKey && selectedTrack){transact('Kalitni o‘chirish',draft=>removeKey(draft.scenes[sceneId],selectedTrack,selectedKey.t));setSelectedKey(null);return;}
    if(selectedClip){transact('Klipni o‘chirish',draft=>{delete draft.scenes[sceneId].timeline.clips[selectedClip];});setSelectedClip(null);return;}
    if(selected && entity?.kind!=='camera' && !entity?.locked){transact('Obyektni o‘chirish',draft=>removeEntity(draft.scenes[sceneId],selected),undefined,null);}
  }
  function duplicate(){
    if(!entity || entity.kind==='camera')return;
    const id=services.createId(),clone=structuredClone(scene.entities[entity.id]);clone.id=id;clone.name+=' nusxa';if(clone.kind!=='camera')clone.transform.x+=80;
    transact('Obyektni nusxalash',draft=>addEntity(draft.scenes[sceneId],clone),undefined,id);
  }
  async function save(){
    if(saving)return false;setSaving(true);const snapshot=store.get();
    try{if(await services.storage.save({project:snapshot,assets})){store.markSaved(snapshot);if(!store.isDirty())await services.storage.clearRecovery();notify('Loyiha saqlandi');return true;}return false;}
    catch(e){notify(message(e));return false;}finally{setSaving(false);}
  }
  function load(bundle:ProjectBundle){store.replace(parseProject(bundle.project));setAssets(bundle.assets);setSelected(null);setSelectedClip(null);setSelectedKey(null);setTime(0);setPlaying(false);setZoom(null);setAutosave('idle');setViewReset(value=>value+1);}
  async function open(){try{const bundle=await services.storage.open();if(bundle){load(bundle);await services.storage.clearRecovery();notify('Loyiha ochildi');}}catch(e){notify(message(e));}}
  function requestOpen(){if(store.isDirty())setDialog('open');else void open();}
  function newProject(){load({project:services.createProject(),assets:{}});void services.storage.clearRecovery();setDialog(null);}
  async function doExport(){
    if(exporting)return;setExporting(true);setPlaying(false);setExportProgress(null);setExportError('');
    try{
      if(exportFormat==='png'){
        const renderer=rendererRef.current;if(!renderer)throw new Error('Renderer hali tayyor emas.');
        const resolver=services.resolver(assets,project);try{await renderer.load(project,resolver);renderer.render(frame);services.saveImage(await renderer.capturePng(),`${project.meta.name}-${time}ms.png`);}finally{resolver.dispose();}
        notify('PNG kadr yuklandi');setDialog(null);
      }else{
        if(!services.exportVideo)throw new Error('Video eksporti desktop rejimida ishlaydi.');
        const handle=services.exportVideo({project,assets,presetId:exportFormat,sceneId},setExportProgress);exportRef.current=handle;
        const output=await handle.done;if(output){notify('Video eksport qilindi');setDialog(current=>current==='close'?current:null);}else notify('Eksport bekor qilindi');
      }
    }catch(e){setExportError(message(e));}finally{setExporting(false);exportRef.current=null;}
  }
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{mounted.current=true;void services.storage.readRecovery().then(bundle=>{if(mounted.current && bundle)setRecovery({...bundle,project:parseProject(bundle.project)});}).catch(e=>notify(`Tiklash fayli: ${message(e)}`));return()=>{mounted.current=false;};},[services,notify]);
  const writeRecovery=useCallback(async()=>{
    if(autosaveMax.current){clearTimeout(autosaveMax.current);autosaveMax.current=null;}
    if(!store.isDirty())return;
    setAutosave('saving');try{await services.storage.writeRecovery(currentBundle.current);autosaveErrors.current=0;if(mounted.current)setAutosave('saved');}catch{autosaveErrors.current++;if(mounted.current)setAutosave('error');}
  },[services,store]);
  useEffect(()=>{
    if(!store.isDirty())return;
    const timer=setTimeout(()=>void writeRecovery(),3000);if(!autosaveMax.current)autosaveMax.current=setTimeout(()=>void writeRecovery(),30000);
    return()=>clearTimeout(timer);
  },[project,assets,store,writeRecovery]);
  useEffect(()=>()=>{if(autosaveMax.current)clearTimeout(autosaveMax.current);},[]);
  useEffect(()=>{
    let cancelled=false;const resolver=services.resolver(assets,project);setAudioReady(false);
    void audioEngine.load(project,sceneId,resolver).then(()=>{if(!cancelled){setAudioVersion(v=>v+1);setAudioReady(true);}}).catch(e=>{if(!cancelled){setPlaying(false);notify(message(e));}});
    return()=>{cancelled=true;audioEngine.pause();resolver.dispose();};
    // Only media, audio/motion clips and scene length can change this audio graph.
  },[audioEngine,assets,project.assets,scene.timeline.clips,scene.durationMs,sceneId,services,notify]);
  useEffect(()=>()=>audioEngine.dispose(),[audioEngine]);
  useEffect(()=>{
    if(!playing||!audioReady)return;let raf=0,cancelled=false,base=0;
    const start=async(fromMs:number)=>{try{if(hasAudio)await audioEngine.play(fromMs);if(cancelled)return;base=performance.now()-fromMs;raf=requestAnimationFrame(tick);}catch(e){if(!cancelled){setPlaying(false);notify(message(e));}}};
    const tick=(now:number)=>{const elapsed=hasAudio?audioEngine.currentMs():now-base;if(elapsed>=scene.durationMs){if(loop){setTime(0);void start(0);return;}setTime(scene.durationMs);setPlaying(false);return;}setTime(Math.round(elapsed));raf=requestAnimationFrame(tick);};
    void start(timeRef.current);return()=>{cancelled=true;cancelAnimationFrame(raf);audioEngine.pause();};
  },[playing,loop,scene.durationMs,audioEngine,audioReady,audioVersion,hasAudio,notify]);
  useEffect(()=>{
    const listener=(event:KeyboardEvent)=>{
      if(dialog==='close')return;
      if(workspaceMode!=='manual'||event.defaultPrevented)return;
      if(event.code==='Space' && event.target instanceof HTMLElement && event.target.closest('button,[role="button"]'))return;
      if(event.target instanceof HTMLElement && (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)||event.target.isContentEditable))return;
      const ctrl=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
      if(ctrl && key==='s'){event.preventDefault();void save();}
      else if(ctrl && key==='o'){event.preventDefault();requestOpen();}
      else if(ctrl && key==='z'){event.preventDefault();if(event.shiftKey)redo();else undo();}
      else if(ctrl && key==='y'){event.preventDefault();redo();}
      else if(ctrl && key==='d'){event.preventDefault();duplicate();}
      else if(key==='escape'){if(dialog){if(!exporting)setDialog(null);return;}if(focusMode){setFocusMode(false);return;}if(libraryOpen){setLibraryOpen(false);return;}if(!exporting)setDialog(null);select(null);setMode('select');}
      else if(dialog || recovery)return;
      else if(event.code==='Space'){event.preventDefault();if(!playing && time>=scene.durationMs)setTime(0);setPlaying(v=>!v);}
      else if(event.key==='ArrowRight'){event.preventDefault();scrub(time+1000/project.settings.fps);}
      else if(event.key==='ArrowLeft'){event.preventDefault();scrub(time-1000/project.settings.fps);}
      else if(event.key==='Home'){event.preventDefault();scrub(0);}
      else if(key==='delete'||key==='backspace'){event.preventDefault();remove();}
      else if(key==='v')setMode('select');else if(key==='p'){setMode('pose');setPlaying(false);}else if(key==='h')setMode('pan');
      else if(key==='k')addKey();
      else if(key==='f'&&!ctrl){setFocusMode(value=>!value);setLibraryOpen(false);}
      else if(key==='l'&&!ctrl)toggleLayers();
      else if(key==='i'&&!ctrl)toggleInspector();
      else if(event.shiftKey&&event.code==='Digit1'){event.preventDefault();fitView();}
    };window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);
  });
  useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(!closingRef.current && store.isDirty()){void services.storage.writeRecovery(currentBundle.current);e.preventDefault();}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[store,services]);
  return <div className={`studio-app${services.windowControls?' desktop-app':''}`}>
    <header className="app-header">
      <div className="header-identity"><div className="brand"><div className="brand-mark"><img className="brand-logo" src={`${import.meta.env.BASE_URL}brand/algorithact-icon.png`} alt="" aria-hidden="true"/></div><div>AlgorithAct<span>by Algorithco</span></div><span className="alpha-badge">ALPHA</span></div><div className="project-heading"><div className="project-title"><input aria-label="Loyiha nomi" disabled={workspaceMode==='ai'} value={project.meta.name} onChange={e=>{if(e.target.value.length)transact('Loyiha nomi',d=>{d.meta.name=e.target.value;},'project-name');}}/><span><i className={`save-dot ${store.isDirty()?'unsaved':''}`}/>{store.isDirty()?'Saqlanmagan o‘zgarishlar':'Barcha o‘zgarishlar saqlangan'}</span></div></div></div>
      <WorkspaceModes value={workspaceMode} onChange={changeWorkspace}/>
      <div className="header-actions">
        <button className="icon-button" title="Yangi loyiha" aria-label="Yangi loyiha" disabled={workspaceMode==='ai'} onClick={()=>store.isDirty()?setDialog('new'):newProject()}><FilePlus2 size={19}/></button>
        <button className="icon-button" title="Loyiha ochish · Ctrl+O" aria-label="Loyiha ochish" disabled={workspaceMode==='ai'} onClick={requestOpen}><FolderOpen size={19}/></button>
        <span className="header-divider"/>
        <button className="save-button" aria-label="Loyihani saqlash" onClick={()=>void save()} disabled={saving||workspaceMode==='ai'}>{saving?<LoaderCircle className="spin" size={18}/>:<Save size={18}/>}Saqlash</button>
        <button className="export-button" disabled={workspaceMode==='ai'} onClick={()=>{setExportError('');setDialog('export');}}><ArrowUpRight size={18}/>Eksport</button>
      </div>
      {services.windowControls&&<WindowControls controls={services.windowControls} onError={windowError}/>}
    </header>
    <main style={timelineHeight===null?undefined:{'--timeline-height':`${Math.min(maxTimelineHeight,timelineHeight)}px`} as CSSProperties} className={`workspace ${timelineCollapsed||focusMode?'timeline-collapsed':''} ${layersOpen?'layers-open':''} ${!inspectorVisible?'inspector-hidden':''} ${focusMode?'focus-mode':''}`} id="manual-workspace" role="tabpanel" tabIndex={0} aria-labelledby="manual-tab" hidden={workspaceMode!=='manual'} inert={workspaceMode!=='manual'}>
      <nav className="workspace-rail" aria-label="Yaratish vositalari">
        <button className={layersOpen?'active':''} aria-label="Qatlamlar paneli" aria-expanded={layersOpen&&!focusMode} aria-controls="layers-panel" title="Qatlamlar · L" onClick={toggleLayers}><Layers3 size={21}/><span>Qatlamlar</span></button>
        <span className="rail-divider"/>
        <div className="insert-actions">
          <button className={libraryOpen&&tab==='characters'?'active':''} aria-expanded={libraryOpen&&tab==='characters'} onClick={()=>openLibrary('characters')} aria-label="Personajlar" title="Personaj qo‘shish"><UserRound size={21}/><span>Personaj</span></button>
          <button className={libraryOpen&&tab==='motions'?'active':''} aria-expanded={libraryOpen&&tab==='motions'} onClick={()=>openLibrary('motions')} aria-label="Harakatlar" title="Harakat qo‘shish"><Waves size={21}/><span>Harakat</span></button>
          <button onClick={addText} aria-label="Matn qo‘shish" title="Matn qo‘shish"><Type size={21}/><span>Matn</span></button>
          <button onClick={()=>assetInput.current?.click()} aria-label="Rasm yuklash" title="Rasm yuklash"><ImagePlus size={21}/><span>Rasm</span></button>
          <button aria-label="Audio yuklash" title="Audio yuklash" onClick={()=>audioInput.current?.click()} disabled={importingAudio}>{importingAudio?<LoaderCircle size={21} className="spin"/>:<Music2 size={21}/>}<span>Audio</span></button>
          <button className={libraryOpen&&tab==='scene'?'active':''} aria-expanded={libraryOpen&&tab==='scene'} onClick={()=>openLibrary('scene')} aria-label="Sahna" title="Sahna foni"><Layers3 size={21}/><span>Fon</span></button>
        </div>
        <button className="rail-help" aria-label="Yordam" title="Yordam va klaviatura buyruqlari" onClick={()=>setDialog('help')}><CircleHelp size={21}/><span>Yordam</span></button>
      </nav>
      <aside className="project-panel" id="layers-panel" hidden={!layersOpen||focusMode}><div className="project-panel-title"><FolderOpen size={16}/><h2>Qatlamlar</h2><button className="close-panel" aria-label="Qatlamlarni yopish" onClick={()=>setLayersOpen(false)}><X size={17}/></button></div><button className="scene-card" onClick={()=>select(null)}><span className="scene-card-preview"><Clapperboard size={22}/><span>01</span></span><span><strong>{scene.name}</strong><small>{scene.durationMs/1000} soniya · {project.settings.fps} fps</small></span><span className="scene-card-active"/></button><div className="layers-heading"><h3>Qatlamlar</h3><span>{scene.entityOrder.length-1}</span><button aria-label="Qatlam qo‘shish" onClick={()=>openLibrary('scene')}><Plus size={15}/></button></div><div className="layers-list">{scene.entityOrder.filter(id=>scene.entities[id].kind!=='camera').reverse().map((id,index)=>{const e=scene.entities[id];return <div className={`layer-item ${selected===id?'selected':''} ${!e.visible?'is-hidden':''}`} key={id}><button className="layer-select" onClick={()=>select(id)}><span className={`layer-type-icon ${e.kind}`}>{e.kind==='character'?<PersonStanding size={18}/>:e.kind==='text'?<Type size={16}/>:<ImagePlus size={16}/>}</span><span><strong>{e.name}</strong><small>{String(index+1).padStart(2,'0')} · {e.kind==='character'?'Personaj':e.kind==='text'?'Matn':'Rasm'}</small></span></button><button className="layer-visibility" aria-label={`${e.name} qatlam ko‘rinishi`} onClick={()=>transact('Qatlam ko‘rinishi',d=>{d.scenes[sceneId].entities[id].visible=!e.visible;})}>{e.visible?<Eye size={13}/>:<EyeOff size={13}/>}</button>{e.locked&&<LockKeyhole size={11}/>}</div>;})}{audioClips.length>0&&<div className="project-audio-list"><div className="audio-list-heading">OVOZLAR <span>{audioClips.length}</span></div>{audioClips.map(clip=><div className={`layer-item ${selectedClip===clip.id?'selected':''}`} key={clip.id}><button className="layer-select" aria-label={`Audio ${project.assets[clip.assetId].name}`} onClick={()=>selectClip(clip.id)}><span className="layer-type-icon audio"><Music2 size={16}/></span><span><strong>{project.assets[clip.assetId].name}</strong><small>{(clip.durationMs/1000).toFixed(1)} s · {Math.round(clip.gain*100)}%</small></span></button><button className="layer-visibility" aria-label={`${project.assets[clip.assetId].name} audio ovozi`} onClick={()=>editAudio({muted:!clip.muted},clip.id)}>{clip.muted?<VolumeX size={13}/>:<Volume2 size={13}/>}</button></div>)}</div>}</div><button className="add-to-scene" onClick={()=>openLibrary('characters')}><Plus size={16}/>Sahnaga qo‘shish</button><div className="project-panel-bottom"><span className="project-file-icon"><Save size={18}/></span><div><strong>.anim loyiha fayli</strong><span>Ishingizni saqlab boring</span></div><kbd>Ctrl S</kbd></div></aside>
      {libraryOpen&&<div className="library-drawer"><div className="drawer-top"><span>KUTUBXONA</span><button aria-label="Kutubxonani yopish" onClick={()=>setLibraryOpen(false)}><X size={16}/></button></div><div className="drawer-tabs"><button className={tab==='characters'?'active':''} onClick={()=>setTab('characters')}>Personaj</button><button className={tab==='motions'?'active':''} onClick={()=>setTab('motions')}>Harakat</button><button className={tab==='scene'?'active':''} onClick={()=>setTab('scene')}>Sahna</button></div><Library project={project} tab={tab} onAddCharacter={id=>{addCharacter(id);setLibraryOpen(false);}} onAddMotion={id=>{addMotion(id);setLibraryOpen(false);}} onAddText={()=>{addText();setLibraryOpen(false);}} onImportImage={()=>assetInput.current?.click()} onBackground={color=>transact('Fon rangini o‘zgartirish',d=>{d.scenes[sceneId].background={type:'color',color};},'background')}/></div>}
      <section className="editor-center"><div className="viewport-toolbar"><div className="tool-group"><button className={mode==='select'?'active':''} aria-label="Tanlash vositasi" title="Tanlash · V" onClick={()=>setMode('select')}><MousePointer2 size={18}/><span>Tanlash</span></button><button className={mode==='pose'?'active':''} aria-label="Poza vositasi" title="Poza · P" onClick={()=>{setMode('pose');setPlaying(false);}}><PersonStanding size={19}/><span>Poza</span></button><button className={mode==='pan'?'active':''} aria-label="Pan vositasi" title="Ko‘chirish · H" onClick={()=>setMode('pan')}><Hand size={18}/><span>Surish</span></button><span className="small-divider"/><button title="Kamera xususiyatlari" aria-label="Kamerani tanlash" onClick={()=>select(scene.cameraId)}><Camera size={16}/></button></div><div className="viewport-zoom floating-zoom"><button aria-label="Sahnani kichraytirish" title="Kichraytirish" onClick={()=>setZoom(value=>Math.max(.05,(value??fitScale)/1.25))}><ZoomOut size={17}/></button><button className="zoom-value" data-testid="viewport-zoom" data-fit={zoom===null} aria-label="Sahnani sig‘dirish" title="Sahnani sig‘dirish · Shift+1" onClick={fitView}>{Math.round((zoom??fitScale)*100)}%</button><button aria-label="Sahnani kattalashtirish" title="Kattalashtirish" onClick={()=>setZoom(value=>Math.min(4,(value??fitScale)*1.25))}><ZoomIn size={17}/></button><span className="small-divider"/><button aria-label="Haqiqiy o‘lcham" title="Haqiqiy o‘lcham · 100%" onClick={()=>{setZoom(1);setViewReset(value=>value+1);}}><span>1:1</span></button></div><div className="tool-group history-tools"><button aria-label="Undo" title="Bekor qilish · Ctrl+Z" disabled={!store.canUndo()} onClick={undo}><Undo2 size={16}/></button><button aria-label="Redo" title="Qaytarish · Ctrl+Shift+Z" disabled={!store.canRedo()} onClick={redo}><Redo2 size={16}/></button><span className="small-divider"/><button aria-label="Obyekt nusxalash" title="Nusxalash · Ctrl+D" disabled={!entity||entity.kind==='camera'} onClick={duplicate}><Copy size={15}/></button><button aria-label="Tanlovni o‘chirish" title="O‘chirish · Delete" disabled={!selected&&!selectedClip&&!selectedKey} onClick={remove}><Trash2 size={15}/></button><span className="small-divider"/><button aria-label="Xususiyatlar paneli" title="Xususiyatlar · I" aria-pressed={inspectorVisible} onClick={toggleInspector}><PanelRight size={18}/></button><button aria-label="Fokus rejimi" title={focusMode?'Fokusdan chiqish · F / Esc':'Fokus rejimi · F'} aria-pressed={focusMode} onClick={()=>{setFocusMode(value=>!value);setLibraryOpen(false);}}>{focusMode?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></div>
        <Viewport key={`${project.settings.frame.width}x${project.settings.frame.height}`} project={project} frame={frame} assets={assets} services={services} selected={selected} onSelect={select} mode={mode} zoom={zoom} resetView={viewReset} onFit={setFitScale} onZoom={setZoom} onReady={renderer=>{rendererRef.current=renderer;}} onError={notify} onMove={(id,x,y,key)=>{setPlaying(false);transact('Obyektni ko‘chirish',d=>{const s=d.scenes[sceneId];editProperty(s,id,'transform.x',x,time,autoKey,services.createId());editProperty(s,id,'transform.y',y,time,autoKey,services.createId());},key);}} onPose={(bone,rotation,key)=>{if(!selected)return;setPlaying(false);setLastPath(`pose.${bone}`);transact('Pozani tahrirlash',d=>editProperty(d.scenes[sceneId],selected,`pose.${bone}`,rotation,time,true,services.createId()),key);}}/>

      </section>
      <Timeline resolved={frame.resolved} controls={<div className="transport"><div className="transport-left"><button className={`autokey-toggle ${autoKey?'enabled':''}`} aria-label="Avtomatik kalit" aria-pressed={autoKey} onClick={()=>setAutoKey(v=>!v)}><Diamond size={12} fill={autoKey?'currentColor':'none'}/><span>Avto-kalit</span><span className="toggle-track"><i/></span></button></div><div className="playback-controls"><button aria-label="Boshiga qaytish" onClick={()=>scrub(0)}><SkipBack size={16}/></button><button className="play-button" aria-label={playing?'Pauza':'Ijro etish'} onClick={()=>{if(!playing&&time>=scene.durationMs)setTime(0);setPlaying(v=>!v);}}>{playing?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button><button aria-label="Oxiriga o‘tish" onClick={()=>scrub(scene.durationMs)}><SkipForward size={16}/></button><div className="timecode" data-testid="timecode">{timecode(time,project.settings.fps)}<span>/ {timecode(scene.durationMs,project.settings.fps)}</span></div></div></div>} height={Math.min(maxTimelineHeight,timelineHeight??Math.max(160,Math.min(248,windowSize.height*.23)))} maxHeight={maxTimelineHeight} onResize={resizeTimeline} collapsed={timelineCollapsed||focusMode} onCollapse={()=>{if(focusMode){setFocusMode(false);setTimelineCollapsed(false);}else setTimelineCollapsed(value=>!value);}} project={project} scene={scene} time={time} selected={selected} selectedClip={selectedClip} selectedKey={selectedKey} loop={loop} onLoop={()=>setLoop(v=>!v)} onTime={scrub} onSelect={select} waveforms={waveforms} onAudioMute={id=>{const clip=scene.timeline.clips[id];if(clip.kind==='audio')editAudio({muted:!clip.muted},id);}} onClip={selectClip} onKey={(track,t)=>{select(track.entityId);setSelectedKey({trackId:track.id,t});setLastPath(track.path);scrub(t);}} onToggle={(id,what)=>transact('Qatlam xususiyati',d=>{const e=d.scenes[sceneId].entities[id];e[what]=!e[what];})} onAddKey={()=>addKey()} onClipMove={(id,startMs,key)=>transact('Klipni ko‘chirish',d=>{d.scenes[sceneId].timeline.clips[id].startMs=startMs;},key)}/>
      <div className="properties-dock" hidden={!inspectorVisible}>
      {selectedMotion?.kind==='audio'?<AudioInspector onClose={()=>setInspectorOpen(false)} clip={selectedMotion} asset={project.assets[selectedMotion.assetId]} sceneDurationMs={scene.durationMs} onChange={values=>editAudio(values)} onDelete={remove}/>:<Inspector onClose={()=>setInspectorOpen(false)} project={project} entity={entity} clip={selectedMotion?.kind==='motion'?selectedMotion:undefined} keySelection={selectedKey} track={selectedTrack} time={time} onProperty={property} onKey={addKey} onName={name=>{if(selected)transact('Obyekt nomi',d=>{d.scenes[sceneId].entities[selected].name=name;},`name:${selected}`);}} onPoseMode={()=>{setMode('pose');setPlaying(false);}} onResetPose={()=>{if(!selected)return;transact('Pozani tiklash',d=>{const e=d.scenes[sceneId].entities[selected];if(e.kind==='character')e.pose={};for(const [id,track]of Object.entries(d.scenes[sceneId].timeline.tracks))if(track.entityId===selected&&track.path.startsWith('pose.'))delete d.scenes[sceneId].timeline.tracks[id];});}} onClip={values=>{if(!selectedClip)return;transact('Klip sozlamasi',d=>{const clip=d.scenes[sceneId].timeline.clips[selectedClip] as MotionClip;Object.assign(clip,values);clip.startMs=Math.min(clip.startMs,scene.durationMs-100);clip.durationMs=Math.min(clip.durationMs,scene.durationMs-clip.startMs);},`clip-input:${selectedClip}`);}} onEase={ease=>{if(!selectedKey)return;transact('Kalit easing',d=>{const key=d.scenes[sceneId].timeline.tracks[selectedKey.trackId].keys.find(k=>k.t===selectedKey.t);if(key)key.ease=ease as Ease;});}} onDeselectClip={()=>setSelectedClip(null)}/>}
      </div>
    </main>
    <AIWorkspace hidden={workspaceMode!=='ai'} onManual={()=>{changeWorkspace('manual');document.getElementById('manual-tab')?.focus();}}/>
    <footer className="status-bar"><div><span className="live-dot"/> {autosave==='saving'?'Avtosaqlanmoqda…':autosave==='saved'?'Tiklash nusxasi saqlandi':autosave==='error'?'Avtosaqlashda xato':store.isDirty()?'Saqlanmagan o‘zgarishlar':'Ishlashga tayyor'}</div><div><span>{services.exportVideo?'Desktop':'Brauzer'} · Offline</span><span>{project.settings.frame.width} × {project.settings.frame.height}</span><span>{project.settings.fps} FPS</span><span className="status-version">AlgorithAct / 0.1</span></div></footer>
    <input ref={assetInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden-input" aria-label="Rasm fayli" onChange={e=>{void importImage(e.target.files?.[0]);e.target.value='';}}/>
    <input ref={audioInput} type="file" accept="audio/*,.wav,.mp3,.ogg,.oga,.m4a,.aac,.flac,.webm" className="hidden-input" aria-label="Audio fayli" onChange={e=>{void importAudio(e.target.files?.[0]);e.target.value='';}}/>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}<button aria-label="Xabarni yopish" onClick={()=>setToast('')}><X size={14}/></button></div>}
    {autosave==='error' && autosaveErrors.current>=3 && <div className="autosave-banner">Avtosaqlash ishlamayapti. Loyihani Ctrl+S orqali saqlang.</div>}
    {dialog==='close'&&<CloseWindowDialog name={project.meta.name} dirty={store.isDirty()} exporting={exporting} busy={closing||saving} onCancel={()=>setDialog(closeReturnDialog.current==='export'&&!exporting?null:closeReturnDialog.current)} onDiscard={()=>void closeWindow()} onSave={()=>{void(async()=>{if(await save()&&!store.isDirty())await closeWindow();})();}}/>}
    {dialog!=='close'&&(dialog||recovery) && <div className="modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget&&!exporting&&!recovery)setDialog(null);}}><section className={`modal ${dialog==='help'?'help-modal':''}`} role="dialog" aria-modal="true" aria-label={recovery?'Loyihani tiklash':dialog==='export'?'Eksport sozlamalari':dialog==='help'?'Yordam':'Loyiha o‘zgarishlari'}>
      <button className="modal-close" aria-label="Oynani yopish" disabled={exporting} onClick={()=>recovery?setRecovery(null):setDialog(null)}><X size={18}/></button>
      {recovery?<><div className="modal-symbol"><FolderOpen size={25}/></div><h2>Loyihani davom ettiramizmi?</h2><p>«{recovery.project.meta.name}» loyihasining avtosaqlangan nusxasi topildi.</p><div className="modal-actions"><button className="secondary-button" onClick={()=>{setRecovery(null);void services.storage.clearRecovery();}}>O‘tkazib yuborish</button><button className="primary-button" onClick={()=>{load(recovery);store.transact('Tiklangan loyiha',d=>{d.meta.modifiedAt=new Date().toISOString();});setRecovery(null);notify('Loyiha tiklandi');}}>Tiklash <ArrowUpRight size={15}/></button></div></>:dialog==='export'?<><div className="modal-eyebrow"><ArrowDownToLine size={14}/> NATIJANI ULASHING</div><h2>Sahnangiz tayyor.</h2><p>Animatsiyangizni faylga chiqaring.</p><label className="field-label">Format</label><div className="export-formats">{(['png','webm','mp4'] as const).map(format=><button key={format} className={exportFormat===format?'selected':''} disabled={exporting || (format!=='png'&&!services.exportVideo)} onClick={()=>setExportFormat(format)}><span>{format==='png'?<Camera size={20}/>:<Clapperboard size={20}/>}</span><strong>{format.toUpperCase()}</strong><small>{format==='png'?'Joriy kadr':format==='webm'?'VP9 video':'H.264 video'}</small>{exportFormat===format&&<Check size={13}/>}</button>)}</div><div className="export-details"><span>O‘lcham<strong>{project.settings.frame.width} × {project.settings.frame.height}</strong></span><span>{exportFormat==='png'?'Vaqt':'Davomiylik'}<strong>{exportFormat==='png'?`${(time/1000).toFixed(2)} s`:`${scene.durationMs/1000} s · ${project.settings.fps} FPS`}</strong></span></div><p className="export-note">{services.exportVideo?'Video eksporti ilova ichida tayyor. Yoqilgan audio kliplar video bilan birga saqlanadi.':'PNG eksporti brauzerda ishlaydi. MP4 va WebM uchun desktop ilovasini ishga tushiring.'}</p>{exportError&&<div className="export-error" role="alert"><CircleAlert size={19}/><div><strong>Eksport bajarilmadi</strong><p>{exportError}</p></div></div>}{exportProgress && <div className="export-progress"><span>{exportProgress.stage==='mixing'?'Audio tayyorlanmoqda…':exportProgress.stage==='finalizing'?'Fayl yakunlanmoqda…':`${exportProgress.frame} / ${exportProgress.total} kadr`} <strong>{Math.round(exportProgress.progress*100)}%</strong></span><progress max="1" value={exportProgress.progress}/></div>}<div className="modal-actions">{exporting?<button className="secondary-button" onClick={()=>exportRef.current?.cancel()}>Bekor qilish</button>:<button className="secondary-button" onClick={()=>setDialog(null)}>Orqaga</button>}<button className="primary-button" onClick={()=>void doExport()} disabled={exporting}>{exporting?<LoaderCircle className="spin" size={16}/>:<Download size={16}/>} {exporting?'Eksport qilinmoqda…':'Eksport qilish'}</button></div></>:dialog==='help'?<><div className="modal-eyebrow"><Sparkles size={14}/> ALGORITHACT</div><h2>G‘oyangizni harakatlantiring.</h2><p>Personaj tanlang, harakat qo‘shing va timeline’da hikoyangizni yarating.</p><div className="shortcut-list">{[['F','Fokus rejimi'],['L','Qatlamlar paneli'],['I','Xususiyatlar paneli'],['Shift + 1','Sahnani sig‘dirish'],['V','Tanlash va ko‘chirish'],['P','Personaj pozasi'],['H','Sahnani surish'],['K','Tanlangan xususiyatga kalit'],['Space','Ijro / pauza'],['← →','Bitta kadr oldinga / orqaga'],['Ctrl + Z','Bekor qilish'],['Ctrl + Shift + Z','Qaytarish'],['Ctrl + S','Loyihani saqlash'],['Ctrl + O','Loyiha ochish'],['Delete','Kalit, klip yoki obyektni o‘chirish']].map(([key,label])=><div key={key}><span>{label}</span><kbd>{key}</kbd></div>)}</div><p className="software-credits">Video eksport: FFmpeg · LGPLv3+. Litsenziya va manba ma’lumotlari ilovaning resources/ffmpeg papkasida.</p></>:<><div className="modal-symbol"><Save size={25}/></div><h2>O‘zgarishlarni saqlang</h2><p>Joriy loyihada saqlanmagan o‘zgarishlar bor. Davom etishdan oldin .anim nusxasini saqlashingiz mumkin.</p><div className="modal-actions"><button className="secondary-button" onClick={()=>{const next=dialog;setDialog(null);if(next==='new')newProject();else void open();}}>Saqlamasdan davom etish</button><button className="primary-button" onClick={()=>{const next=dialog;void(async()=>{if(await save()){setDialog(null);if(next==='new')newProject();else await open();}})();}}>Saqlash</button></div></>}
    </section></div>}
  </div>;
}
