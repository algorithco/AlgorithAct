import type { Ease, Track, Value } from '../../model/schema/project';

export function easeAt(ease: Ease, t: number): number {
  if (ease === 'step') return 0;
  if (ease === 'in') return t*t*t;
  if (ease === 'out') return 1-(1-t)**3;
  if (ease === 'inOut') return t < .5 ? 4*t*t*t : 1-(-2*t+2)**3/2;
  if (ease === 'linear') return t;
  const [x1,y1,x2,y2] = ease.bezier;
  const cubic = (u: number, a: number, b: number) => 3*(1-u)**2*u*a+3*(1-u)*u*u*b+u**3;
  let lo=0, hi=1;
  for (let i=0; i<24; i++) { const mid=(lo+hi)/2; if (cubic(mid,x1,x2)<t) lo=mid; else hi=mid; }
  return cubic((lo+hi)/2,y1,y2);
}
export function interpolate(a: Value, b: Value, t: number, type: Track['type']): Value {
  if (type === 'number' && typeof a === 'number' && typeof b === 'number') return a+(b-a)*t;
  if (type === 'vec2' && Array.isArray(a) && Array.isArray(b)) return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  if (type === 'color' && typeof a === 'string' && typeof b === 'string') {
    const aa = a.length===7 ? a+'ff' : a, bb = b.length===7 ? b+'ff' : b;
    return '#'+[1,3,5,7].map(i => Math.round(parseInt(aa.slice(i,i+2),16)+(parseInt(bb.slice(i,i+2),16)-parseInt(aa.slice(i,i+2),16))*t).toString(16).padStart(2,'0')).join('');
  }
  return t < 1 ? a : b;
}
export function sample(track: Track, t: number): Value | undefined {
  const keys=track.keys;
  if (!keys.length) return undefined;
  if (t<=keys[0].t) return keys[0].v;
  if (t>=keys[keys.length-1].t) return keys[keys.length-1].v;
  let lo=0, hi=keys.length-1;
  while (hi-lo>1) { const mid=(lo+hi)>>>1; if (keys[mid].t<=t) lo=mid; else hi=mid; }
  const a=keys[lo], b=keys[hi];
  return interpolate(a.v,b.v,easeAt(a.ease,(t-a.t)/(b.t-a.t)),track.type);
}
export function addValues(a: Value, b: Value): Value {
  if (typeof a === 'number' && typeof b === 'number') return a+b;
  if (Array.isArray(a) && Array.isArray(b)) return [a[0]+b[0],a[1]+b[1]];
  return b;
}
