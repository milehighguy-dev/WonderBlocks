import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {prepareAssemblyCollisions} from '../src/collision/assembly-collision.js';
import {collisionPose} from '../src/collision/object-collision.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {readyObjectCollisions,collisionCacheStats} from '../src/collision/collision-service.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';
import {entranceFixture} from './fixtures/entrance-fixture.js';
import {connectedInteriorDraft,saveConnectedInterior} from '../src/interiors/connected-interior.js';

const block=(id,position=[0,0,0],scale=[4,4,4],rotation=[0,0,0])=>({...makePart('block',{position,scale,rotation}),id,assemblyId:'solid-test'});
const project=parts=>({format:'open-building-studio',version:1,name:'Solid object group',parts});
const bodies=roots=>roots.flatMap(r=>r.userData.collision.bodies);
const built=parts=>parts.map(p=>buildPart(p,{parts,batch:true,collision:'sync'}));
function inBox(body,point){const p=body.primitive;return point.clone().applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.rotation),new T.Vector3(1,1,1)).invert()).toArray().every((v,i)=>Math.abs(v)<=p.dimensions[i]+1e-7);}
function occupied(parts,roots,point){return roots.some(root=>{const local=point.clone().applyMatrix4(collisionPose(parts.find(p=>p.id===root.userData.partId)).invert());return root.userData.collision.bodies.some(b=>b.primitive&&inBox(b,local));});}
function hit(roots,origin,direction,far=100,mask=1){return createWalkCollision(roots,{mask}).firstHit(new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,far));}

test('grouped touching, overlapping and contained blocks become one exact primitive',()=>{
 for(const offset of [0,2,4]){const parts=[block('a'),block('b',[offset,0,0]),block('c',[0,1,0],[1,1,1])],roots=built(parts),original=roots.map(r=>JSON.stringify(r.userData.collision));
  try{prepareAssemblyCollisions(parts,roots);assert.equal(bodies(roots).length,1);assert.equal(bodies(roots)[0].mask,23);assert.equal(bodies(roots)[0].kind,'primitive');assert.deepEqual(roots.map(r=>JSON.stringify(r.userData.objectCollision)),original);
   assert.equal(hit(roots,[-5,2,0],[1,0,0]).distance,3);assert.equal(hit(roots,[offset+5,2,0],[-1,0,0]).distance,3);
  }finally{roots.forEach(disposePart);}
 }
});
test('an L-shaped box union is disjoint and cannot fill its concave notch or nearby gaps',()=>{
 const parts=[block('a',[0,0,0],[6,4,2]),block('b',[-2,0,2],[2,4,6]),block('c',[8,0,0],[2,4,2])],roots=built(parts),original=built(parts);
 try{prepareAssemblyCollisions(parts,roots);assert.ok(bodies(roots).every(b=>b.primitive));
  for(let x=-4;x<10;x+=.23)for(let z=-2;z<6;z+=.29)assert.equal(occupied(parts,roots,new T.Vector3(x,2,z)),occupied(parts,original,new T.Vector3(x,2,z)));
  assert.equal(occupied(parts,roots,new T.Vector3(1,2,3)),false);assert.equal(occupied(parts,roots,new T.Vector3(5,2,0)),false);
  const leader=roots[0],active=leader.userData.collision.bodies;for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const a=active[i].primitive,b=active[j].primitive;assert.ok(a.position.some((v,axis)=>Math.abs(v-b.position[axis])>=a.dimensions[axis]+b.dimensions[axis]-1e-6),'primitives must not overlap in volume');}
 }finally{[...roots,...original].forEach(disposePart);}
});
test('independently rotated and mirrored overlapping blocks remove buried mesh faces',()=>{
 const parts=[block('a'),block('b',[1,0,0],[-4,4,4],[0,.7,0])],roots=built(parts);
 try{prepareAssemblyCollisions(parts,roots);const solid=bodies(roots);assert.ok(solid.every(b=>b.surface));assert.equal(solid.filter(b=>b.partId==='b').length,0);
  for(const body of solid)for(const triangle of body.surface.triangles){const center=triangle.reduce((v,i)=>v.add(new T.Vector3(...body.surface.positions[i])),new T.Vector3()).divideScalar(3);for(const p of parts){const local=center.clone().applyMatrix4(collisionPose(p).invert());assert.ok(![local.x,local.y-p.scale[1]/2,local.z].every((v,i)=>Math.abs(v)<Math.abs(p.scale[i])/2-1e-4),'no face should remain strictly inside a member');}}
  assert.ok(hit(roots,[-8,2,0],[1,0,0]));assert.ok(hit(roots,[8,2,0],[-1,0,0]));
 }finally{roots.forEach(disposePart);}
});
test('one interior crossing block seams retains clear movement and projectile passages',()=>{
 for(const offset of [8,10])for(const angle of [0,.7]){
  const original=entranceFixture().parts[0],neighbor=block('neighbor',[offset,0,0],[10,18,9]),rotation=new T.Matrix4().makeRotationY(angle);original.assemblyId=neighbor.assemblyId;
  for(const p of [original,neighbor]){p.position=new T.Vector3(...p.position).applyMatrix4(rotation).toArray();p.rotation[1]=angle;}
  const draft=connectedInteriorDraft(original,original.entrances[0],[original,neighbor]);draft.part.interior.rooms[0].w=13;
  const source=saveConnectedInterior(draft,draft.part.interior),parts=[source,neighbor],roots=built(parts);
  try{prepareAssemblyCollisions(parts,roots);assert.ok(bodies(roots).some(b=>b.source==='object group solid'));for(const mask of [1,2,16]){const collision=createWalkCollision(roots,{mask}),ray=(p,d,far)=>new T.Raycaster(new T.Vector3(...p).applyMatrix4(rotation),new T.Vector3(...d).transformDirection(rotation),0,far);
    assert.equal(collision.firstHit(ray([0,11,2],[1,0,0],9.8)),null);const wall=collision.firstHit(ray([0,11,2],[1,0,0],11));assert.ok(wall);assert.ok(Math.abs(wall.distance-9.9)<.02);assert.ok(collision.firstHit(ray([7,10.5,2],[0,-1,0],.51)));
   }
  }finally{roots.forEach(disposePart);}
 }
});
test('hiding, ungrouping and moving members restore the appropriate physical solid',()=>{
 const parts=[block('a'),block('b',[4,0,0])],roots=built(parts);
 try{prepareAssemblyCollisions(parts,roots);assert.equal(bodies(roots).length,1);const first=roots[0].userData.collision;prepareAssemblyCollisions(parts,roots);assert.equal(roots[0].userData.collision,first);
  roots[0].visible=false;prepareAssemblyCollisions(parts,roots);assert.equal(hit(roots,[-5,2,0],[1,0,0]).distance,7);roots[0].visible=true;
  roots[1].position.x=10;prepareAssemblyCollisions(parts,roots);assert.equal(bodies(roots).length,2);assert.equal(hit(roots,[3,2,0],[1,0,0]).distance,5);parts[1].position[0]=10;
  for(const p of parts)delete p.assemblyId;prepareAssemblyCollisions(parts,roots);assert.ok(roots.every(r=>r.userData.collision===r.userData.objectCollision));
 }finally{roots.forEach(disposePart);}
});
test('disconnected oblique members keep their exact primitives and separate ownership',()=>{
 const parts=[block('a',[3,0,2],[-2,3,1],[.2,.4,0]),block('b',[6,0,2],[2,1,1])],roots=built(parts);
 try{prepareAssemblyCollisions(parts,roots);assert.equal(bodies(roots).length,2);assert.ok(bodies(roots).every(b=>b.primitive));assert.ok(roots.every(r=>r.userData.collision===r.userData.objectCollision));}finally{roots.forEach(disposePart);}
});
test('moving a whole object group reuses its solid in the member frame',()=>{
 const parts=[block('a'),block('b',[4,0,0])],roots=built(parts);
 try{prepareAssemblyCollisions(parts,roots);const state=roots[0].userData.collision,rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.7),offset=new T.Vector3(40,3,-12);
  for(const root of roots){root.position.applyQuaternion(rotation).add(offset);root.quaternion.premultiply(rotation);}prepareAssemblyCollisions(parts,roots);assert.equal(roots[0].userData.collision,state);
  const origin=new T.Vector3(-5,2,0).applyQuaternion(rotation).add(offset),direction=new T.Vector3(1,0,0).applyQuaternion(rotation);assert.ok(Math.abs(hit(roots,origin.toArray(),direction.toArray()).distance-3)<1e-6);
 }finally{roots.forEach(disposePart);}
});
test('removing an interior rebuilds the solid and closes the former passage',()=>{
 const original=entranceFixture().parts[0],neighbor=block('neighbor',[10,0,0],[10,18,9]);original.assemblyId=neighbor.assemblyId;
 const draft=connectedInteriorDraft(original,original.entrances[0],[original,neighbor]);draft.part.interior.rooms[0].w=13;const source=saveConnectedInterior(draft,draft.part.interior),parts=[source,neighbor],roots=built(parts);
 try{prepareAssemblyCollisions(parts,roots);assert.equal(hit(roots,[0,11,2],[1,0,0],9.8),null);delete source.entranceInteriors;delete source.entrances;const restored=built(parts);try{prepareAssemblyCollisions(parts,restored);assert.ok(occupied(parts,restored,new T.Vector3(0,11,2)),'the former room must be solid volume');}finally{restored.forEach(disposePart);}}finally{roots.forEach(disposePart);}
});
test('prepared object group export reuses the shared solid without building collision',async()=>{
 const parts=[block('a'),block('b',[4,0,0])],roots=built(parts);
 try{prepareAssemblyCollisions(parts,roots);const source=await readyObjectCollisions(roots),before=collisionCacheStats().builds,output=createSWBF2Package(project(parts),{shadows:false,lowDetail:false},{collisionSource:source});assert.equal(collisionCacheStats().builds,before);assert.equal(output.manifest.assets.reduce((n,a)=>n+a.primitiveCollision,0),1);
  const direct=planSWBF2(project(parts),{shadows:false,lowDetail:false});assert.equal(direct.assets.reduce((n,a)=>n+a.primitives.length,0),1);
  roots[0].visible=false;prepareAssemblyCollisions(parts,roots);const complete=prepareAssemblyCollisions(parts,roots,{assign:false,includeHidden:true});assert.equal([...complete.values()].flatMap(s=>s.bodies).length,1);assert.equal(roots[1].userData.collision,roots[1].userData.objectCollision);
 }finally{roots.forEach(disposePart);}
});
