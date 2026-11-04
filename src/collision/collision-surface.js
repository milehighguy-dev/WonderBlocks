import * as T from '../../vendor/three.module.js';
import {weldSurface,collisionNeedsPreservation} from './collision-geometry.js';
import {simplifySurface} from '../parts/surface-simplify.js';

// Conservative preparation target, NOT the engine's contact-container size.
// Export recommendations use the separate native-capacity/contact review.
export const COLLISION_CONTACT_TRIANGLES=64;
const contactBudget=COLLISION_CONTACT_TRIANGLES;
function index(surface){
 const points=surface.positions.map(p=>new T.Vector3(...p)),items=surface.triangles.map((t,i)=>{const triangle=new T.Triangle(...t.map(v=>points[v])),box=new T.Box3().setFromPoints([triangle.a,triangle.b,triangle.c]);return {triangle,box,center:triangle.getMidpoint(new T.Vector3()),index:i};});
 function tree(items){const box=new T.Box3();for(const item of items)box.union(item.box);if(items.length<=12)return {box,items};const span=box.getSize(new T.Vector3()),axis=span.x>=span.y&&span.x>=span.z?'x':span.y>=span.z?'y':'z';items.sort((a,b)=>a.center[axis]-b.center[axis]);const at=items.length>>1;return {box,left:tree(items.slice(0,at)),right:tree(items.slice(at))};}
 const root=items.length?tree([...items]):null,point=new T.Vector3();
 function nearest(query){let distance=Infinity;function visit(node){if(node.box.distanceToPoint(query)>=distance)return;if(node.items){for(const item of node.items)distance=Math.min(distance,item.triangle.closestPointToPoint(query,point).distanceTo(query));}else{const a=node.left.box.distanceToPoint(query),b=node.right.box.distanceToPoint(query);visit(a<b?node.left:node.right);visit(a<b?node.right:node.left);}}if(root)visit(root);return distance;}
 function overlap(box,limit=Infinity){let count=0;function visit(node){if(count>limit||!node.box.intersectsBox(box))return;if(node.items){for(const item of node.items)if(item.box.intersectsBox(box))count++;}else{visit(node.left);visit(node.right);}}if(root)visit(root);return count;}
 return {root,items,nearest,overlap};
}
function sampledDistance(from,target,limit){const query=new T.Vector3();let max=0;for(const p of from.positions){max=Math.max(max,target.nearest(query.fromArray(p)));if(max>limit)return max;}for(const t of from.triangles){query.set(0,0,0);for(const v of t)query.add(new T.Vector3(...from.positions[v]));max=Math.max(max,target.nearest(query.multiplyScalar(1/3)));if(max>limit)return max;}return max;}
export function collisionSurfaceDensity(surface){
 if(surface.triangles.length<=contactBudget)return {maximumContactTriangles:surface.triangles.length,partitionRequired:false};
 const lookup=index(surface),normal=new T.Vector3(),center=new T.Vector3(),box=new T.Box3();let maximum=0;
 // Enclosing cubes keep these checks independent of object orientation. The
 // vehicle envelope covers ordinary tanks/speeders; arbitrary larger vehicles
 // still need runtime validation. Crowded regions are partitioned until this
 // representative contact budget is met; pieces with <=64 total triangles
 // fit the native buffer for any query size.
 const profiles=[[1.25,1.25,1.25],[6,6,6],[.35,1.1,.35],[2,2,4],[4,2,2],[4,2,4]];
 for(const half of profiles)for(const item of lookup.items){item.triangle.getNormal(normal);const support=half.reduce((sum,h,i)=>sum+h*Math.abs(normal.getComponent(i)),0);center.copy(item.center).addScaledVector(normal,support);box.min.copy(center).sub(new T.Vector3(...half)).addScalar(-.001);box.max.copy(center).add(new T.Vector3(...half)).addScalar(.001);maximum=Math.max(maximum,lookup.overlap(box,contactBudget));if(maximum>contactBudget)return {maximumContactTriangles:maximum,partitionRequired:true};}
 return {maximumContactTriangles:maximum,partitionRequired:false};
}
function partitions(surface){
 const faces=surface.triangles.map((t,i)=>({index:i,center:t.reduce((p,v)=>p.add(new T.Vector3(...surface.positions[v])),new T.Vector3()).divideScalar(3)})),result=[];
 function subset(items){const used=new Map(),positions=[],triangles=items.map(({index})=>surface.triangles[index].map(v=>{if(!used.has(v)){used.set(v,positions.length);positions.push(surface.positions[v]);}return used.get(v);}));return {positions,triangles};}
 function split(items){const piece=subset(items),density=collisionSurfaceDensity(piece);if(!density.partitionRequired){result.push({surface:piece,density});return;}
  const box=new T.Box3().setFromPoints(items.map(f=>f.center)),span=box.getSize(new T.Vector3()),axis=span.x>=span.y&&span.x>=span.z?'x':span.y>=span.z?'y':'z';items.sort((a,b)=>a.center[axis]-b.center[axis]||a.index-b.index);const mid=items.length>>1;split(items.slice(0,mid));split(items.slice(mid));
 }split(faces);return result;
}
export function prepareCollisionSurface(body,{target=1200}={}){
 const original=body.surface,error=body.maximumError??.015,diagonal=index(original).root?.box.getSize(new T.Vector3()).length()??0;
 const dense=!!(body.mask&3)&&collisionSurfaceDensity(original).partitionRequired;
 // A nominal total budget does not reduce a small but locally crowded object.
 // Try the contact budget in that case; the geometric error and topology limits
 // still decide which faces can actually be removed.
 const budget=Math.min(target,dense?contactBudget:diagonal<4?90:target,original.triangles.length);
 let surface=simplifySurface(original,budget,{maximumError:error}),sampledError=0;
 if(surface.triangles.length<original.triangles.length){const source=index(original),reduced=index(surface);sampledError=Math.max(sampledDistance(original,reduced,error),sampledDistance(surface,source,error));if(sampledError>error){surface=original;sampledError=0;}}
 const density=body.mask&3?collisionSurfaceDensity(surface):{maximumContactTriangles:0,partitionRequired:false},parts=density.partitionRequired?partitions(surface):[{surface,density}];
 return parts.map(({surface,density},i)=>({...body,id:parts.length>1?body.id+':'+i:body.id,surface,collisionGroup:body.partId+'|'+[body.role,body.routePath,body.routeSegment,body.interiorStair].join('|')+(parts.length>1?'|'+i:''),preserveFaces:parts.length>1||body.source==='tree skin'||body.source==='railing barrier'||collisionNeedsPreservation(surface),sampledErrorMetres:sampledError,maximumContactTriangles:density.maximumContactTriangles,contactPartition:parts.length>1,contactPartitionTriangles:parts.length>1&&surface.triangles.length<=contactBudget?contactBudget:undefined,contactEnvelopeHalfSizes:parts.length>1?[1.25,6]:undefined}));
}
export function groupCollisionMeshes(bodies){
 const groups=new Map(),result=[];
 for(const body of bodies){if(!body.surface){result.push(body);continue;}const key=[body.mask,body.role,body.routePath,body.routeSegment,body.interiorStair,!!body.assemblySolid].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(body);}
 for(const entries of groups.values()){const first=entries[0];result.push({...first,collisionGroup:first.partId+'|'+[first.role,first.routePath,first.routeSegment,first.interiorStair].join('|'),surface:entries.length===1?first.surface:weldSurface(entries.map(b=>b.surface)),maximumError:Math.min(...entries.map(b=>b.maximumError)),source:entries.every(b=>b.source===first.source)?first.source:'composite shape',sourceBodyIds:entries.flatMap(b=>b.sourceBodyIds??[b.id])});}
 return result;
}
