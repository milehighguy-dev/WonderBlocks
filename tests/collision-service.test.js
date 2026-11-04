import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {collisionDefinition,collisionCacheStats,readyObjectCollisions} from '../src/collision/collision-service.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {prepareCollisionSurface} from '../src/collision/collision-surface.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {firstWalkHit,moveWalker} from '../src/walk/walk-physics.js';
import {defaultRoute} from '../src/routes/stair-route.js';
import {editMaterial} from '../src/editor/material-editing.js';

test('appearance rebuilds reuse collision, shape edits replace it, and export consumes prepared bodies',async()=>{
 const part=makePart('block'),first=buildPart(part),initial=first.userData.collision;part.color='#3300ff';part.position=[12,3,8];part.rotation=[.2,.7,.4];const second=buildPart(part,{batch:true});
 try{assert.equal(second.userData.collision,initial);part.scale=[3,4,5];const third=buildPart(part);try{assert.notEqual(third.userData.collision,initial);const source=await readyObjectCollisions([third]),before=collisionCacheStats().builds,project={format:'open-building-studio',version:1,name:'Prepared scene',parts:[part]},output=createSWBF2Package(project,{}, {collisionSource:source});assert.equal(collisionCacheStats().builds,before);assert.equal(output.manifest.assets[0].primitiveCollision,1);assert.deepEqual(output.manifest.assets[0].collisionBodies,[{type:'prim',mask:23}]);assert.equal(output.manifest.assets[0].ordnanceTriangles,0);part.scale=[2,4,5];assert.throws(()=>createSWBF2Package(project,{}, {collisionSource:source}),/not ready/);}finally{disposePart(third);}}finally{disposePart(first);disposePart(second);}
});

test('component paint and plant colours reuse physical snapshots without invalidating export readiness',async()=>{
 for(const part of [makePart('stair-route',{route:defaultRoute()}),makePart('platform'),makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'))]){
  const first=buildPart(part),before=collisionDefinition(part);const target=part.route?'deck':part.platform?'top':'bark';
  try{assert.equal(editMaterial(part,target,{color:'#aabbcc'}),true);assert.equal(collisionDefinition(part),before);const after=buildPart(part);try{assert.equal(after.userData.collision,first.userData.collision,'recolouring '+part.type+' must reuse physical work');const source=await readyObjectCollisions([after]);assert.doesNotThrow(()=>createSWBF2Package({format:'open-building-studio',version:1,name:'Painted',parts:[part]},{aiNavigation:false,shadows:false,lowDetail:false},{collisionSource:source}));}finally{disposePart(after);}}finally{disposePart(first);}
 }
});

test('walk mode uses movement ramps and semantic guards instead of visual tread/post gaps',()=>{
 const route=defaultRoute();route.width=4;route.segments=[{kind:'stairs',run:8,rise:2,steps:20,turn:'straight',railing:{style:'posts',sides:'both',height:1.1,spacing:4,railWidth:.06,postWidth:.06,railHeight:.06}}];const part=makePart('stair-route'),root=buildPart({...part,route},{batch:true});
 try{const index=createWalkCollision([root]),ray=new T.Raycaster(new T.Vector3(0,5,1.9),new T.Vector3(0,-1,0)),hit=firstWalkHit(index,ray);assert.ok(hit);assert.ok(Math.abs(hit.point.y-2*1.9/8)<1e-6);const before=new T.Vector3(0,2*3/8,3),after=moveWalker(index,before,new T.Vector3(4,0,0),2);assert.ok(after.x<2,'continuous guard stops movement between the visible posts');const bullets=createWalkCollision([root],{mask:16}),side=new T.Raycaster(new T.Vector3(0,1.2,3),new T.Vector3(1,0,0),0,4);assert.equal(firstWalkHit(bullets,side),null,'bullets pass through actual railing gaps');}finally{disposePart(root);}
});

test('changing foliage alone keeps bark collision cached while a branch edit replaces it',()=>{
 const part=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),first=buildPart(part),roots=[first];
 try{part.flora.organs[0].scale[0]*=.8;const leaves=buildPart(part);roots.push(leaves);assert.equal(leaves.userData.collision,first.userData.collision);part.flora.branches[0].radii[0]*=1.2;const bark=buildPart(part);roots.push(bark);assert.notEqual(bark.userData.collision,first.userData.collision);}finally{roots.forEach(disposePart);}
});

test('serialization covers supplied physical extents and rejects an obsolete rule snapshot',async()=>{
 const part=makePart('block'),root=buildPart(part);try{const state=structuredClone(root.userData.collision);state.bodies[0].primitive.position=[50,10,0];const source=new Map([[part.id,state]]),project={format:'open-building-studio',version:1,name:'Physical bounds',parts:[part]},before=collisionCacheStats().builds,result=createSWBF2Package(project,{}, {collisionSource:source});assert.equal(collisionCacheStats().builds,before);assert.ok(result.manifest.worldBounds.max[0]>=50.5);assert.ok(result.manifest.worldBounds.max[1]>=10.5);assert.equal(result.manifest.assets[0].carrierTriangles,2);assert.equal(result.manifest.collisionPipeline,'object-owned');state.version--;assert.throws(()=>createSWBF2Package(project,{}, {collisionSource:source}),/not ready/);}finally{disposePart(root);}
});

test('background updates retain complete collision and never replace a newer shape with old geometry',async()=>{
 const originalWorker=globalThis.Worker,calls=[];let fake;
 globalThis.Worker=class{constructor(){fake=this;}postMessage(data){calls.push({worker:this,data});}terminate(){}};
 const part=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),roots=[];
 try{
  const first=buildPart(part);roots.push(first);const old=first.userData.collision;assert.equal(old.status,'updating');assert.ok(old.bodies.every(b=>b.surface.triangles.length));await Promise.resolve();assert.equal(calls.length,1);
  part.scale=[1.2,1,1];const second=buildPart(part);roots.push(second);const middle=second.userData.collision;
  part.scale=[1.4,1,1];const third=buildPart(part);roots.push(third);const latest=third.userData.collision;assert.notEqual(latest,old);assert.notEqual(latest,middle);assert.equal(latest.definition,collisionDefinition(part));
  const complete=call=>call.worker.onmessage({data:{id:call.data.id,results:call.data.jobs.map(j=>prepareCollisionSurface(j.body,{target:j.target}))}});
  complete(calls[0]);assert.equal(calls.length,2,'queued superseded shape is skipped');assert.equal(third.userData.collision,latest);assert.equal(latest.status,'updating');complete(calls[1]);await readyObjectCollisions([third]);assert.equal(latest.status,'ready');assert.equal(latest.definition,collisionDefinition(part));assert.equal(old.status,'ready');assert.equal(middle.status,'unprepared');part.scale=[1.2,1,1];const restored=buildPart(part);roots.push(restored);assert.equal(restored.userData.collision,middle);assert.equal(middle.status,'updating');await Promise.resolve();assert.equal(calls.length,3);complete(calls[2]);await readyObjectCollisions([restored]);assert.equal(middle.status,'ready');
  const controller=new AbortController();controller.abort();await assert.rejects(readyObjectCollisions([third],{signal:controller.signal}),{name:'AbortError'});
  part.scale=[1.6,1,1];const queued=buildPart(part);roots.push(queued);await Promise.resolve();assert.equal(calls.length,4);const pending=queued.userData.collision;const synced=buildPart(part,{collision:'sync'});roots.push(synced);assert.equal(synced.userData.collision,pending);assert.equal(pending.status,'ready');const prepared=pending.bodies;complete(calls[3]);assert.equal(pending.bodies,prepared,'late worker result cannot replace a synchronously prepared snapshot');
  part.scale=[1.8,1,1];const blocker=buildPart(part);roots.push(blocker);await Promise.resolve();part.scale=[2,1,1];const required=buildPart(part);roots.push(required);const ready=readyObjectCollisions([required]);part.scale=[2.2,1,1];const superseding=buildPart(part);roots.push(superseding);complete(calls[4]);assert.equal(calls.length,6,'an explicitly requested snapshot is prepared even after a later edit');complete(calls[5]);await ready;assert.equal(required.userData.collision.status,'ready');complete(calls[6]);
 }finally{roots.forEach(disposePart);fake?.onerror();if(originalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=originalWorker;}
});
