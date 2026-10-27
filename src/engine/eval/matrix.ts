import type { Mat2D } from '../../contracts';
import type { Transform2D } from '../../model/schema/project';

export const identity = (): Mat2D => ({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
export function multiply(p: Mat2D, q: Mat2D): Mat2D {
  return { a: p.a*q.a+p.c*q.b, b: p.b*q.a+p.d*q.b, c: p.a*q.c+p.c*q.d, d: p.b*q.c+p.d*q.d, tx: p.a*q.tx+p.c*q.ty+p.tx, ty: p.b*q.tx+p.d*q.ty+p.ty };
}
export function transform(t: Transform2D): Mat2D {
  const c = Math.cos(t.rotation), s = Math.sin(t.rotation);
  return { a: c*t.scaleX, b: s*t.scaleX, c: -s*t.scaleY, d: c*t.scaleY, tx: t.x, ty: t.y };
}
export function point(m: Mat2D, x: number, y: number) { return { x: m.a*x+m.c*y+m.tx, y: m.b*x+m.d*y+m.ty }; }
export function invert(m: Mat2D): Mat2D {
  const det = m.a*m.d-m.b*m.c;
  if (Math.abs(det) < 1e-12) return identity();
  return { a: m.d/det, b: -m.b/det, c: -m.c/det, d: m.a/det, tx: (m.c*m.ty-m.d*m.tx)/det, ty: (m.b*m.tx-m.a*m.ty)/det };
}
