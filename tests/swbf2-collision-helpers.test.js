import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {readyObjectCollisions} from '../src/collision/collision-service.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {boxSurface} from '../src/collision/collision-geometry.js';
import {collisionHelperLayout} from '../src/swbf2/swbf2-collision-helpers.js';
import {recommendCollisionHelpers,createSWBF2Package,createSWBF2PackageAsync} from '../src/swbf2/export-swbf2.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Helper switch',parts});
const settings={output:'object',aiNavigation:false,shadows:false,lowDetail:false};

test('simple and physically large sparse objects recommend embedded collision',()=>{
 for(const scale of [[1,1,1],[500,40,500]]){
  const p=project([makePart('block',{scale})]),r=recommendCollisionHelpers(p,settings);
  assert.equal(r.recommended,false);assert.equal(r.required,false);
  const out=createSWBF2Package(p,{...settings,separateCollisionHelpers:false});
  assert.equal(out.manifest.asset.collisionHelpers.length,0);assert.equal(out.manifest.assets[0].primitiveCollision,1);
 }
});

test('vehicle-only tree crowding is advisory and embedding retains every prepared face',async()=>{
 const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),p=project([tree]),before=JSON.stringify(p),root=buildPart(tree);
 try{
  const source=await readyObjectCollisions([root]),r=recommendCollisionHelpers(p,settings,source);
  assert.equal(r.recommended,false);assert.equal(r.required,false);assert.ok(r.reasons.includes('vehicle-review'));
  const on=createSWBF2Package(p,settings,{collisionSource:source}),off=createSWBF2Package(p,{...settings,separateCollisionHelpers:false},{collisionSource:source});
  assert.deepEqual(r,on.manifest.collisionHelpers);assert.equal(r.helperCount,on.manifest.asset.collisionHelpers.length);
  assert.ok(on.manifest.asset.collisionHelpers.length>0);assert.equal(off.manifest.asset.collisionHelpers.length,0);assert.equal(off.manifest.assets.length,1);
  assert.equal(off.manifest.assets[0].collisionTriangles,on.manifest.assets.reduce((n,a)=>n+(a.collisionTriangles??0),0));
  assert.equal(off.manifest.assets[0].collisionMask,'svbo');assert.ok(off.manifest.assets[0].collisionFacesPreserved);assert.ok(off.manifest.warnings.some(w=>w.includes('does not prove collision helpers')));
  const mesh=createSWBF2Package(p,{...settings,output:'mesh',separateCollisionHelpers:false},{collisionSource:source});
  assert.equal(mesh.manifest.assets.length,1);assert.ok(![...mesh.files.keys()].some(n=>n.endsWith('.odf')));
  const asyncOut=await createSWBF2PackageAsync(p,{...settings,separateCollisionHelpers:false},{collisionSource:source});assert.deepEqual(asyncOut.zip,off.zip);
  assert.equal(JSON.stringify(p),before);
 }finally{disposePart(root);}
});

test('mixed native mesh masks cannot be silently combined',()=>{
 const primitive={shape:4,dimensions:[1,1,1],position:[0,0,0],rotation:[0,0,0,1]},surface=boxSurface(primitive),asset={primitives:[],bodies:[{mask:3,surface},{mask:16,surface}]};
 const r=collisionHelperLayout(asset,new Set()).recommendation;
 assert.equal(r.required,true);assert.equal(r.recommended,true);assert.ok(r.reasons.includes('different-masks'));
 assert.throws(()=>collisionHelperLayout(asset,new Set(),false),/different movement\/projectile/);
});

test('primitive overflow embeds exact boxes while retaining analytic shapes and their masks',()=>{
 const box=i=>({shape:4,mask:23,dimensions:[1,.5,.25],position:[i*4,0,0],rotation:[0,0,0,1]}),primitives=Array.from({length:65},(_,i)=>box(i)),sphere={shape:0,mask:16,dimensions:[1,1,1],position:[0,2,0],rotation:[0,0,0,1]};primitives.push(sphere);
 const asset={primitives,bodies:[]},out=collisionHelperLayout(asset,new Set(primitives),false);
 assert.equal(out.nativePrimitives.length,63);assert.ok(out.nativePrimitives.includes(sphere));assert.equal(out.convertedNativeBoxes,3);assert.equal(out.meshGroups.size,1);
 const bodies=[...out.meshGroups.values()][0].bodies;assert.equal(bodies.length,3);assert.ok(bodies.every(b=>b.mask===23));assert.deepEqual(bodies.map(b=>b.surface),primitives.slice(62,65).map(p=>boxSurface(p)));
 const spheres=Array.from({length:65},()=>({...sphere}));assert.throws(()=>collisionHelperLayout({primitives:spheres,bodies:[]},new Set(spheres),false),/non-box/);
});

test('embedded overflow respects native model limits and reports actual box serialization',()=>{
 const p=project(Array.from({length:66},(_,i)=>makePart('block',{position:[i*4,0,0]}))),out=createSWBF2Package(p,{...settings,separateCollisionHelpers:false});
 assert.equal(out.manifest.assets.length,1);assert.equal(out.manifest.assets[0].collisionBodies.length,64);assert.equal(out.manifest.assets[0].collisionTriangles,36);
 assert.equal(out.manifest.primitiveBudget.native,63);assert.equal(out.manifest.primitiveBudget.meshSerializedBoxes,3);
});

test('excluded collision bypasses helper requirements and invalid switches are rejected',()=>{
 const p=project([makePart('block')]);
 assert.equal(recommendCollisionHelpers(p,{includeCollision:false}).recommended,false);
 const out=createSWBF2Package(p,{...settings,includeCollision:false,separateCollisionHelpers:false});assert.ok(out.manifest.assets.every(a=>a.collisionBodies.length===0));
 assert.throws(()=>createSWBF2Package(p,{...settings,separateCollisionHelpers:'off'}),/Invalid export option/);
});
