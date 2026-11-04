import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {optimizeCollisionBodies} from '../src/collision/collision-optimize.js';

const body=(id,position,dimensions,mask=23,rotation=[0,0,0,1])=>({id,kind:'primitive',role:'interior',routeSegment:null,source:'solid shape',mask,primitive:{shape:4,position,dimensions,rotation}});
function contains(b,point){const p=b.primitive,local=point.clone().applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.rotation),new T.Vector3(1,1,1)).invert());return local.toArray().every((v,i)=>Math.abs(v)<=p.dimensions[i]+1e-8);}
function membership(bodies,point){return bodies.reduce((mask,b)=>contains(b,point)?mask|b.mask:mask,0);}
test('joining contiguous slab boxes preserves their exact occupied space and collision categories',()=>{
 const q=new T.Quaternion().setFromEuler(new T.Euler(.2,.7,.1)),source=Array.from({length:6},(_,i)=>body('b'+i,new T.Vector3(i*2,0,0).applyQuaternion(q).toArray(),[1,.1,2],23,q.toArray())),before=JSON.stringify(source),optimized=optimizeCollisionBodies(source);
 assert.equal(optimized.bodies.length,1);assert.equal(optimized.stats.mergedPrimitives,5);assert.equal(JSON.stringify(source),before);
 for(let x=-1.2;x<=11.2;x+=.19)for(const y of [-.12,0,.12])for(const z of [-2.1,0,2.1]){const point=new T.Vector3(x,y,z).applyQuaternion(q);assert.equal(membership(optimized.bodies,point),membership(source,point));}
});
test('a doorway gap, unequal heights and distinct route owners prevent box unions',()=>{
 const source=[body('a',[-2,0,0],[1,1,.1]),body('b',[2,0,0],[1,1,.1]),body('c',[0,2,0],[3,.2,.1])],optimized=optimizeCollisionBodies(source);assert.equal(optimized.bodies.length,3);assert.equal(membership(optimized.bodies,new T.Vector3()),0);
 const distinct=[body('d',[0,0,0],[1,.1,1]),{...body('e',[2,0,0],[1,.1,1]),routeSegment:1}];assert.equal(optimizeCollisionBodies(distinct).bodies.length,2);
});
test('covered movement bits are removed without discarding accurate bullet collision',()=>{
 const outer={...body('outer',[0,.5,0],[.1,.5,4],7),source:'railing barrier'},inner=body('inner',[0,.5,0],[.03,.4,.03]),source=[outer,inner],optimized=optimizeCollisionBodies(source);
 assert.equal(optimized.bodies.find(b=>b.id==='inner').mask,16);
 for(const point of [new T.Vector3(0,.5,0),new T.Vector3(.09,.5,2),new T.Vector3(.2,.5,0)])assert.equal(membership(optimized.bodies,point),membership(source,point));
 assert.equal(optimizeCollisionBodies([body('large',[0,0,0],[2,2,2]),body('small',[0,0,0],[1,1,1])]).bodies.length,1);
});
