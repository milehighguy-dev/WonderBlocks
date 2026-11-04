import * as T from '../../vendor/three.module.js';
import {COLLISION_MASK} from '../collision/object-collision.js';
import {assertClosedSurface,weldSurface} from '../collision/collision-geometry.js';

// Walk mode freezes scene editing. Build an exact triangle index once on entry,
// without replacing render geometry or changing general editor raycasting.
function visible(object){for(let o=object;o;o=o.parent)if(!o.visible||o.userData.referenceOnly||o.material?.userData?.walkCollision===false)return false;return true;}
function tree(items,leafSize=12){
 if(!items.length)return null;
 const box=new T.Box3();for(const item of items)box.union(item.box);
 if(items.length<=leafSize)return {box,items};
 const size=box.getSize(new T.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
 items.sort((a,b)=>a.center[axis]-b.center[axis]);const half=items.length>>1;
 return {box,left:tree(items.slice(0,half),leafSize),right:tree(items.slice(half),leafSize)};
}
function interval(ray,box,near,far){
 for(const axis of ['x','y','z']){
  const d=ray.direction[axis],o=ray.origin[axis];
  if(Math.abs(d)<1e-15){if(o<box.min[axis]||o>box.max[axis])return false;continue;}
  let a=(box.min[axis]-o)/d,b=(box.max[axis]-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(far<near)return false;
 }return true;
}
function triangles(geometry){
 const pos=geometry.attributes.position,index=geometry.index,count=index?.count??pos.count,items=[];
 for(let i=0;i<count;i+=3){
  const indices=[0,1,2].map(k=>index?index.getX(i+k):i+k),points=indices.map(n=>new T.Vector3().fromBufferAttribute(pos,n)),box=new T.Box3().setFromPoints(points);
  items.push({offset:i,indices,points,box,center:box.getCenter(new T.Vector3())});
 }return tree(items);
}
const surfaceIndexes=new WeakMap();
const closedSurfaces=new WeakMap();
const partitionSkins=new WeakMap();
function surfaceTriangles(surface){if(surfaceIndexes.has(surface))return surfaceIndexes.get(surface);const items=surface.triangles.map(indices=>{const points=indices.map(i=>new T.Vector3(...surface.positions[i])),box=new T.Box3().setFromPoints(points);return {indices,points,box,center:box.getCenter(new T.Vector3()),offset:0};}),index=tree(items);surfaceIndexes.set(surface,index);return index;}
function objectFrame(root,collision){return root.matrixWorld.clone().multiply(new T.Matrix4().makeScale(...collision.scale.map(v=>1/v)));}
function primitiveBounds(p){const matrix=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.rotation),new T.Vector3(1,1,1)),box=new T.Box3(new T.Vector3(...p.dimensions).negate(),new T.Vector3(...p.dimensions));return box.applyMatrix4(matrix);}
export function createWalkCollision(roots,{mask=COLLISION_MASK.soldier}={}){
 const geometries=new Map(),colliders=[],fallback=[],seen=new Set();
 for(const root of roots){if(!visible(root))continue;root.updateWorldMatrix(true,true);
  if(root.userData.collision){
   const collision=root.userData.collision,frame=objectFrame(root,collision);
   for(const body of collision.bodies){if(!(body.mask&mask))continue;
    const mesh={visible:true,parent:root,layers:root.layers,material:{side:T.FrontSide},matrixWorld:frame,userData:{collisionBody:body.id}},local=body.surface?surfaceTriangles(body.surface):null,localBox=local?.box??primitiveBounds(body.primitive),box=localBox.clone().applyMatrix4(frame);
    colliders.push({mesh,body,collision,local,matrix:frame,inverse:frame.clone().invert(),box,center:box.getCenter(new T.Vector3())});
   }
   continue;
  }
  root.traverse(mesh=>{
  if(!mesh.isMesh||seen.has(mesh)||!visible(mesh)||!mesh.geometry?.attributes.position)return;seen.add(mesh);
  if(mesh.isSkinnedMesh||mesh.isInstancedMesh||mesh.morphTargetInfluences?.some(Boolean)){fallback.push(mesh);return;}
  const geometry=mesh.geometry;if(!geometries.has(geometry))geometries.set(geometry,triangles(geometry));const local=geometries.get(geometry);if(!local)return;
  const matrix=mesh.matrixWorld.clone(),box=local.box.clone().applyMatrix4(matrix);
  colliders.push({mesh,local,matrix,inverse:matrix.clone().invert(),box,center:box.getCenter(new T.Vector3())});
 });}
 const hierarchy=tree(colliders,4),stats={queries:0,meshesTested:0,trianglesTested:0,primitivesTested:0};let containmentHierarchy;
 function containmentIndex(){
  if(containmentHierarchy!==undefined)return containmentHierarchy;
  const items=[],groups=new Map();
  for(const c of colliders){if(!c.body?.contactPartition||!c.body.surface){items.push(c);continue;}const root=c.mesh.parent;if(!groups.has(root))groups.set(root,new Map());const key=c.body.mask+'|'+c.body.collisionGroup.replace(/\|\d+$/,'');if(!groups.get(root).has(key))groups.get(root).set(key,[]);groups.get(root).get(key).push(c);}
  for(const group of groups.values())for(const [key,pieces] of group){const first=pieces[0];if(!partitionSkins.has(first.collision))partitionSkins.set(first.collision,new Map());const cache=partitionSkins.get(first.collision);
   // Spatial pieces are views of the same prepared skin, not separate solids.
   // Rejoin them only for this read-only query; collision records and ordinary
   // ray/contact indexes retain their original small spatial partitions.
   if(!cache.has(key))cache.set(key,weldSurface(pieces.map(c=>c.body.surface)));const surface=cache.get(key),local=surfaceTriangles(surface),box=local.box.clone().applyMatrix4(first.matrix);items.push({...first,body:{...first.body,surface},local,box,center:box.getCenter(new T.Vector3())});
  }
  containmentHierarchy=tree(items,4);return containmentHierarchy;
 }
 return {stats,containsPoint(point,{openSkins=false,excludeOpenSkin=()=>false}={}){
  // A short ray starting inside a large solid need not reach a face. This
  // read-only winding query lets navigation reject embedded walking samples.
  function contains(c){
   if(!visible(c.mesh))return false;
   const p=point.clone().applyMatrix4(c.inverse);
   if(c.body?.primitive){const body=c.body.primitive,matrix=new T.Matrix4().compose(new T.Vector3(...body.position),new T.Quaternion(...body.rotation),new T.Vector3(1,1,1));p.applyMatrix4(matrix.invert());return body.shape===0?p.length()<body.dimensions[0]-.00001:p.toArray().every((v,i)=>Math.abs(v)<body.dimensions[i]-.00001);}
   const surface=c.body?.surface;if(!surface||!c.local)return false;
   if(!closedSurfaces.has(surface)){let closed=true;try{assertClosedSurface(surface);}catch{closed=false;}closedSurfaces.set(surface,closed);}
   // Native bark can have uncapped tips, and carving produces open skins.
   // Navigation may infer solid bark only with agreeing signed crossings,
   // while explicitly excluding the shape's known passage/room cut volumes.
   const closed=closedSurfaces.get(surface);if(!closed&&(!openSkins||c.body.source!=='tree skin'||excludeOpenSkin(c.body,c.mesh.parent)))return false;
   function winding(direction){const ray=new T.Ray(p,direction.normalize()),hits=[];
   function visit(node){if(!interval(ray,node.box,.00001,Infinity))return;if(!node.items){visit(node.left);visit(node.right);return;}for(const tri of node.items){const [a,b,c]=tri.points,hit=ray.intersectTriangle(a,b,c,false,new T.Vector3());if(!hit||hit.distanceTo(p)<.00001)continue;hits.push({distance:hit.distanceTo(p),sign:Math.sign(T.Triangle.getNormal(a,b,c,new T.Vector3()).dot(ray.direction))});}}
   visit(c.local);hits.sort((a,b)=>a.distance-b.distance);let sum=0,previous=-Infinity,sign=0;for(const h of hits){if(h.distance-previous>.00001){sum+=Math.sign(sign);sign=h.sign;previous=h.distance;}else sign+=h.sign;}return sum+Math.sign(sign)>0;}
   return winding(new T.Vector3(1,.173,.319))&&(closed||winding(new T.Vector3(-.419,.137,1))&&winding(new T.Vector3(-1,-.193,-.271)));
  }
  function visit(node){if(!node||!node.box.containsPoint(point))return false;if(node.items)return node.items.some(c=>c.box.containsPoint(point)&&contains(c));return visit(node.left)||visit(node.right);}return visit(containmentIndex());
 },firstHit(raycaster,accept=()=>true){
  stats.queries++;let best=null,limit=raycaster.far;
  const consider=hit=>{if(hit.distance>=raycaster.near&&hit.distance<=limit&&accept(hit)){best=hit;limit=hit.distance;}};
  function meshHits(c){
   const mesh=c.mesh;if(!visible(mesh)||!mesh.layers.test(raycaster.layers))return;stats.meshesTested++;
   const ray=raycaster.ray.clone().applyMatrix4(c.inverse),factor=raycaster.ray.direction.clone().applyMatrix3(new T.Matrix3().setFromMatrix4(c.inverse)).length(),range=mesh.geometry?.drawRange??{start:0,count:Infinity};
   if(c.body?.primitive){
    stats.primitivesTested++;const p=c.body.primitive,transform=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.rotation),new T.Vector3(1,1,1)),primitiveRay=ray.clone().applyMatrix4(transform.clone().invert()),point=new T.Vector3();
    const hit=p.shape===0?primitiveRay.intersectSphere(new T.Sphere(new T.Vector3(),p.dimensions[0]),point):primitiveRay.intersectBox(new T.Box3(new T.Vector3(...p.dimensions).negate(),new T.Vector3(...p.dimensions)),point);
    if(hit){let normal;if(p.shape===0)normal=point.clone().normalize();else{const distances=point.toArray().map((v,i)=>Math.abs(Math.abs(v)-p.dimensions[i])),axis=distances.indexOf(Math.min(...distances));normal=new T.Vector3().setComponent(axis,Math.sign(point.getComponent(axis)));}normal.applyQuaternion(new T.Quaternion(...p.rotation));const world=point.applyMatrix4(transform).applyMatrix4(c.matrix);consider({distance:world.distanceTo(raycaster.ray.origin),point:world,object:mesh,face:{normal,materialIndex:0}});}return;
   }
   function visit(node){
    if(!interval(ray,node.box,raycaster.near*factor,limit*factor))return;
    if(!node.items){visit(node.left);visit(node.right);return;}
    for(const tri of node.items){
     if(tri.offset<range.start||tri.offset+2>=range.start+range.count)continue;
     const groups=Array.isArray(mesh.material)?mesh.geometry.groups.filter(g=>tri.offset>=g.start&&tri.offset+2<g.start+g.count):[{materialIndex:0}];
     for(const group of groups){const material=Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material;if(!material)continue;stats.trianglesTested++;
      const [a,b,c]=tri.points,point=new T.Vector3(),hit=material.side===T.BackSide?ray.intersectTriangle(c,b,a,true,point):ray.intersectTriangle(a,b,c,material.side===T.FrontSide,point);if(!hit)continue;
      const world=point.clone().applyMatrix4(mesh.matrixWorld),distance=world.distanceTo(raycaster.ray.origin);if(distance<raycaster.near||distance>limit)continue;
      consider({distance,point:world,object:mesh,faceIndex:tri.offset/3,face:{a:tri.indices[0],b:tri.indices[1],c:tri.indices[2],normal:T.Triangle.getNormal(a,b,c,new T.Vector3()),materialIndex:group.materialIndex}});
     }
    }
   }visit(c.local);
  }
  function visit(node){if(!node||!interval(raycaster.ray,node.box,raycaster.near,limit))return;if(node.items){for(const c of node.items)if(interval(raycaster.ray,c.box,raycaster.near,limit))meshHits(c);}else{visit(node.left);visit(node.right);}}
  visit(hierarchy);
  for(const mesh of fallback)if(visible(mesh)&&mesh.layers.test(raycaster.layers)){const hits=[];mesh.raycast(raycaster,hits);for(const hit of hits)consider(hit);}
  return best;
 }};
}
