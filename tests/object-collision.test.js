import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {defaultRoute} from '../src/routes/stair-route.js';
import {defaultInterior} from '../src/interiors/interior.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {COLLISION_MASK} from '../src/collision/object-collision.js';
import {createObjectCollision} from '../src/collision/object-collision.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';

function built(part,options={},check){const root=buildPart(part,options);try{return check(root.userData.collision,root);}finally{disposePart(root);}}
test('new blocks own exact primitive collision shared across applicable categories',()=>{
 const part=makePart('block',{position:[4,3,-7],rotation:[.2,.4,.1],scale:[-2,3,4]});
 built(part,{},collision=>{assert.equal(collision.status,'ready');assert.equal(collision.bodies.length,1);const body=collision.bodies[0];assert.equal(body.kind,'primitive');assert.equal(body.mask,COLLISION_MASK.solid);assert.equal(body.primitive.shape,4);assert.deepEqual([...body.primitive.dimensions].sort((a,b)=>a-b),[1,1.5,2]);});
});
test('render batching and material colour do not change object collision',()=>{
 const part=makePart('pillar',{scale:[2,6,2]}),first=built(part,{},c=>JSON.stringify(c));
 part.color='#ff0033';assert.equal(built(part,{batch:true},c=>JSON.stringify(c)),first);
});
test('stair objects create movement ramps and retain projectile tread profiles',()=>{
 const route=defaultRoute();route.segments=[{kind:'stairs',run:8,rise:3,steps:16,turn:'straight',railing:{style:'none'}}];
 built(makePart('stair-route',{route}),{},collision=>{assert.ok(collision.bodies.some(b=>b.source==='stair ramp'&&b.mask===COLLISION_MASK.movement));assert.ok(collision.bodies.some(b=>b.source==='stair treads'&&b.mask===COLLISION_MASK.ordnance));const movement=collision.bodies.filter(b=>b.mask&COLLISION_MASK.soldier);assert.ok(movement.every(b=>b.kind!=='mesh'||b.surface.triangles.length<20));});
});
test('interior doors are not replaced with enclosing primitive boxes',()=>{
 const interior=defaultInterior();interior.doors=[{axis:'x',line:0,offset:3,width:1.2,height:2.2}];
 built(makePart('interior',{interior}),{batch:true},collision=>{assert.ok(collision.stats.primitives>4);const point=new T.Vector3(3,1,0);for(const b of collision.bodies.filter(b=>b.primitive)){const p=b.primitive,matrix=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.rotation),new T.Vector3(1,1,1)),local=point.clone().applyMatrix4(matrix.invert());assert.ok(!local.toArray().every((v,i)=>Math.abs(v)<p.dimensions[i]-1e-5));}});
});
test('trees own one skin collision serving movement and ordnance without internal primitives',()=>{
 built(makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),{batch:true},collision=>{assert.ok(collision.bodies.length);assert.ok(collision.bodies.every(b=>b.kind==='mesh'&&b.source==='tree skin'&&b.mask===COLLISION_MASK.solid));assert.equal(collision.stats.primitives,0);});
});

test('rounded shapes use primitives only when their physical surface stays within tolerance',()=>{
 for(const [radius,kind] of [[.1,'primitive'],[3,'mesh']]){
  const part=makePart('block'),group=new T.Group(),geometry=new T.SphereGeometry(radius,16,12);group.add(new T.Mesh(geometry,new T.MeshBasicMaterial()));
  try{const collision=createObjectCollision(part,group);assert.ok(collision.bodies.length);assert.ok(collision.bodies.every(b=>b.kind===kind&&b.mask===23));if(kind==='primitive')assert.ok(collision.bodies[0].maximumPrimitiveErrorMetres<=.015);else assert.equal(collision.stats.primitives,0);}finally{disposePart(group);}
 }
});

test('solid containment queries respect reflected primitives, concave mesh holes and visibility',()=>{
 const part=makePart('block',{position:[4,3,-7],rotation:[.2,.4,.1],scale:[-2,3,4]});
 built(part,{},(_collision,root)=>{const index=createWalkCollision([root]),point=new T.Vector3(0,.5,0).applyMatrix4(root.matrixWorld);assert.equal(index.containsPoint(point),true);assert.equal(index.containsPoint(new T.Vector3(5,.5,0).applyMatrix4(root.matrixWorld)),false);root.visible=false;assert.equal(index.containsPoint(point),false);});
 const meshPart=makePart('block'),root=new T.Group();root.add(new T.Mesh(new T.TorusGeometry(2,.4,12,24),new T.MeshBasicMaterial()));root.userData.collision=createObjectCollision(meshPart,root);
 try{assert.ok(root.userData.collision.bodies.every(b=>b.surface));const before=JSON.stringify(root.userData.collision),index=createWalkCollision([root]);assert.equal(index.containsPoint(new T.Vector3(2,0,0)),true);assert.equal(index.containsPoint(new T.Vector3()),false,'the central hole remains empty');assert.equal(index.containsPoint(new T.Vector3(3,0,0)),false);assert.equal(JSON.stringify(root.userData.collision),before);}finally{disposePart(root);}
});

test('open bark containment requires agreeing crossings and honors prepared void exclusions',()=>{
 const part=makePart('flora'),root=new T.Group(),mesh=new T.Mesh(new T.CylinderGeometry(8,10,30,16,1,true),new T.MeshBasicMaterial());mesh.userData.floraComponent='bark';root.add(mesh);root.userData.collision=createObjectCollision(part,root);
 try{const before=JSON.stringify(root.userData.collision),index=createWalkCollision([root]),point=new T.Vector3();assert.equal(index.containsPoint(point),false);assert.equal(index.containsPoint(point,{openSkins:true}),true);assert.equal(index.containsPoint(new T.Vector3(15,0,0),{openSkins:true}),false);assert.equal(index.containsPoint(point,{openSkins:true,excludeOpenSkin:()=>true}),false);assert.equal(JSON.stringify(root.userData.collision),before);}finally{disposePart(root);}
});

test('Endor crown collision fits the native vehicle contact buffer at the observed failure location',()=>{
 built(makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),{},collision=>{
  const center=new T.Vector3(.1973280793,7.7992487717,-4.247209283),half=new T.Vector3(2,2,4),query=new T.Box3(center.clone().sub(half),center.clone().add(half));
  for(const body of collision.bodies.filter(b=>b.mask&2)){const surface=body.surface,count=surface.triangles.filter(t=>new T.Box3().setFromPoints(t.map(v=>new T.Vector3(...surface.positions[v]))).intersectsBox(query)).length;assert.ok(count<=99,'the native buffer previously received 115 triangles at this contact');}
 });
});

test('rectangular sheets use their inferred slab for shots from either side',()=>{
 const part=makePart('block'),group=new T.Group(),geometry=new T.PlaneGeometry(4,3);group.add(new T.Mesh(geometry,new T.MeshBasicMaterial()));try{const state=createObjectCollision(part,group);assert.equal(state.bodies.length,1);assert.equal(state.bodies[0].kind,'primitive');assert.equal(state.bodies[0].mask,23);assert.equal(state.bodies[0].primitive.inferredThicknessMetres,.08);group.userData.collision=state;const index=createWalkCollision([group],{mask:16});for(const sign of [-1,1]){const ray=new T.Raycaster(new T.Vector3(0,0,sign),new T.Vector3(0,0,-sign),0,2);assert.ok(index.firstHit(ray),'the physical sheet blocks a projectile from both sides');}}finally{disposePart(group);}
});
