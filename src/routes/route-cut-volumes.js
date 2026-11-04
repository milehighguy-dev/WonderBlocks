import * as T from '../../vendor/three.module.js';
import {partMatrix} from '../interiors/entrances.js';
import {routeLayout,segmentThickness,isFlatSegment} from './stair-route.js';
import {angledTurn,angledLanding} from './angled-landing.js';
import {curveMeshPoint,curvePanelCount} from './curved-route.js';
import {DEFAULT_HALLWAY_HEIGHT} from './route-defaults.js';

// Convex swept cells follow the same footprint and facets as the route meshes.
// Work in world space: hallway headroom stays fixed when the object is scaled.
function prism(points,bottom,top){
 const low=points.map(p=>p.clone().add(new T.Vector3(0,-bottom,0))),high=points.map(p=>p.clone().add(new T.Vector3(0,top,0))),vertices=[...low,...high],center=vertices.reduce((a,p)=>a.add(p),new T.Vector3()).multiplyScalar(1/vertices.length);
 const plane=(a,b,c)=>{const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();let d=-n.dot(a);if(n.dot(center)+d<0){n.negate();d=-d;}return [...n.toArray(),d];};
 const planes=[plane(...low.slice(0,3)),plane(...high.slice(0,3))];
 if(points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).dot(new T.Vector3(0,1,0))**2<1e-16)return null;
 for(let i=0;i<points.length;i++){const j=(i+1)%points.length;planes.push(plane(low[i],low[j],high[i]));}
 return {planes,bounds:[Math.min(...vertices.map(p=>p.x)),Math.max(...vertices.map(p=>p.x)),Math.min(...vertices.map(p=>p.y)),Math.max(...vertices.map(p=>p.y)),Math.min(...vertices.map(p=>p.z)),Math.max(...vertices.map(p=>p.z))]};
}
export function routeCutVolumes(part){
 if(part.type!=='stair-route'||!part.route||!part.route.cutThroughSolids&&!part.route.segments.some(s=>s.hallway||s.cutThroughSolids))return [];
 const matrix=partMatrix(part),volumes=[];
 for(const l of routeLayout(part.route)){
  const s=l.segment;if(!s.hallway&&!(s.cutThroughSolids??part.route.cutThroughSolids))continue;
  const world=([x,z],parameter=z)=>{const y=isFlatSegment(s)?0:s.rise*parameter/s.run;return new T.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z).applyMatrix4(matrix);};
  const step=s.kind==='stairs'?Math.abs(s.rise/s.steps*part.scale[1]):0;
  const bottom=segmentThickness(part.route,s)*Math.abs(part.scale[1])+step+.03,top=(s.hallway?.height??s.cutHeight??part.route.cutHeight??DEFAULT_HALLWAY_HEIGHT)+(s.hallway?.thickness??0)+step+.03;
  if(s.curveAngle){const n=curvePanelCount(s);for(let i=0;i<n;i++){const z0=i*s.run/n,z1=(i+1)*s.run/n;const p=[[-l.width/2,z0],[l.width/2,z0],[l.width/2,z1],[-l.width/2,z1]].map(([x,z])=>{const q=curveMeshPoint(x,0,z,s.run,s.curveAngle);return world([q[0],q[2]],z);});volumes.push(prism([p[0],p[1],p[2]],bottom,top),prism([p[0],p[2],p[3]],bottom,top));}}
  else if(angledTurn(s)){const points=angledLanding(l).points,triangles=T.ShapeUtils.triangulateShape(points.map(p=>new T.Vector2(...p)),[]);for(const ids of triangles)volumes.push(prism(ids.map(i=>world(points[i])),bottom,top));}
  else{const returning=s.turn.startsWith('return-'),width=returning?l.width+l.nextWidth+l.gap:l.width,shift=returning?(s.turn==='return-right'?-1:1)*(l.nextWidth+l.gap)/2:0;volumes.push(prism([[shift-width/2,0],[shift+width/2,0],[shift+width/2,s.run],[shift-width/2,s.run]].map(p=>world(p)),bottom,top));}
 }
 return volumes.filter(Boolean);
}
