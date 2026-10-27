import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { EditorServices, FrameState, Renderer } from '../../../contracts';
import type { Project } from '../../../model/schema/project';
import { invert, multiply, point } from '../../../engine';

interface Props {
  project:Project; frame:FrameState; assets:Record<string,Uint8Array>; services:EditorServices;
  selected:string|null; onSelect:(id:string|null)=>void; mode:'select'|'pose'|'pan'; zoom:number|null;
  resetView:number; onFit:(scale:number)=>void; onZoom:(scale:number)=>void;
  onMove:(id:string,x:number,y:number,key:string)=>void;
  onPose:(bone:string,rotation:number,key:string)=>void;
  onReady:(renderer:Renderer|null)=>void; onError:(message:string)=>void;
}
export function Viewport({project,frame,assets,services,selected,onSelect,mode,zoom,resetView,onFit,onZoom,onMove,onPose,onReady,onError}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null),rendererRef=useRef<Renderer|null>(null);
  const frameRef=useRef(frame);frameRef.current=frame;
  const [ready,setReady]=useState(false),[pan,setPan]=useState({x:0,y:0}),[error,setError]=useState('');
  const [bounds,setBounds]=useState<{width:number;height:number}>({width:640,height:360});
  const hostRef=useRef<HTMLDivElement>(null);
  const dragging=useRef<null|{type:'move'|'pose'|'pan';id:string;bone?:string;px:number;py:number;x:number;y:number;angle:number;rotation:number;parentAngle:number;key:string}>(null);
  const callbacks=useRef({onReady,onError});callbacks.current={onReady,onError};
  useEffect(()=>{
    const host=hostRef.current;if(!host)return;
    const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(host);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let disposed=false;const renderer=services.createRenderer();
    void renderer.init(canvasRef.current!,project.settings.frame.width,project.settings.frame.height).then(()=>{
      if(disposed){renderer.dispose();return;}rendererRef.current=renderer;setReady(true);callbacks.current.onReady(renderer);
    }).catch(e=>{if(!disposed){setError(String(e));callbacks.current.onError(String(e));}});
    return()=>{disposed=true;setReady(false);callbacks.current.onReady(null);if(rendererRef.current===renderer){renderer.dispose();rendererRef.current=null;}};
  },[services,project.settings.frame.width,project.settings.frame.height]);
  useEffect(()=>{
    if(!ready || !rendererRef.current)return;
    let cancelled=false;const renderer=rendererRef.current,resolver=services.resolver(assets,project);
    void renderer.load(project,resolver).then(()=>{if(!cancelled)renderer.render(frameRef.current);}).catch(e=>callbacks.current.onError(String(e)));
    return()=>{cancelled=true;resolver.dispose();};
  },[ready,project,assets,services]);
  useEffect(()=>{if(ready)rendererRef.current?.render(frame);},[frame,ready]);
  const fit=Math.max(.04,Math.min((bounds.width-48)/frame.size.width,(bounds.height-88)/frame.size.height));
  useEffect(()=>{if(bounds.width>0&&bounds.height>0)onFit(fit);},[fit,onFit,bounds.width,bounds.height]);
  useEffect(()=>{setPan({x:0,y:0});},[resetView]);
  const scale=zoom??fit;
  useEffect(()=>{
    const host=hostRef.current;if(!host)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();
      if(event.ctrlKey||event.metaKey){
        const next=Math.max(.05,Math.min(4,scale*Math.exp(-event.deltaY*.002)));
        const rect=host.getBoundingClientRect(),x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2-12;
        setPan(previous=>({x:x-(x-previous.x)*next/scale,y:y-(y-previous.y)*next/scale}));onZoom(next);
      }else setPan(previous=>({x:previous.x-event.deltaX,y:previous.y-event.deltaY}));
    };
    host.addEventListener('wheel',wheel,{passive:false});return()=>host.removeEventListener('wheel',wheel);
  },[scale,onZoom]);
  const width=frame.size.width*scale,height=frame.size.height*scale;
  const entity=selected?frame.resolved[selected]:undefined;
  const scene=project.scenes[project.sceneOrder[0]];
  const screenPoint=(x:number,y:number)=>point(frame.camera,x,y);
  const local=(event:PointerEvent<SVGSVGElement|SVGElement>)=>{
    const rect=event.currentTarget.ownerSVGElement?.getBoundingClientRect()??event.currentTarget.getBoundingClientRect();
    return {x:(event.clientX-rect.left)/scale,y:(event.clientY-rect.top)/scale};
  };
  function startMove(event:PointerEvent<SVGElement>,id:string){
    event.stopPropagation();const e=frame.resolved[id];if(!e || e.kind==='camera' || e.locked)return;
    onSelect(id);event.currentTarget.setPointerCapture(event.pointerId);
    const p=point(invert(frame.camera),local(event).x,local(event).y);
    dragging.current={type:'move',id,px:p.x,py:p.y,x:e.transform.x,y:e.transform.y,angle:0,rotation:0,parentAngle:0,key:`move:${id}:${event.timeStamp}`};
  }
  function startPose(event:PointerEvent<SVGElement>,bone:string){
    if(!selected || entity?.kind!=='character' || entity.locked)return;
    event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);
    const def=project.library.characters[entity.characterId],rig=project.library.rigs[def.rigId],b=rig.bones.find(b=>b.key===bone)!;
    const matrix=multiply(frame.camera,frame.poses[selected][bone]),p=local(event),parent=b.parent?frame.poses[selected][b.parent]:undefined;
    const cameraAngle=Math.atan2(frame.camera.b,frame.camera.a),parentAngle=parent?Math.atan2(parent.b,parent.a):entity.transform.rotation;
    dragging.current={type:'pose',id:selected,bone,px:matrix.tx,py:matrix.ty,x:0,y:0,angle:Math.atan2(p.y-matrix.ty,p.x-matrix.tx),rotation:entity.pose[bone]??0,parentAngle:parentAngle+cameraAngle+b.rest.rotation,key:`pose:${bone}:${event.timeStamp}`};
  }
  function move(event:PointerEvent<SVGSVGElement>){
    const drag=dragging.current;if(!drag)return;
    if(drag.type==='pan'){setPan({x:drag.x+event.clientX-drag.px,y:drag.y+event.clientY-drag.py});return;}
    const p=local(event);
    if(drag.type==='move'){const world=point(invert(frame.camera),p.x,p.y);onMove(drag.id,Math.round(drag.x+world.x-drag.px),Math.round(drag.y+world.y-drag.py),drag.key);}
    else {let delta=Math.atan2(p.y-drag.py,p.x-drag.px)-drag.angle;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;onPose(drag.bone!,drag.rotation+delta,drag.key);}
  }
  const selectionBounds=()=>{
    if(!entity || entity.kind==='camera' || !entity.visible)return null;
    if(entity.kind==='character'){
      const rig=project.library.rigs[project.library.characters[entity.characterId].rigId];
      const pts=rig.bones.flatMap(b=>{const m=multiply(frame.camera,frame.poses[entity.id][b.key]);return [point(m,-40,b.key==='head'?-42:0),point(m,40,b.length+12)];});
      const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);return {x:Math.min(...xs)-14,y:Math.min(...ys)-14,w:Math.max(...xs)-Math.min(...xs)+28,h:Math.max(...ys)-Math.min(...ys)+28};
    }
    const p=screenPoint(entity.transform.x,entity.transform.y);
    const w=entity.kind==='text'?Math.max(...entity.text.split('\n').map(s=>s.length))*entity.size*.61:(project.assets[entity.assetId]?.meta?.width??200);
    const h=entity.kind==='text'?entity.size*1.15*entity.text.split('\n').length:(project.assets[entity.assetId]?.meta?.height??200);
    return {x:p.x-8,y:p.y-8,w:Math.abs(w*entity.transform.scaleX*frame.camera.a)+16,h:Math.abs(h*entity.transform.scaleY*frame.camera.d)+16};
  };
  const selection=selectionBounds();
  return <div className={`viewport mode-${mode}`} ref={hostRef} data-testid="viewport" onPointerDown={event=>{
    if(mode==='pan' || event.button===1){event.currentTarget.setPointerCapture(event.pointerId);dragging.current={type:'pan',id:'',px:event.clientX,py:event.clientY,x:pan.x,y:pan.y,angle:0,rotation:0,parentAngle:0,key:''};}
  }} onPointerMove={event=>{const d=dragging.current;if(d?.type==='pan')setPan({x:d.x+event.clientX-d.px,y:d.y+event.clientY-d.py});}} onPointerUp={()=>{dragging.current=null;}}>
    <div className="stage-caption"><span className="scene-dot"/>{scene.name}<span>{frame.size.width} × {frame.size.height}</span></div>
    <div className="stage" style={{width,height,transform:`translate(${pan.x}px,${pan.y}px)`}}>
      <canvas ref={canvasRef} aria-label="Animatsiya sahnasi" data-testid="scene-canvas"/>
      <svg className="stage-overlay" viewBox={`0 0 ${frame.size.width} ${frame.size.height}`} onPointerDown={event=>{if(mode!=='pan' && event.target===event.currentTarget)onSelect(null);}} onPointerMove={move} onPointerUp={()=>{dragging.current=null;}} onLostPointerCapture={()=>{dragging.current=null;}}>
        {mode!=='pan' && scene.entityOrder.map(id=>{
          const e=frame.resolved[id];if(!e || e.kind==='camera' || !e.visible || e.locked)return null;
          if(e.kind==='character')return <g key={id} className="entity-hit" onPointerDown={ev=>startMove(ev,id)}>{frame.nodes.filter(n=>n.entityId===id).map(n=>{const m=multiply(frame.camera,n.world);return <circle key={n.key} cx={m.tx} cy={m.ty+30} r={65*Math.abs(e.transform.scaleX)} fill="transparent"/>;})}</g>;
          const p=screenPoint(e.transform.x,e.transform.y),w=e.kind==='text'?Math.max(...e.text.split('\n').map(s=>s.length))*e.size*.61:(project.assets[e.assetId]?.meta?.width??200),h=e.kind==='text'?e.size*1.2*e.text.split('\n').length:(project.assets[e.assetId]?.meta?.height??200);
          return <rect key={id} className="entity-hit" x={p.x} y={p.y} width={Math.abs(w*e.transform.scaleX*frame.camera.a)} height={Math.abs(h*e.transform.scaleY*frame.camera.d)} fill="transparent" onPointerDown={ev=>startMove(ev,id)}/>;
        })}
        {selection && <g className="selection-box" pointerEvents="none"><rect x={selection.x} y={selection.y} width={selection.w} height={selection.h} fill="none" stroke="#65974A" strokeWidth={1.2/scale} strokeDasharray={mode==='pose'?`${5/scale} ${4/scale}`:undefined}/>{[[0,0],[1,0],[0,1],[1,1]].map(([x,y],i)=><rect key={i} x={selection.x+x*selection.w-3.5/scale} y={selection.y+y*selection.h-3.5/scale} width={7/scale} height={7/scale} fill="#EDF4E7" stroke="#65974A" strokeWidth={1/scale}/>)}</g>}
        {mode==='pose' && entity?.kind==='character' && project.library.rigs[project.library.characters[entity.characterId].rigId].bones.map(b=>{
          const m=multiply(frame.camera,frame.poses[entity.id][b.key]),p=point(m,0,b.length||25);
          return <g key={b.key}><line x1={m.tx} y1={m.ty} x2={p.x} y2={p.y} stroke="#95C56D" strokeWidth={1.3/scale} pointerEvents="none"/><circle data-testid={`joint-${b.key}`} role="button" aria-label={`${b.key} bo‘g‘ini`} cx={p.x} cy={p.y} r={5/scale} fill="#B8EB85" stroke="#314B24" strokeWidth={1.5/scale} className="joint-handle" onPointerDown={event=>startPose(event,b.key)}/></g>;
        })}
      </svg>
      {!ready && <div className="canvas-loading">{error?'Sahna ochilmadi. Ilovani qayta ochib ko‘ring.':'Sahna tayyorlanmoqda…'}</div>}
    </div>
    <div className="viewport-hint">{mode==='pose'?'Bo‘g‘inni tortib pozani o‘zgartiring':mode==='pan'?'Sahnani tortib ko‘chiring':'Obyektni tanlang va sahnada ko‘chiring'}<kbd>{mode==='pose'?'P':mode==='pan'?'H':'V'}</kbd></div>
  </div>;
}
