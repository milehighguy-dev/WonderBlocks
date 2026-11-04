import * as T from '../../vendor/three.module.js';
import {pointsOf} from './polygon-plan.js';

// Use the actual outline for angled and curved rooms, including concave outlines.
export function roomCutVolumes(room,plan,elevation=0){
 const lo=elevation-plan.slab,hi=elevation+(room.ceilingHeight??room.wallHeight??plan.height)+plan.slab;
 if(!room.points){const t=plan.thickness/2;return [{bounds:[room.x-t,room.x+room.w+t,lo,hi,room.z-t,room.z+room.d+t]}];}
 const points=pointsOf(room),sign=Math.sign(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a.x*b.z-b.x*a.z;},0)),planes=[[0,1,0,-lo],[0,-1,0,hi]];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)*sign/length,nz=(b.x-a.x)*sign/length;planes.push([nx,0,nz,-nx*a.x-nz*a.z]);}
 // A circular or other convex room is one swept volume. Triangulating it into
 // many cutters repeatedly rebuilds the same neighbouring tree or building.
 if(planes.slice(2).every(([nx,,nz,d])=>points.every(p=>nx*p.x+nz*p.z+d>=-1e-7)))return [{planes,bounds:[Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.x)),lo,hi,Math.min(...points.map(p=>p.z)),Math.max(...points.map(p=>p.z))]}];
 const triangles=T.ShapeUtils.triangulateShape(points.map(p=>new T.Vector2(p.x,p.z)),[]);
 return triangles.map(indices=>{
  const pts=indices.map(i=>points[i]),area=pts.reduce((sum,a,i)=>{const b=pts[(i+1)%3];return sum+a.x*b.z-b.x*a.z;},0),sign=Math.sign(area),planes=[[0,1,0,-lo],[0,-1,0,hi]];
  for(let i=0;i<3;i++){const a=pts[i],b=pts[(i+1)%3],nx=-(b.z-a.z)*sign,nz=(b.x-a.x)*sign;planes.push([nx,0,nz,-nx*a.x-nz*a.z]);}
  return {planes,bounds:[Math.min(...pts.map(p=>p.x)),Math.max(...pts.map(p=>p.x)),lo,hi,Math.min(...pts.map(p=>p.z)),Math.max(...pts.map(p=>p.z))]};
 });
}
