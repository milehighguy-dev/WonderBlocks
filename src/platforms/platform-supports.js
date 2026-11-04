import * as T from '../../vendor/three.module.js';
import {partMatrix} from '../interiors/entrances.js';

// Like highway supports, columns descend vertically to the world ground y=0.
// Probe the actual underside so compound decks cannot leave floating columns.
export function platformSupportAnchor(group,part,point){
 const matrix=partMatrix(part),inverse=matrix.clone().invert();group.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(group).applyMatrix4(matrix),world=new T.Vector3(point.x,0,point.z).applyMatrix4(matrix);
 const origin=world.clone().setY(bounds.min.y-1).applyMatrix4(inverse),direction=new T.Vector3(0,1,0).transformDirection(inverse);
 const ray=new T.Raycaster(origin,direction),bodies=group.children.filter(m=>m.isMesh&&(!m.geometry.userData.platformPart||m.geometry.userData.platformPart==='body'));
 const hit=ray.intersectObjects(bodies,false)[0];if(!hit)return null;
 const top=hit.point.clone().applyMatrix4(matrix);if(top.y<=.1)return null;
 return {top,matrix,inverse};
}

export function buildPlatformGroundSupports(group,material,part){
 if(!part.platform.supports)return;
 // Every section has an independent footing, always under its actual body.
 for(const s of part.platform.sections){
  const a=platformSupportAnchor(group,part,{x:s.x,z:s.z});if(!a)continue;
  const radius=Math.min(1,Math.min(s.width*Math.abs(part.scale[0]),s.depth*Math.abs(part.scale[2]))*.055),height=a.top.y;
  const g=new T.CylinderGeometry(radius,radius,height,12);g.translate(a.top.x,height/2,a.top.z);g.applyMatrix4(a.inverse);
  g.userData.platformPart='supports';const m=new T.Mesh(g,material);m.castShadow=m.receiveShadow=true;group.add(m);
 }
}
