import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {castleCompound} from '../examples/generators/compound-demo.js';
import {Box3} from '../vendor/three.module.js';
test('material batching preserves triangle counts and bounds of deformed, mirrored, textured parts',()=>{
 for(const type of ['jp-half-roof','jp-story','ionic','chimney']){const p=makePart(type,{scale:[-2,1.4,3],shape:{bulge:.2,twist:15},surface:{preset:'stone',scale:1}}),raw=buildPart(p),batch=buildPart(p,{batch:true}),a=new Box3().setFromObject(raw),b=new Box3().setFromObject(batch);assert.equal(geometryStats(raw).triangles,geometryStats(batch).triangles);assert.ok(a.min.distanceTo(b.min)<1e-5);assert.ok(a.max.distanceTo(b.max)<1e-5);assert.ok(geometryStats(batch).meshes<=4);batch.traverse(o=>{if(o.isMesh){for(const v of o.geometry.attributes.uv.array)assert.ok(Number.isFinite(v));}});disposePart(raw);disposePart(batch);}
});
test('compound keeps individual parts lightweight and batches their materials',()=>{
 // Scene totals can grow with detail; guard individual part cost instead.
 let triangles=0,meshes=0;for(const p of castleCompound().parts){const g=buildPart(p,{batch:true}),s=geometryStats(g);triangles+=s.triangles;assert.ok(s.triangles<=(p.type==='wall-route'?2500:1000),p.name);meshes+=s.meshes;disposePart(g);}assert.ok(triangles>0);assert.ok(triangles<20000);assert.ok(meshes<550);
 for(const type of ['block','jp-base','jp-stone-wall']){const g=buildPart(makePart(type));assert.equal(geometryStats(g).triangles,12);disposePart(g);}
});

test('architectural detail uses opaque texture maps and can be replaced or cleared',()=>{
 for(const type of ['jp-window','jp-swept-gable','jp-wall','jp-story']){
  const detailed=buildPart(makePart(type));const map=detailed.children[0].material.map;
  assert.ok(map);assert.equal(map.image.width,128);
  for(let i=3;i<map.image.data.length;i+=4)assert.equal(map.image.data[i],255);
  const plain=buildPart(makePart(type,{surface:{preset:'plain',scale:1}}));assert.equal(plain.children[0].material.map,null);
  const stone=buildPart(makePart(type,{surface:{preset:'stone',scale:1}}));assert.ok(stone.children[0].material.map);assert.notEqual(stone.children[0].material.map,map);
  for(const g of [detailed,plain,stone])disposePart(g);
 }
});
