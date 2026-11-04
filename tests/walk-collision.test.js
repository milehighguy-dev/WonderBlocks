import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {firstWalkHit,hitNormal,moveWalker,verticalWalker,cameraPosition} from '../src/walk/walk-physics.js';
import {disposePart} from '../src/core/geometry.js';

function same(a,b){assert.equal(!!a,!!b);if(!a)return;assert.equal(a.object,b.object);assert.ok(Math.abs(a.distance-b.distance)<1e-7);assert.ok(a.point.distanceTo(b.point)<1e-7);assert.ok(hitNormal(a).distanceTo(hitNormal(b))<1e-7);assert.equal(a.face.materialIndex,b.face.materialIndex);}
function box(w,h,d,x=0,y=0,z=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());m.position.set(x,y,z);return m;}

test('collision index matches native rays with transforms, material sides, groups, ranges and visibility',()=>{
 const root=new T.Group();root.position.set(3,-2,1);root.rotation.y=.3;root.scale.set(1.2,.8,-1.5);
 for(let i=0;i<6;i++){const geometry=new T.BoxGeometry(3,2,2),materials=Array.from({length:6},(_,j)=>new T.MeshBasicMaterial({side:[T.FrontSide,T.BackSide,T.DoubleSide][j%3]}));if(i%2)geometry.setDrawRange(6,24);const mesh=new T.Mesh(i%3?geometry:geometry.toNonIndexed(),materials);mesh.position.set(i*4-10,i%2*3,0);mesh.rotation.set(.1*i,.2*i,.3*i);root.add(mesh);}
 root.updateMatrixWorld(true);const index=createWalkCollision([root]);let seed=12345;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<800;i++){const origin=new T.Vector3(random()*35-15,random()*12-5,random()*20-10),target=new T.Vector3(random()*25-10,random()*6-3,0).applyMatrix4(root.matrixWorld),ray=new T.Raycaster(origin,target.sub(origin).normalize(),i%7*.2,i%5?60:3);ray.layers.mask=i%23?1:2;const accept=i%3===0?h=>hitNormal(h).y>.55:i%3===1?h=>Math.abs(hitNormal(h).y)<.55:()=>true;same(firstWalkHit([root],ray,accept),firstWalkHit(index,ray,accept));}
 root.children[2].visible=false;root.children[3].userData.referenceOnly=true;
 for(const mesh of root.children){const center=new T.Vector3().setFromMatrixPosition(mesh.matrixWorld),ray=new T.Raycaster(center.clone().add(new T.Vector3(0,10,0)),new T.Vector3(0,-1,0));same(firstWalkHit([root],ray),firstWalkHit(index,ray));}
 disposePart(root);
});

test('indexed walker retains wall, step, ceiling and camera behaviour, including fast sweeps',()=>{
 const floor=box(20,.2,20,0,-.1,0),step=box(2,.3,2,0,.15,1.5),ceiling=box(8,.2,8,0,2.15,1),wall=box(10,4,.04,0,2,4),roots=[floor,step,ceiling,wall],index=createWalkCollision(roots);
 for(const delta of [new T.Vector3(0,0,1.5),new T.Vector3(0,0,8),new T.Vector3(3,0,4)])assert.ok(moveWalker(roots,new T.Vector3(),delta,2).distanceTo(moveWalker(index,new T.Vector3(),delta,2))<1e-8);
 ceiling.visible=false;assert.ok(moveWalker(roots,new T.Vector3(),new T.Vector3(0,0,1.5),2).distanceTo(moveWalker(index,new T.Vector3(),new T.Vector3(0,0,1.5),2))<1e-8);
 let a={feet:new T.Vector3(),velocity:0},b={feet:new T.Vector3(),velocity:0};for(let i=0;i<100;i++){a=verticalWalker(roots,a.feet,a.velocity,.05,i<40,2);b=verticalWalker(index,b.feet,b.velocity,.05,i<40,2);assert.ok(a.feet.distanceTo(b.feet)<1e-8);assert.equal(a.velocity,b.velocity);}
 const target=new T.Vector3(0,1,3),desired=new T.Vector3(0,1,8);assert.ok(cameraPosition(roots,target,desired).distanceTo(cameraPosition(index,target,desired))<1e-8);roots.forEach(disposePart);
});

test('short collision rays skip distant dense meshes',()=>{
 const roots=[box(20,.2,20,0,-.1,0),box(.2,4,8,2,2,0)];
 for(let i=0;i<30;i++){const mesh=new T.Mesh(new T.SphereGeometry(10,40,24),new T.MeshBasicMaterial());mesh.position.set(60+i*20,15,80);roots.push(mesh);}
 const index=createWalkCollision(roots),point=new T.Vector3(0,1,0);
 try{for(const direction of [new T.Vector3(0,-1,0),new T.Vector3(1,0,0),new T.Vector3(-1,0,0),new T.Vector3(0,0,1),new T.Vector3(0,0,-1)]){
  const ray=new T.Raycaster(point,direction,0,2);same(firstWalkHit(roots,ray),firstWalkHit(index,ray));
  assert.ok(index.stats.trianglesTested<1000,'only nearby triangles are tested');assert.ok(index.stats.meshesTested<4,'distant meshes are rejected before triangle testing');
 }}finally{roots.forEach(disposePart);}
});

test('each walk session indexes the current geometry without modifying source buffers',()=>{
 const m=box(4,.2,4),source=m.geometry.attributes.position.array.slice(),indices=m.geometry.index.array.slice(),first=createWalkCollision([m]),ray=new T.Raycaster(new T.Vector3(0,5,0),new T.Vector3(0,-1,0));same(firstWalkHit([m],ray),firstWalkHit(first,ray));assert.deepEqual(m.geometry.attributes.position.array,source);assert.deepEqual(m.geometry.index.array,indices);
 m.geometry.translate(0,2,0);m.position.x=1;const next=createWalkCollision([m]);same(firstWalkHit([m],ray),firstWalkHit(next,ray));disposePart(m);
});
