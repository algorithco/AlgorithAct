import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RigDef, Shape, SkinDef } from '../../../model/schema/project';
import { fk2d, multiply } from '../../../engine';

function VectorShape({shape,palette}:{shape:Shape;palette:SkinDef['palette']}){
  const color=(value:string)=>value.startsWith('$')?palette[value.slice(1)]:value;
  const style={fill:'fill' in shape&&shape.fill?color(shape.fill):'none',stroke:shape.stroke?color(shape.stroke.color):undefined,strokeWidth:shape.stroke?.width,strokeLinecap:shape.stroke?.cap??'round' as const,strokeLinejoin:'round' as const};
  if(shape.t==='path')return <path d={shape.d} {...style}/>;
  if(shape.t==='ellipse')return <ellipse cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} {...style}/>;
  if(shape.t==='rect')return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.radius} {...style}/>;
  return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...style}/>;
}

export function CharacterThumb({rig,skin}:{rig:RigDef;skin:SkinDef}){
  const group=useRef<SVGGElement>(null),[viewBox,setViewBox]=useState('-100 -110 200 470');
  const poses=useMemo(()=>fk2d(rig,{},{x:0,y:0,rotation:0,scaleX:1,scaleY:1}),[rig]);
  useLayoutEffect(()=>{
    const bounds=group.current?.getBBox();if(!bounds||bounds.width<=0||bounds.height<=0)return;
    const pad=Math.max(bounds.width,bounds.height)*.06;
    setViewBox(`${bounds.x-pad} ${bounds.y-pad} ${bounds.width+2*pad} ${bounds.height+2*pad}`);
  },[rig,skin]);
  return <svg viewBox={viewBox} aria-hidden="true" data-rig-id={rig.id}><g ref={group}>
    {skin.parts.map((part,index)=>({part,index})).sort((a,b)=>a.part.drawOrder-b.part.drawOrder).map(({part,index})=>{
      if(part.art.kind!=='vector')return null;
      const m=multiply(poses[part.bone],{a:1,b:0,c:0,d:1,tx:-part.pivot.x,ty:-part.pivot.y});
      return <g key={index} transform={`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.tx} ${m.ty})`}>{part.art.shapes.map((shape,i)=><VectorShape key={i} shape={shape} palette={skin.palette}/>)}</g>;
    })}
  </g></svg>;
}
