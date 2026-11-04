import * as T from '../../vendor/three.module.js';
import {entranceHost,partMatrix} from './entrances.js';
import {beveledTowerFootprint} from '../parts/coruscant.js';
// Convex hull footprints are used only for room containment, never as visible geometry.
export function hullProfile(p,y=p.position[1]){
 if(!entranceHost(p))return null;const s=p.interior?.shell;if(p.type==='interior'&&!s)return null;
 const height=(s?.height??(p.type==='cor-roundtop-body'?4:1))*p.scale[1];let points=s?.points;
 if(!points&&p.type==='cor-roundtop-body')points=beveledTowerFootprint();
 if(!points&&['round','hex','taper'].includes(p.type)){const n=p.type==='round'?(p.parameters?.sides??24):6,f=p.type==='taper'?1-.4*Math.max(0,Math.min(1,(y-p.position[1])/height)):1;points=Array.from({length:n},(_,i)=>({x:Math.sin(i*2*Math.PI/n)*.5*f,z:Math.cos(i*2*Math.PI/n)*.5*f}));}
 if(!points){const w=s?.width??1,d=s?.depth??1;points=[{x:-w/2,z:-d/2},{x:w/2,z:-d/2},{x:w/2,z:d/2},{x:-w/2,z:d/2}];}
 const matrix=partMatrix(p);return {bottom:p.position[1],top:p.position[1]+height,points:points.map(v=>{const q=new T.Vector3(v.x,0,v.z).applyMatrix4(matrix);return {x:q.x,z:q.z};})};
}
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.z-b.x*a.z;},0)/2;
function subtract(poly,hull){const sign=Math.sign(area(hull)),out=[];let rest=poly;for(let i=0;i<hull.length&&rest.length>=3;i++){const a=hull[i],b=hull[(i+1)%hull.length],inside=[],outside=[],distance=p=>sign*((b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x))+1e-7;for(let j=0;j<rest.length;j++){const p=rest[j],q=rest[(j+1)%rest.length],d=distance(p),e=distance(q);(d>=0?inside:outside).push(p);if((d>=0)!==(e>=0)){const t=d/(d-e),v={x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t};inside.push(v);outside.push(v);}}if(outside.length>=3&&Math.abs(area(outside))>1e-7)out.push(outside);rest=inside;}return out;}
export function roomWithinHulls(points,bottom,top,parts){const profiles=parts.map(p=>({p,h:hullProfile(p)})).filter(v=>v.h),heights=[bottom,top,...profiles.flatMap(({h})=>[h.bottom,h.top]).filter(y=>y>bottom&&y<top)].sort((a,b)=>a-b);for(let i=1;i<heights.length;i++){const lo=heights[i-1],hi=heights[i];let uncovered=[points];for(const {p,h} of profiles){if(h.bottom>lo+1e-5||h.top<hi-1e-5)continue;const polygon=hullProfile(p,hi).points;uncovered=uncovered.flatMap(poly=>subtract(poly,polygon));if(!uncovered.length)break;}if(uncovered.length)return false;}return true;}
export function adjoiningHulls(host,parts){const result=[host],seen=new Set([host.id]);for(let i=0;i<result.length;i++){const a=hullProfile(result[i]);if(!a)continue;const box=h=>new T.Box2().setFromPoints(h.points.map(p=>new T.Vector2(p.x,p.z)));for(const p of parts){if(seen.has(p.id))continue;const b=hullProfile(p);if(!b||b.top<a.bottom||b.bottom>a.top||!box(a).expandByScalar(1e-5).intersectsBox(box(b)))continue;result.push(p);seen.add(p.id);}}return result;}
