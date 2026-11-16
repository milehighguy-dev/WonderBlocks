import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {defaultRoute} from '../src/routes/stair-route.js';
import {planSWBF2,createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {storeysFixture} from './fixtures/storeys-fixture.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Construction LOD',parts});
const count=root=>{let n=0;root.traverse(m=>{if(m.isMesh)n+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});return n;};
const settings={aiNavigation:false,includeCollision:false,shadows:false};

test('distant stair flights are built as complete ramps, including descending and curved flights',()=>{
 for(const rise of [3,-3])for(const curveAngle of [0,Math.PI/2,-Math.PI/2]){
  const route=defaultRoute();route.width=5;route.segments=[{kind:'stairs',run:12,rise,steps:32,turn:'straight',curveAngle}];
  const part=makePart('stair-route',{route}),before=JSON.stringify(part),full=buildPart(part,{collision:false}),low=buildPart(part,{collision:false,lowDetail:true});
  try{
   assert.ok(count(low)<count(full)/2);
   const floors=low.children.filter(m=>m.userData.routeFloor);assert.equal(floors.length,1);
   // Every generated top triangle lies on the ramp; no individual tread shelves.
   if(!curveAngle){const g=floors[0].geometry.index?floors[0].geometry.toNonIndexed():floors[0].geometry.clone(),p=g.attributes.position;
    for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2),normal=T.Triangle.getNormal(a,b,c,new T.Vector3());if(normal.y>.5)for(const v of [a,b,c])assert.ok(Math.abs(v.y-rise*v.z/12)<1e-5);}
    g.dispose();
   }
   low.updateMatrixWorld(true);const box=new T.Box3().setFromObject(low),high=new T.Box3().setFromObject(full);assert.ok(Math.abs(box.min.y-high.min.y)<.11&&Math.abs(box.max.y-high.max.y)<.11);
   assert.equal(JSON.stringify(part),before);
  }finally{disposePart(full);disposePart(low);}
 }
});

test('platform LODs retain native deck atlas charts, rims and cutouts exactly',()=>{
 for(const style of ['plain','kashyyyk-timber','kashyyyk-thatched','kotor-kashyyyk']){
  const part=makePart('platform');part.platform.style=style;part.platform.railing='none';part.platform.sections[0].kind='circle';part.platform.sections[0].width=12;part.platform.sections[0].depth=12;
  const plan=planSWBF2(project([part]),settings),asset=plan.assets.find(a=>a.role==='exterior');
  const normalized=segments=>segments.map(s=>({...s,material:plan.materials[s.material].texture}));
  assert.deepEqual(normalized(asset.lowDetailSegments),normalized(asset.segments),style+' preserves its authored deck');
  assert.deepEqual(asset.lowDetailRules,['preserve-deck-and-joins']);
 }
});

test('interior stairs also use ramp construction while keeping the floor opening',()=>{
 const part=storeysFixture().parts[0],full=buildPart(part,{collision:false}),low=buildPart(part,{collision:false,lowDetail:true});
 try{
  const fullStairs=full.children.filter(m=>m.userData.interiorStair),lowStairs=low.children.filter(m=>m.userData.interiorStair);
  assert.ok(lowStairs.length&&count(new T.Group().add(...lowStairs.map(m=>m.clone())))<count(new T.Group().add(...fullStairs.map(m=>m.clone()))));
  assert.deepEqual(low.children.filter(m=>!m.userData.interiorStair).map(m=>Array.from(m.geometry.attributes.position.array)),full.children.filter(m=>!m.userData.interiorStair).map(m=>Array.from(m.geometry.attributes.position.array)));
 }finally{disposePart(full);disposePart(low);}
});

test('rounded primitives use their own lower tessellation and unrelated architecture is retained',()=>{
 for(const type of ['round','pillar','dome','cone','orb','capsule']){
  const part=makePart(type),full=buildPart(part,{collision:false}),low=buildPart(part,{collision:false,lowDetail:true});
  try{assert.ok(count(low)<count(full),type);}finally{disposePart(full);disposePart(low);}
 }
 const p=makePart('archbody'),plan=planSWBF2(project([p]),settings),asset=plan.assets[0];assert.deepEqual(asset.lowDetailSegments,asset.segments);
});

test('scene and single-object exports both report construction-driven distant models',()=>{
 const part=makePart('stair-route');part.route.segments[0].steps=32;
 for(const output of ['scene','object','mesh']){
  const result=createSWBF2Package(project([part]),{...settings,output},{packZip:false});
  const asset=result.manifest.assets.find(a=>a.triangles);assert.ok(asset.lowDetailTriangles<asset.triangles);assert.deepEqual(asset.lowDetailConstruction,['route-ramps']);
 }
});
