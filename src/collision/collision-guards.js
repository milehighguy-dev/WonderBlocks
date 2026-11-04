import * as T from '../../vendor/three.module.js';
import {routeLayout} from '../routes/stair-route.js';
import {defaultRailing,landingRailEdges} from '../routes/railings.js';
import {curveMeshPoint,curvePanelCount} from '../routes/curved-route.js';
import {platformRailSpans} from '../platforms/platform.js';

// Walking barriers follow semantic guarded boundaries, rather than filling
// arbitrary holes in visible meshes. Projectile collision keeps the real rails.
export function railingBarriers(part,frameInverse,parts=[]){
 const result=new Map(),world=new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.scale));
 function slab(index,a,b,height,thickness,native=false){
  a=a.clone().applyMatrix4(world);b=b.clone().applyMatrix4(world);
  const along=b.clone().sub(a),normal=new T.Vector3(-along.z,0,along.x).normalize().multiplyScalar(thickness/2),lift=native?new T.Vector3(0,height,0).applyMatrix3(new T.Matrix3().setFromMatrix4(world)):new T.Vector3(0,height,0);
  if(normal.lengthSq()<1e-12)return;
  const lower=[a.clone().add(normal),b.clone().add(normal),b.clone().sub(normal),a.clone().sub(normal)];
  const vertices=lower.map(p=>p.clone().addScaledVector(lift,-.02/Math.max(.02,lift.length()))).concat(lower.map(p=>p.clone().add(lift)));
  const center=vertices.reduce((p,q)=>p.add(q),new T.Vector3()).divideScalar(8),triangles=[];
  for(const quad of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]){
   const [a,b,c]=quad.map(i=>vertices[i]),normal=b.clone().sub(a).cross(c.clone().sub(a)),mid=quad.reduce((p,i)=>p.add(vertices[i]),new T.Vector3()).divideScalar(4);
   if(normal.dot(mid.sub(center))<0)quad.reverse();triangles.push([quad[0],quad[1],quad[2]],[quad[0],quad[2],quad[3]]);
  }
  const surface={positions:vertices.map(p=>p.applyMatrix4(frameInverse).toArray()),triangles};
  if(frameInverse.determinant()<0)surface.triangles=surface.triangles.map(t=>[t[0],t[2],t[1]]);
  if(!result.has(index))result.set(index,[]);result.get(index).push(surface);
 }
 if(part.route&&part.type!=='wall-route')for(const l of routeLayout(part.route)){
  const s=l.segment,r={...defaultRailing(),...s.railing};if(s.hallway||r.style==='none'||r.style==='solid'||r.style==='yavin-aqueduct')continue;
  const edges=s.kind==='landing'||!s.rise?landingRailEdges(part.route,l,l.index):[{a:[l.width/2,0],b:[l.width/2,s.run],side:'left'},{a:[-l.width/2,0],b:[-l.width/2,s.run],side:'right'}];
  const native=['kotor-kashyyyk','kashyyyk-timber','kashyyyk-suspension'].includes(r.style);
  const point=(x,z)=>{const y=s.kind==='landing'?0:(s.rise??0)*z/s.run,[cx,cy,cz]=curveMeshPoint(x,y,z,s.run,s.curveAngle??0);return new T.Vector3(l.start[0]+Math.cos(l.heading)*cx+Math.sin(l.heading)*cz,l.start[1]+cy,l.start[2]-Math.sin(l.heading)*cx+Math.cos(l.heading)*cz);};
  for(const e of edges){if(r.sides!=='both'&&e.side!==r.sides&&e.side!=='both')continue;
   const cuts=[0,1],dz=e.b[1]-e.a[1];if(s.curveAngle&&Math.abs(dz)>1e-8)for(let i=1;i<curvePanelCount(s);i++){const t=(i*s.run/curvePanelCount(s)-e.a[1])/dz;if(t>1e-8&&t<1-1e-8)cuts.push(t);}cuts.sort((a,b)=>a-b);
   for(let i=1;i<cuts.length;i++){const at=t=>point(T.MathUtils.lerp(e.a[0],e.b[0],t),T.MathUtils.lerp(e.a[1],e.b[1],t));slab(l.index,at(cuts[i-1]),at(cuts[i]),r.height,Math.max(.04,r.railWidth),native);}
  }
 }
 if(part.platform&&part.platform.railing!=='none'&&part.platform.railing!=='solid')for(const [a,b] of platformRailSpans(part,parts))slab(null,a,b,part.platform.railHeight,.08,part.platform.railing==='kotor-kashyyyk');
 return result;
}
