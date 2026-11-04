import * as T from '../../vendor/three.module.js';
import {partMatrix} from '../interiors/entrances.js';import {sectionPolygon} from './platform.js';
// Find stationary, parallel edges near the side currently being resized.
export function snapPlatformResize(base,index,side,value,parts=[],distance=.35){
 const s=base.platform.sections[index],wide=side==='left'||side==='right',sign=side==='left'||side==='front'?-1:1,axis=wide?'width':'depth',along=new T.Vector2(wide?Math.cos(s.rotation):Math.sin(s.rotation),wide?-Math.sin(s.rotation):Math.cos(s.rotation)),across=new T.Vector2(-along.y,along.x),matrix=partMatrix(base),inverse=matrix.clone().invert(),axisScale=new T.Vector3(along.x,0,along.y).applyMatrix3(new T.Matrix3().setFromMatrix4(matrix)).length(),threshold=distance/axisScale;
 const center=new T.Vector2(s.x,s.z),desired=center.dot(along)+sign*(value-s[axis]/2),crossCenter=center.dot(across),crossHalf=s[wide?'depth':'width']/2,excluded=new Set([s.id]);
 let changed=true;while(changed){changed=false;for(const child of base.platform.sections)if(excluded.has(child.attachment?.sectionId)&&!excluded.has(child.id)){excluded.add(child.id);changed=true;}}
 const targets=[base,...parts.filter(p=>p.platform&&p.id!==base.id)];let best=null,bestDistance=threshold;
 for(const part of targets){const targetMatrix=partMatrix(part);for(const section of part.platform.sections){if(part===base&&excluded.has(section.id))continue;
 const world=sectionPolygon(section).map(p=>new T.Vector3(p.x,0,p.z).applyMatrix4(targetMatrix));
 if(world.some(p=>Math.abs(p.y-base.position[1])>.05))continue;
 const poly=world.map(p=>p.clone().applyMatrix4(inverse));
 for(let edge=0;edge<poly.length;edge++){const a=poly[edge],b=poly[(edge+1)%poly.length],v=new T.Vector2(b.x-a.x,b.z-a.z),length=v.length();if(length<1e-6||Math.abs(v.dot(along))/length>1e-5)continue;
 const ca=new T.Vector2(a.x,a.z).dot(across),cb=new T.Vector2(b.x,b.z).dot(across);if(Math.max(ca,cb)<crossCenter-crossHalf-threshold||Math.min(ca,cb)>crossCenter+crossHalf+threshold)continue;
 const target=new T.Vector2(a.x,a.z).dot(along),gap=Math.abs(target-desired),candidate=value+sign*(target-desired);if(gap>bestDistance||candidate<2||candidate>100)continue;
 bestDistance=gap;best={value:candidate,partId:part.id,sectionId:section.id,points:[world[edge].toArray(),world[(edge+1)%world.length].toArray()]};
 }
 }}return best;
}
