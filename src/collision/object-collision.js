import * as T from '../../vendor/three.module.js';
import {buildRoute,anchorRouteGround} from '../routes/stair-route.js';
import {buildHighway} from '../highways/highway-mesh.js';
import {railingBarriers} from './collision-guards.js';
import {objectComponent} from './collision-components.js';
import {weldSurface,cleanCollisionSurface,surfaceSegment,fitBox,fitSphere,fitDetailBox,structuralSegments,collisionNeedsPreservation,assertClosedSurface} from './collision-geometry.js';
import {prepareCollisionSurface,groupCollisionMeshes} from './collision-surface.js';
import {optimizeCollisionBodies} from './collision-optimize.js';

export const COLLISION_RULE_VERSION=16;
// File category bits from the BFII naming convention, not runtime object types.
export const COLLISION_MASK={soldier:1,vehicle:2,building:4,terrain:8,ordnance:16,movement:7,solid:23};
export const COLLISION_RULES=Object.freeze({treeError:.05,solidError:.015,detailError:.1,guardError:.005,meshTarget:1200});
export const collisionPose=part=>new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(1,1,1));

// Read physical triangles without texture projection, colour or material groups.
// Shape generation supplies direction; negative transforms reverse the faces.
export function physicalSurface(mesh,frameInverse){
 const geometry=mesh.geometry,attribute=geometry?.attributes.position;if(!attribute)return {positions:[],triangles:[]};
 const matrix=frameInverse.clone().multiply(mesh.matrixWorld),positions=Array.from({length:attribute.count},(_,i)=>new T.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(matrix).toArray()),index=geometry.index,total=index?.count??attribute.count,triangles=[];
 for(let i=0;i+2<total;i+=3){const t=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(matrix.determinant()<0)[t[1],t[2]]=[t[2],t[1]];const [a,b,c]=t.map(v=>new T.Vector3(...positions[v]));if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18)triangles.push(t);}
 return weldSurface([{positions,triangles}]);
}
function complete(mesh){for(let node=mesh;node;node=node.parent)if(node.userData.referenceOnly)return false;return true;}
function disposeTemporary(group){const geometries=new Set(),materials=new Set();group?.traverse(m=>{if(m.geometry)geometries.add(m.geometry);for(const material of Array.isArray(m.material)?m.material:[m.material])if(material)materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
function rampsFor(part){
 const group=new T.Group();
 if(part.route){const route=structuredClone(part.route);for(const s of route.segments)if(s.kind==='stairs')s.kind='ramp';buildRoute(group,new T.MeshBasicMaterial(),route,part.scale);if(route.segments.some(s=>s.fillToGround))anchorRouteGround(group,{...part,route});}
 else return null;
 group.position.fromArray(part.position);group.rotation.set(...part.rotation);group.scale.fromArray(part.scale);group.updateMatrixWorld(true);return group;
}
function ownership(part,mesh){const component=objectComponent(part,mesh);return {assemblySolid:!!mesh.userData.assemblySolid,role:mesh.userData.interiorStair&&component!=='details'?'interior':component,routeSegment:mesh.userData.routeSegment??null,routePath:mesh.userData.highwayPath??null,interiorStair:mesh.userData.interiorStair??null,routeIndices:mesh.userData.highwaySections??(Number.isInteger(mesh.userData.routeSegment)?[mesh.userData.routeSegment]:[])};}
function surfaceKey(surface){return JSON.stringify(surface.positions.map(p=>p.map(v=>Math.round(v*1e6))));}
function primitiveDeviation(surface,primitive){const inverse=new T.Matrix4().compose(new T.Vector3(...primitive.position),new T.Quaternion(...primitive.rotation),new T.Vector3(1,1,1)).invert(),point=new T.Vector3(),dimensions=primitive.dimensions;let maximum=0;for(const p of surface.positions){point.fromArray(p).applyMatrix4(inverse);const distance=primitive.shape===0?Math.abs(point.length()-dimensions[0]):Math.hypot(...point.toArray().map((v,i)=>Math.max(0,Math.abs(v)-dimensions[i])));maximum=Math.max(maximum,distance);}return maximum;}

// Every body is expressed in the part's position/rotation frame with scale
// already baked. Native boxes cannot carry shear; fitting happens here, never
// in a file exporter. Derived geometry stays outside saved shape parameters.
export function createObjectCollision(part,group,{parts=[],simplify=true}={}){
 group.updateMatrixWorld(true);
 const frame=collisionPose(part),inverse=frame.clone().invert(),bodies=[],seenVolumes=new Set(),seenRamps=new Set(),guards=railingBarriers(part,inverse,parts),seenGuards=new Set(),ramps=rampsFor(part),rampMap=new Map(),embeddedRamps=new Map(),treeSurfaces=new Map();
 let highway=null;
 if(part.highway){highway=new T.Group();buildHighway(highway,new T.MeshBasicMaterial(),part.highway,part,parts,{routeSections:1});highway.position.fromArray(part.position);highway.rotation.set(...part.rotation);highway.scale.fromArray(part.scale);highway.updateMatrixWorld(true);}
 ramps?.traverse(m=>{if(m.isMesh)rampMap.set(m.userData.routeSegment,m);});
 const add=(data,owner)=>bodies.push({id:part.id+':'+bodies.length,partId:part.id,...owner,...data});
 const addSurface=(surface,mask,source,owner,error=COLLISION_RULES.solidError)=>{const reduced=cleanCollisionSurface(surface);if(!reduced.triangles.length)return;add({kind:'mesh',surface:reduced,mask,source,maximumError:error,preserveFaces:source==='tree skin'||source==='railing barrier'||collisionNeedsPreservation(reduced)},owner);};
 const shape=(input,owner,source,{movementOnly=false,detail=false}={})=>{
  const surface=cleanCollisionSurface(input);if(!surface.triangles.length)return;const segments=[surfaceSegment(surface)],primitive=fitBox(segments,{thickness:part.interior?.slab??.08})??fitSphere(segments)??(detail?fitDetailBox(segments):null);
  const error=source==='railing barrier'?COLLISION_RULES.guardError:COLLISION_RULES.solidError;
  if(!primitive){addSurface(surface,movementOnly?COLLISION_MASK.movement:COLLISION_MASK.solid,source,owner,error);return;}
  let closed=true;try{assertClosedSurface(surface);}catch{closed=false;}
  const deviation=primitiveDeviation(surface,primitive),precise=!!primitive.inferredThicknessMetres||closed&&deviation<=error;
  if(closed&&!precise&&!(detail&&deviation<=COLLISION_RULES.detailError)){addSurface(surface,movementOnly?COLLISION_MASK.movement:COLLISION_MASK.solid,source,owner,error);return;}
  add({kind:'primitive',primitive,mask:movementOnly||!precise?COLLISION_MASK.movement:COLLISION_MASK.solid,source,maximumPrimitiveErrorMetres:deviation},owner);
  if(!movementOnly&&!precise)addSurface(surface,COLLISION_MASK.ordnance,source+' ordnance',owner);
 };
 try{
  const process=mesh=>{
   if(!mesh.isMesh||!complete(mesh)||part.type==='waterfall')return;
   const owner=ownership(part,mesh),surface=physicalSurface(mesh,inverse);mesh.userData.collisionOwner=owner;
   if(mesh.userData.floraBillboard||mesh.userData.floraComponent&&mesh.userData.floraComponent!=='bark')return;
   const guardIndex=mesh.userData.routeSegment??null;
   if(owner.role==='details'&&guards.has(guardIndex)&&!seenGuards.has(guardIndex)){seenGuards.add(guardIndex);for(const s of guards.get(guardIndex))shape(s,owner,'railing barrier',{movementOnly:true});}
   if(mesh.userData.floraComponent==='bark'&&part.flora){const key=JSON.stringify(owner);if(!treeSurfaces.has(key))treeSurfaces.set(key,{owner,surfaces:[]});treeSurfaces.get(key).surfaces.push(surface);return;}
   let movementMesh=mesh;
   if(mesh.userData.routeFloor&&part.route?.segments[mesh.userData.routeSegment]?.kind==='stairs'&&rampMap.has(mesh.userData.routeSegment))movementMesh=rampMap.get(mesh.userData.routeSegment);
   if(mesh.userData.interiorStair&&mesh.userData.routeCollision){const profile=mesh.userData.routeCollision;if(!embeddedRamps.has(profile.route)){const r={...part,route:profile.route,scale:profile.scale},temporary=rampsFor(r);embeddedRamps.set(profile.route,temporary);}const temporary=embeddedRamps.get(profile.route),original=temporary?.children.find(m=>m.userData.routeSegment===profile.index);if(original){movementMesh=new T.Mesh(original.geometry,mesh.material);movementMesh.matrixWorld.copy(mesh.matrixWorld);}}
   const volume=structuralSegments(mesh,inverse),volumeKey=volume&&surfaceKey(volume[0]);if(volumeKey&&seenVolumes.has(volumeKey))return;if(volumeKey)seenVolumes.add(volumeKey);
   const movement=volume?weldSurface(volume):movementMesh===mesh?surface:physicalSurface(movementMesh,inverse),detail=!!(mesh.userData.railing||mesh.userData.highwayRailing||mesh.userData.routePost);
   // Painted top/underside meshes still share one movement ramp. Retaining a
   // second identical shell wastes contacts and makes its shadow nonmanifold.
   if(movementMesh===mesh||!seenRamps.has(movementMesh)){shape(movement,owner,detail?'railing profile':volume?'construction volume':movementMesh!==mesh?'stair ramp':'solid shape',{movementOnly:movementMesh!==mesh,detail});if(movementMesh!==mesh)seenRamps.add(movementMesh);}
   if(movementMesh!==mesh)addSurface(surface,COLLISION_MASK.ordnance,'stair treads',owner);
  };
  group.traverse(mesh=>{if(!highway||!mesh.userData.highwayPath)process(mesh);});
  highway?.traverse(process);
  for(const {owner,surfaces} of treeSurfaces.values())addSurface(weldSurface(surfaces),COLLISION_MASK.solid,'tree skin',owner,COLLISION_RULES.treeError);
  const optimized=optimizeCollisionBodies(bodies),grouped=groupCollisionMeshes(optimized.bodies);optimized.bodies=simplify?grouped.flatMap(b=>b.surface?prepareCollisionSurface(b,{target:COLLISION_RULES.meshTarget}):[b]):grouped;
  return {version:COLLISION_RULE_VERSION,space:'part-frame',status:'ready',partId:part.id,scale:[...part.scale],bodies:optimized.bodies,stats:{...optimized.stats,primitives:optimized.bodies.filter(b=>b.kind==='primitive').length,triangles:optimized.bodies.reduce((n,b)=>n+(b.surface?.triangles.length??0),0)}};
 }finally{disposeTemporary(ramps);disposeTemporary(highway);for(const temporary of embeddedRamps.values())disposeTemporary(temporary);}
}
export function transformCollisionBody(body,matrix){
 const result={...body};
 if(body.primitive){const p=body.primitive,q=new T.Quaternion().setFromRotationMatrix(matrix);result.primitive={...p,position:new T.Vector3(...p.position).applyMatrix4(matrix).toArray(),rotation:q.multiply(new T.Quaternion(...p.rotation)).toArray()};}
 if(body.surface)result.surface={...body.surface,positions:body.surface.positions.map(p=>new T.Vector3(...p).applyMatrix4(matrix).toArray()),triangles:body.surface.triangles.map(t=>matrix.determinant()<0?[t[0],t[2],t[1]]:[...t])};
 return result;
}
