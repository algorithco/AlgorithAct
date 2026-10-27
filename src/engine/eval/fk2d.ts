import type { Mat2D } from '../../contracts';
import type { RigDef, Transform2D } from '../../model/schema/project';
import { multiply, transform } from './matrix';

export function fk2d(rig: RigDef, pose: Record<string, number>, root: Transform2D): Record<string, Mat2D> {
  const world: Record<string, Mat2D> = {}, rootMatrix=transform(root);
  for (const bone of rig.bones) {
    let delta=pose[bone.key]??0;
    if (bone.limits) delta=Math.max(bone.limits[0],Math.min(bone.limits[1],delta));
    world[bone.key]=multiply(bone.parent ? world[bone.parent] : rootMatrix,transform({ ...bone.rest, rotation: bone.rest.rotation+delta, scaleX:1, scaleY:1 }));
  }
  return world;
}
