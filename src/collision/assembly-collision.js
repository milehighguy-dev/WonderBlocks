import * as T from '../../vendor/three.module.js';
import {objectComponent} from './collision-components.js';
import {physicalSurface,transformCollisionBody,COLLISION_RULES} from './object-collision.js';
import {assertClosedSurface,boxSurface,cleanCollisionSurface,weldSurface} from './collision-geometry.js';
import {optimizeCollisionBodies} from './collision-optimize.js';
import {prepareCollisionSurface} from './collision-surface.js';

const epsilon=1e-6,cache=new Map(),identities=new WeakMap();let sequence=0;
const identity=value=>{if(!identities.has(value))identities.set(value,++sequence);return identities.get(value);};
const bounds=surface=>new T.Box3().setFromPoints(surface.positions.map(p=>new T.Vector3(...p)));
const rootFrame=entry=>entry.root.matrixWorld.clone().multiply(new T.Matrix4().makeScale(...entry.state.scale.map(v=>1/v)));

function convexVolume(surface){
 try{assertClosedSurface(surface);}catch{return null;}
 if(!surface.triangles.length)return null;
 const points=surface.positions.map(p=>new T.Vector3(...p)),planes=[];
 for(const triangle of surface.triangles){const [a,b,c]=triangle.map(i=>points[i]),normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-18)continue;normal.normalize();const d=-normal.dot(a);
  if(points.some(p=>normal.dot(p)+d>epsilon))return null;
  if(!planes.some(p=>p.normal.dot(normal)>1-1e-10&&Math.abs(p.constant-d)<epsilon))planes.push(new T.Plane(normal,d));
 }
 return planes.length>=4?{planes,box:bounds(surface)}:null;
}

// Keep the uncut construction envelope. Interior voids are already subtracted
// from every member, so clipping their remaining shells against these envelopes
// removes buried seams without filling a passage or authoring a new interior.
export function rememberAssemblyHull(part,group){
 if(!part.assemblyId||part.interior||part.interiorProp||part.route||part.highway||part.platform||part.flora||part.metaballs)return;
 group.updateMatrixWorld(true);const hulls=[];
 group.traverse(mesh=>{if(!mesh.isMesh||objectComponent(part,mesh)!=='exterior')return;mesh.userData.assemblySolid=true;const surface=physicalSurface(mesh,new T.Matrix4());if(convexVolume(surface))hulls.push(surface);});
 group.userData.assemblyHull=hulls;
}

function split(poly,plane){
 const inside=[],outside=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];let da=plane.distanceToPoint(a),db=plane.distanceToPoint(b);if(Math.abs(da)<epsilon)da=0;if(Math.abs(db)<epsilon)db=0;
  (da<=0?inside:outside).push(a);if((da<=0)!==(db<=0)){const p=a.clone().lerp(b,da/(da-db));inside.push(p);outside.push(p);}
 }
 return {inside,outside};
}
function outside(poly,volume,normal,keepCoincident){
 if(volume.planes.some(plane=>poly.every(p=>plane.distanceToPoint(p)>epsilon)))return [poly];
 // Equal outward faces belong to one stable member. Opposite faces at a
 // touching seam are buried and disappear on both sides.
 if(keepCoincident&&volume.planes.some(plane=>normal.dot(plane.normal)>1-1e-8&&poly.every(p=>Math.abs(plane.distanceToPoint(p))<=epsilon)))return [poly];
 const result=[];let remaining=poly;
 for(const plane of volume.planes){if(remaining.length<3)break;const divided=split(remaining,plane);if(divided.outside.length>=3)result.push(divided.outside);remaining=divided.inside;}
 return result;
}
function exposedSurface(surface,owner,volumes){
 const positions=[],triangles=[],box=bounds(surface),candidates=volumes.filter(v=>v.owner!==owner&&v.box.intersectsBox(box));
 for(const triangle of surface.triangles){const original=triangle.map(i=>new T.Vector3(...surface.positions[i])),normal=original[1].clone().sub(original[0]).cross(original[2].clone().sub(original[0])).normalize();let polygons=[original];
  for(const volume of candidates){polygons=polygons.flatMap(poly=>outside(poly,volume,normal,owner<volume.owner));if(!polygons.length)break;}
  for(const poly of polygons)for(let i=1;i<poly.length-1;i++){const start=positions.length;positions.push(poly[0].toArray(),poly[i].toArray(),poly[i+1].toArray());triangles.push([start,start+1,start+2]);}
 }
 return {positions,triangles};
}

function subtractBox(box,other){
 const low=box.min.map((v,i)=>Math.max(v,other.min[i])),high=box.max.map((v,i)=>Math.min(v,other.max[i]));if(low.some((v,i)=>high[i]-v<=epsilon))return [box];
 const pieces=[],remaining={min:[...box.min],max:[...box.max]};
 for(let axis=0;axis<3;axis++){
  if(low[axis]-remaining.min[axis]>epsilon){const piece={min:[...remaining.min],max:[...remaining.max]};piece.max[axis]=low[axis];pieces.push(piece);remaining.min[axis]=low[axis];}
  if(remaining.max[axis]-high[axis]>epsilon){const piece={min:[...remaining.min],max:[...remaining.max]};piece.min[axis]=high[axis];pieces.push(piece);remaining.max[axis]=high[axis];}
 }
 return pieces;
}
// An exact union of boxes with common axes stays primitive based. Disjoint
// subtraction avoids a Cartesian voxel grid and never bridges an air gap.
function boxUnion(bodies){
 if(!bodies.every(b=>b.primitive?.shape===4&&b.mask===23))return null;
 const rotation=new T.Quaternion(...bodies[0].primitive.rotation),inverse=rotation.clone().invert(),boxes=[];
 for(const body of bodies){const p=body.primitive,relative=new T.Matrix4().makeRotationFromQuaternion(inverse.clone().multiply(new T.Quaternion(...p.rotation)));
  for(let axis=0;axis<3;axis++){const v=new T.Vector3().setFromMatrixColumn(relative,axis).toArray();if(!v.some(x=>Math.abs(Math.abs(x)-1)<1e-8))return null;}
  const points=boxSurface(p).positions.map(p=>new T.Vector3(...p).applyQuaternion(inverse)),box=new T.Box3().setFromPoints(points);boxes.push({min:box.min.toArray(),max:box.max.toArray()});
 }
 const union=[];
 for(const box of boxes){let pieces=[box];for(const other of union){pieces=pieces.flatMap(piece=>subtractBox(piece,other));if(!pieces.length)break;}union.push(...pieces);}
 const template=bodies[0],result=union.map((box,i)=>({...template,id:template.partId+':assembly:'+i,source:'object group solid',primitive:{shape:4,rotation:rotation.toArray(),position:new T.Vector3(...box.min.map((v,i)=>(v+box.max[i])/2)).applyQuaternion(rotation).toArray(),dimensions:box.max.map((v,i)=>(v-box.min[i])/2)}}));
 return optimizeCollisionBodies(result).bodies;
}

function fuse(entries){
 const leader=entries[0],frame=rootFrame(leader),inverse=frame.clone().invert(),eligible=[],volumes=[],retained=new Map();
 for(const entry of entries){const {part,root,state}=entry,matrix=inverse.clone().multiply(rootFrame(entry));retained.set(part.id,[]);
  for(const surface of root.userData.assemblyHull){const moved={positions:surface.positions.map(p=>new T.Vector3(...p).applyMatrix4(root.matrixWorld).applyMatrix4(inverse).toArray()),triangles:surface.triangles.map(t=>root.matrixWorld.determinant()<0?[t[0],t[2],t[1]]:[...t])},volume=convexVolume(moved);if(volume)volumes.push({...volume,owner:part.id});}
  for(const body of state.bodies){if(body.assemblySolid&&body.role==='exterior'&&body.mask===23&&(!body.primitive||body.primitive.shape===4)&&body.source!=='tree skin')eligible.push({...transformCollisionBody(body,matrix),member:part.id});else retained.get(part.id).push(body);}
 }
 if(eligible.length<2||!volumes.length)return null;
 let fused=boxUnion(eligible);
 if(!fused){const surfaces=eligible.map(body=>exposedSurface(body.surface??boxSurface(body.primitive),body.member,volumes)),surface=cleanCollisionSurface(weldSurface(surfaces));
  fused=surface.triangles.length?prepareCollisionSurface({...eligible[0],id:leader.part.id+':assembly',partId:leader.part.id,kind:'mesh',primitive:undefined,surface,source:'object group solid',maximumError:COLLISION_RULES.solidError,preserveFaces:true},{target:COLLISION_RULES.meshTarget}):[];
 }
 const sourceBodyIds=eligible.flatMap(b=>b.sourceBodyIds??[b.id]),sourcePartIds=entries.map(e=>e.part.id);
 // Keep the resulting solid on a stable member's rigid frame. Other components
 // (interior lining, props, stairs) retain their original ownership and masks.
 const bodies=fused.map(body=>({...body,partId:leader.part.id,sourceBodyIds,sourcePartIds,assemblyId:leader.part.assemblyId,collisionGroup:'assembly:'+leader.part.assemblyId+'|'+leader.part.id+'|'+(body.collisionGroup??body.id)}));retained.get(leader.part.id).push(...bodies);
 const result=new Map();
 for(const {part,state} of entries){const own=retained.get(part.id);result.set(part.id,{...state,status:'ready',bodies:own,assemblyId:part.assemblyId,assemblyMembers:sourcePartIds,stats:{...state.stats,primitives:own.filter(b=>b.primitive).length,triangles:own.reduce((sum,b)=>sum+(b.surface?.triangles.length??0),0),assemblySourceBodies:eligible.length,assemblySolidBodies:fused.length}});}
 return result;
}

// Scene creation/editing calls this, not the serializer. Original member state
// stays available for ungrouping, hiding members and full-scene export snapshots.
export function prepareAssemblyCollisions(parts,roots,{assign=true,includeHidden=false}={}){
 if(assign&&!includeHidden&&roots.some(root=>!root.visible))prepareAssemblyCollisions(parts,roots,{assign:false,includeHidden:true});
 const byId=new Map(parts.map(p=>[p.id,p])),groups=new Map(),result=new Map();
 for(const root of roots){const part=byId.get(root.userData.partId);if(!part)continue;root.updateWorldMatrix(true,true);const state=root.userData.objectCollision??root.userData.collision;if(!state)continue;root.userData.objectCollision=state;result.set(part.id,state);
  if(!part.assemblyId||!root.userData.assemblyHull||!includeHidden&&!root.visible||root.scale.toArray().some((v,i)=>Math.abs(v-state.scale[i])>epsilon))continue;
  if(!groups.has(part.assemblyId))groups.set(part.assemblyId,[]);groups.get(part.assemblyId).push({part,root,state});
 }
 const components=[];
 for(const entries of groups.values()){
  const pending=entries.map(entry=>({...entry,box:entry.root.userData.assemblyHull.reduce((box,surface)=>box.union(bounds(surface).applyMatrix4(entry.root.matrixWorld)),new T.Box3())}));
  while(pending.length){const component=[pending.shift()];for(let i=0;i<component.length;i++)for(let j=pending.length-1;j>=0;j--)if(component[i].box.intersectsBox(pending[j].box)){component.push(pending[j]);pending.splice(j,1);}components.push(component);}
 }
 for(const entries of components){if(entries.length<2)continue;entries.sort((a,b)=>a.part.id.localeCompare(b.part.id));const relative=rootFrame(entries[0]).invert(),key=JSON.stringify(entries.map(e=>[e.part.id,e.part.assemblyId,identity(e.state),relative.clone().multiply(e.root.matrixWorld).elements.map(v=>Math.round(v*1e6))]));let prepared=cache.get(key);
  if(!prepared){prepared=fuse(entries);if(prepared){cache.set(key,prepared);if(cache.size>32)cache.delete(cache.keys().next().value);}}
  if(prepared)for(const [id,state] of prepared)result.set(id,state);
 }
 if(assign)for(const root of roots){const state=result.get(root.userData.partId);if(state)root.userData.collision=state;}
 return result;
}
