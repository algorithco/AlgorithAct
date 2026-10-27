import { ChevronDown, Diamond, Film, LockKeyhole, Eye, EyeOff, LockKeyholeOpen, Plus, Repeat2, Waves, Type, Image as ImageIcon, ZoomIn, ZoomOut, Music2, Volume2, VolumeX } from 'lucide-react';
import type { PointerEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import type { FrameState } from '../../../contracts';
import type { Scene, Project, SceneTrack } from '../../../model/schema/project';

export interface KeySelection {trackId:string;t:number}
interface Props {resolved:FrameState['resolved'];controls:ReactNode;height:number;maxHeight:number;onResize:(height:number|null)=>void;collapsed:boolean;onCollapse:()=>void;project:Project;scene:Scene;time:number;selected:string|null;selectedClip:string|null;selectedKey:KeySelection|null;loop:boolean;waveforms:Record<string,readonly number[]>;onAudioMute:(id:string)=>void;onLoop:()=>void;onTime:(t:number)=>void;onSelect:(id:string)=>void;onClip:(id:string)=>void;onKey:(track:SceneTrack,t:number)=>void;onToggle:(id:string,what:'visible'|'locked')=>void;onAddKey:()=>void;onClipMove:(id:string,startMs:number,key:string)=>void;}
export function Timeline({resolved,controls,height,maxHeight,onResize,collapsed,onCollapse,project,scene,time,selected,selectedClip,selectedKey,loop,waveforms,onAudioMute,onLoop,onTime,onSelect,onClip,onKey,onToggle,onAddKey,onClipMove}:Props){
  const [zoom,setZoom]=useState(1);
  const duration=scene.durationMs;
  const ticks=Array.from({length:Math.floor(duration/1000)+1},(_,i)=>i*1000);
  const scrub=(event:PointerEvent<HTMLDivElement>)=>{const rect=event.currentTarget.getBoundingClientRect();onTime(Math.max(0,Math.min(duration,Math.round(Math.round((event.clientX-rect.left)/rect.width*duration*project.settings.fps/1000)*1000/project.settings.fps))));};
  const rows=scene.entityOrder.filter(id=>scene.entities[id].kind!=='camera').reverse();
  const audioClips=Object.values(scene.timeline.clips).filter(c=>c.kind==='audio');
  function dragClip(event:PointerEvent<HTMLButtonElement>,id:string,startMs:number,clipDuration:number){
    event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);
    const target=event.currentTarget,startX=event.clientX,width=target.parentElement!.getBoundingClientRect().width,key=`clip:${id}:${event.timeStamp}`;
    const move=(ev:globalThis.PointerEvent)=>{if(Math.abs(ev.clientX-startX)>3)onClipMove(id,Math.max(0,Math.min(duration-clipDuration,Math.round((startMs+(ev.clientX-startX)/width*duration)/100)*100)),key);};
    const up=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',up);target.removeEventListener('lostpointercapture',up);};
    target.addEventListener('pointermove',move);target.addEventListener('pointerup',up);target.addEventListener('lostpointercapture',up);
  }
  return <section className={`timeline ${collapsed?'is-collapsed':''}`} aria-label="Animatsiya timeline">
    {!collapsed&&<TimelineResizer height={height} maxHeight={maxHeight} onResize={onResize}/>}
    <div className="timeline-toolbar"><div className="timeline-title"><Film size={15}/><strong>Timeline</strong><button className="timeline-collapse" onClick={onCollapse} aria-expanded={!collapsed} aria-controls="timeline-tracks" aria-label={collapsed?'Timeline ochish':'Timeline yig‘ish'} title={collapsed?'Timeline ochish':'Timeline yig‘ish'}><ChevronDown size={16}/></button><span className="timeline-duration">{duration/1000} soniya</span></div>{controls}<div className="timeline-actions"><button title="Kalit qo‘shish" aria-label="Kalit qo‘shish" onClick={onAddKey} disabled={!selected}><Diamond size={14}/><Plus size={10}/></button><span className="small-divider"/><button aria-label="Takroriy ijro" title="Takroriy ijro" className={loop?'active':''} onClick={onLoop}><Repeat2 size={16}/></button><span className="small-divider"/><button aria-label="Timeline kichraytirish" onClick={()=>setZoom(v=>Math.max(1,v-.5))} disabled={zoom===1}><ZoomOut size={15}/></button><input type="range" aria-label="Timeline masshtabi" min="1" max="4" step=".5" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button aria-label="Timeline kattalashtirish" onClick={()=>setZoom(v=>Math.min(4,v+.5))} disabled={zoom===4}><ZoomIn size={15}/></button></div></div>
    <div className="timeline-scroll" id="timeline-tracks" hidden={collapsed}><div className="timeline-content" style={{minWidth:`${zoom*100}%`}}>
      <div className="timeline-ruler-row"><div className="track-label ruler-label">QATLAMLAR <span>{rows.length}</span></div><div className="time-ruler" data-testid="time-ruler" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);scrub(e);}} onPointerMove={e=>{if(e.buttons===1)scrub(e);}}>{ticks.map(t=><span className="time-tick" key={t} style={{left:`${t/duration*100}%`}}>{String(t/1000).padStart(2,'0')}s</span>)}<div className="ruler-playhead" style={{left:`${time/duration*100}%`}}><span/></div></div></div>
      {audioClips.map(clip=>{
        const asset=project.assets[clip.assetId],peaks=waveforms[clip.assetId]??[],sourceMs=asset.meta?.durationMs??clip.durationMs;
        const first=Math.floor(clip.trimInMs/sourceMs*peaks.length),last=Math.max(first+1,Math.ceil((clip.trimInMs+clip.durationMs)/sourceMs*peaks.length));
        const section=peaks.slice(first,last);
        return <div className={`timeline-row audio-row ${selectedClip===clip.id?'selected':''} ${clip.muted?'audio-muted':''}`} key={clip.id}>
          <div className="track-label"><button className="track-name" title={asset.name} onClick={()=>onClip(clip.id)}><span className="layer-icon audio"><Music2 size={13}/></span><span>{asset.name}</span></button><button title="Ovozni o‘zgartirish" aria-label={`${asset.name} ovozi`} onClick={()=>onAudioMute(clip.id)}>{clip.muted?<VolumeX size={13}/>:<Volume2 size={13}/>}</button></div>
          <div className="track-lane audio-lane" style={{backgroundSize:`${100000/duration}% 100%`}} onPointerDown={e=>{if(e.target===e.currentTarget){scrub(e);onClip(clip.id);}}}>
            <button className={`audio-clip ${selectedClip===clip.id?'selected-clip':''}`} aria-label={`${asset.name} audio klipi`} style={{left:`${clip.startMs/duration*100}%`,width:`${Math.min(clip.durationMs,duration-clip.startMs)/duration*100}%`}} onClick={e=>{e.stopPropagation();onClip(clip.id);}} onPointerDown={event=>dragClip(event,clip.id,clip.startMs,clip.durationMs)}>
              <svg className="audio-waveform" viewBox="0 0 160 24" preserveAspectRatio="none" aria-hidden="true" data-testid={`waveform-${clip.id}`}>{section.map((peak,i)=><line key={i} x1={(i+.5)/section.length*160} x2={(i+.5)/section.length*160} y1={12-Math.max(.06,peak)*10} y2={12+Math.max(.06,peak)*10}/>)}</svg><span>{asset.name}</span>
              {clip.fadeInMs>0&&<i className="audio-fade-in" style={{width:`${Math.min(100,clip.fadeInMs/clip.durationMs*100)}%`}}/>}{clip.fadeOutMs>0&&<i className="audio-fade-out" style={{width:`${Math.min(100,clip.fadeOutMs/clip.durationMs*100)}%`}}/>}
            </button><div className="lane-playhead" style={{left:`${time/duration*100}%`}}/>
          </div>
        </div>;
      })}
      {rows.map((id,index)=>{
        const entity=resolved[id]??scene.entities[id],clips=Object.values(scene.timeline.clips).filter(c=>c.kind==='motion' && c.entityId===id),tracks=Object.values(scene.timeline.tracks).filter(t=>t.entityId===id);
        return <div key={id} className={`timeline-row ${selected===id?'selected':''}`}>
          <div className="track-label"><button className="track-name" title={entity.name} onClick={()=>onSelect(id)}><span className={`layer-icon ${entity.kind}`}>{entity.kind==='character'?<UserIcon/>:entity.kind==='text'?<Type size={13}/>:<ImageIcon size={13}/>}</span><span>{entity.name}</span></button><button aria-label={`${entity.name} ko‘rinishi`} title="Ko‘rinishni o‘zgartirish" onClick={()=>onToggle(id,'visible')}>{entity.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button aria-label={`${entity.name} qulfi`} title="Qulfni o‘zgartirish" onClick={()=>onToggle(id,'locked')}>{entity.locked?<LockKeyhole size={11}/>:<LockKeyholeOpen size={11}/>}</button></div>
          <div className="track-lane" onPointerDown={e=>{if(e.target===e.currentTarget){scrub(e);onSelect(id);}}} style={{backgroundSize:`${100000/duration}% 100%`}}>
            {!clips.length && <div className={`static-track ${entity.kind}`} style={{opacity:entity.visible?1:.35}}><span>{entity.kind==='text'?'T':entity.kind==='image'?'▧':'◇'}</span>{entity.kind==='text'?entity.text.replace(/\n/g,' '):entity.name}</div>}
            {clips.map(clip=>clip.kind==='motion' && <button key={clip.id} className={`motion-clip ${selectedClip===clip.id?'selected-clip':''}`} aria-label={`${project.library.motions[clip.motionId].name} klipi`} style={{left:`${clip.startMs/duration*100}%`,width:`${Math.min(clip.durationMs,duration-clip.startMs)/duration*100}%`,top:5+(clip.lane%2)*2}} onClick={e=>{e.stopPropagation();onSelect(id);onClip(clip.id);}} onPointerDown={event=>{
              event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);const startX=event.clientX,startMs=clip.startMs,trackWidth=event.currentTarget.parentElement!.getBoundingClientRect().width,key=`clip:${clip.id}:${event.timeStamp}`;
              const target=event.currentTarget;
              const move=(ev:globalThis.PointerEvent)=>{if(Math.abs(ev.clientX-startX)>3)onClipMove(clip.id,Math.max(0,Math.min(duration-clip.durationMs,Math.round((startMs+(ev.clientX-startX)/trackWidth*duration)/100)*100)),key);};
              const up=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',up);target.removeEventListener('lostpointercapture',up);};
              target.addEventListener('pointermove',move);target.addEventListener('pointerup',up);target.addEventListener('lostpointercapture',up);
            }}><Waves size={12}/><span>{project.library.motions[clip.motionId].name}</span><span className="clip-dashes">⌁⌁⌁⌁⌁⌁⌁⌁</span></button>)}
            {tracks.flatMap(track=>track.keys.map(key=><button key={`${track.id}:${key.t}`} title={`${track.path} · ${(key.t/1000).toFixed(2)} s`} aria-label={`${entity.name} ${track.path} kaliti ${key.t}`} className={`keyframe ${selectedKey?.trackId===track.id && selectedKey.t===key.t?'active':''}`} style={{left:`${key.t/duration*100}%`,top:13+(tracks.indexOf(track)%3)*4}} onClick={e=>{e.stopPropagation();onKey(track,key.t);}}><Diamond size={12} fill="currentColor"/></button>))}
            <div className="lane-playhead" style={{left:`${time/duration*100}%`}}/>
            {index===0 && entity.kind==='character' && !clips.length && <span className="lane-hint">Harakat qo‘shing</span>}
          </div>
        </div>;
      })}
    </div></div>
    <div className="timeline-footer"><span><span className="live-dot"/>Animatsiya timeline</span><span><kbd>Space</kbd> Ijro <span className="footer-divider">·</span><kbd>←</kbd><kbd>→</kbd> Kadr</span></div>
  </section>;
}
function UserIcon(){return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="4" r="2.1"/><path d="M8 6v5m-4 4 4-4 4 4M4 8l4 1 4-1"/></svg>;}

function TimelineResizer({height,maxHeight,onResize}:{height:number;maxHeight:number;onResize:(height:number|null)=>void}) {
  const drag=useRef<{y:number;height:number}|null>(null);
  return <div className="timeline-resizer" role="separator" aria-label="Timeline balandligi" aria-orientation="horizontal" aria-valuemin={128} aria-valuemax={maxHeight} aria-valuenow={Math.round(height)} aria-controls="timeline-tracks" tabIndex={0} title="Balandlikni o‘zgartirish uchun torting. Ikki bosish — tiklash."
    onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={y:event.clientY,height:event.currentTarget.parentElement!.getBoundingClientRect().height};}}
    onPointerMove={event=>{if(drag.current)onResize(drag.current.height+drag.current.y-event.clientY);}}
    onPointerUp={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
    onDoubleClick={()=>onResize(null)} onKeyDown={event=>{
      if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      onResize(event.key==='Home'?128:event.key==='End'?maxHeight:height+(event.key==='ArrowUp'?24:-24));
    }}><span/></div>;
}
