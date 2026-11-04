import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject,PARTS} from '../src/core/model.js';
import {partControls} from '../src/editor/part-controls.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {defaultHallway} from '../src/routes/hallway.js';
const hit=(g,origin,direction,far=20)=>{g.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,far).intersectObject(g,true);};

test('ring body has an open center, straight inside/outside walls and flat solid rims',()=>{
 const p=makePart('ring-body'),g=buildPart(p);
 assert.equal(PARTS.find(d=>d.id===p.type).category,'Bodies');
 assert.equal(hit(g,[0,2,0],[0,-1,0]).length,0);
 assert.equal(hit(g,[0,-1,0],[0,1,0]).length,0);
 for(const [origin,direction,expected] of [ [[.42,2,0],[0,-1,0],1],[[.42,-1,0],[0,1,0],1],[[1,.5,0],[-1,0,0],.5],[[0,.5,0],[1,0,0],.35] ]){
  const hits=hit(g,origin,direction);assert.ok(hits.length);assert.ok(Math.abs(hits[0].distance-expected)<1e-6);
 }
 const top=hit(g,[.42,2,0],[0,-1,0])[0];assert.ok(top.face.normal.z>.999,'rim has a hard flat normal before its mesh rotation');
 disposePart(g);
});

test('ring thickness saves, rejects invalid values, and scales into a tall hollow shaft',()=>{
 const p=makePart('ring-body',{scale:[40,80,40],parameters:{wallThickness:10},surface:{preset:'stone',scale:1}});
 const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Shaft',parts:[p]}))).parts[0];
 assert.equal(saved.parameters.wallThickness,10);assert.equal(partControls(p.type).find(c=>c.key==='wallThickness').default,15);
 for(const batch of [false,true]){
  const g=buildPart(saved,{batch}),bounds=new T.Box3().setFromObject(g);bounds.getSize(new T.Vector3()).toArray().forEach((v,i)=>assert.ok(Math.abs(v-[40,80,40][i])<1e-6));
  assert.equal(hit(g,[0,100,0],[0,-1,0],110).length,0);
  assert.ok(Math.abs(hit(g,[0,40,0],[1,0,0])[0].distance-16)<1e-5);
  g.traverse(m=>{if(m.isMesh)for(const a of Object.values(m.geometry.attributes))assert.ok([...a.array].every(Number.isFinite));});
  disposePart(g);
 }
 for(const value of [0,50,NaN]){p.parameters.wallThickness=value;assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Bad',parts:[p]}));}
});

test('an enclosed hallway carves a passage through the ring wall and leaves adjacent wall intact',()=>{
 const p=makePart('ring-body',{scale:[10,8,10]}),r=makePart('stair-route',{position:[0,1,0],route:{width:2,thickness:.2,gap:.2,segments:[{kind:'landing',run:8,rise:0,steps:1,turn:'straight',hallway:defaultHallway()}]}});
 for(const batch of [false,true]){
  const whole=buildPart(p,{batch}),cut=buildPart(p,{batch,parts:[p,r]});
  assert.ok(hit(whole,[0,3,0],[0,0,1],8).length);
  assert.equal(hit(cut,[0,3,0],[0,0,1],8).length,0);
  assert.ok(hit(cut,[2,3,0],[0,0,1],8).length);
  assert.ok(hit(cut,[0,7,0],[0,0,1],8).length);
  disposePart(whole);disposePart(cut);
 }
});

const triangles=g=>{let count=0;g.traverse(m=>{if(m.isMesh)count+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});return count;};
test('round and ring bodies save discrete side choices with consistent defaults and matching hull boundaries',async()=>{
 const {hullProfile}=await import('../src/interiors/hull-network.js');
 for(const type of ['round','ring-body']){
  const control=partControls(type).find(c=>c.key==='sides');assert.deepEqual(control.options,[12,24,48]);assert.equal(control.default,24);
  for(const sides of control.options){
   const p=makePart(type,{parameters:{sides}}),saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Resolution',parts:[p]}))).parts[0],g=buildPart(saved);
   assert.equal(saved.parameters.sides,sides);assert.equal(triangles(g),sides*8);
   if(type==='round')assert.equal(hullProfile(saved,.5).points.length,sides);
   disposePart(g);
  }
  for(const sides of [13,36,24.5])assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Invalid',parts:[makePart(type,{parameters:{sides}})]}));
 }
});
test('the ring adds vertical subdivisions only for deformation and retains its hollow center',()=>{
 for(const shape of [undefined,{taper:0,bulge:0,twist:0},{bulge:.2},{twist:25},{taper:.2}]){
  const g=buildPart(makePart('ring-body',{shape})),deformed=shape&&Object.values(shape).some(Boolean);
  assert.equal(triangles(g),deformed?384:192);
  assert.equal(hit(g,[0,2,0],[0,-1,0]).length,0);
  if(shape?.bulge)assert.ok(hit(g,[1,.5,0],[-1,0,0])[0].point.x>.55,'bulge has intermediate vertices');
  disposePart(g);
 }
});
