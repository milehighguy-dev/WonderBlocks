import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {instanceDefinition,detachEditedInstances} from '../src/core/instances.js';
import {prepareExampleCopies} from '../src/editor/example-copies.js';
import {planSWBF2} from '../src/swbf2/export-swbf2.js';
const scene=parts=>({format:'open-building-studio',version:1,name:'Example copies',parts});
test('identical example objects become independent shared copies without geometry or placement edits',()=>{
 const a=makePart('block'),b=makePart('block',{position:[20,5,-10],rotation:[0,.7,0]}),c=makePart('block',{scale:[1,3,1]}),project=scene([a,b,c]),before=structuredClone(project);
 prepareExampleCopies(project,'fixture');assert.ok(a.instanceFamily);assert.equal(b.instanceFamily,a.instanceFamily);assert.equal(b.instanceCopy,true);assert.equal(a.instanceCopy,undefined);assert.equal(c.instanceFamily,undefined);
 for(let i=0;i<project.parts.length;i++){assert.equal(instanceDefinition(project.parts[i]),instanceDefinition(before.parts[i]));assert.deepEqual(project.parts[i].position,before.parts[i].position);}
 assert.deepEqual(validateProject(structuredClone(project)),project);const metadata=project.parts.map(p=>p.instanceFamily);prepareExampleCopies(project,'fixture');assert.deepEqual(project.parts.map(p=>p.instanceFamily),metadata);
 b.color='#ff0000';assert.deepEqual(detachEditedInstances(project.parts,before.parts),[],'source baseline must include sharing metadata');const snapshot=structuredClone(project.parts);b.scale[1]=2;assert.deepEqual(detachEditedInstances(project.parts,snapshot),[b.id]);
});
test('whole repeated groups share; different arrangements cannot acquire a COPY group badge',()=>{
 const a=[makePart('block',{position:[0,0,0],assemblyId:'a'}),makePart('orb',{position:[0,2,0],assemblyId:'a'})];
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(.2,.6,.1)),offset=new T.Vector3(20,10,30);
 const b=a.map(p=>({...structuredClone(p),id:crypto.randomUUID(),assemblyId:'b',position:new T.Vector3(...p.position).applyQuaternion(rotation).add(offset).toArray(),rotation:new T.Euler().setFromQuaternion(rotation).toArray().slice(0,3)}));
 const c=a.map(p=>({...structuredClone(p),id:crypto.randomUUID(),assemblyId:'c',position:[p.position[0]+40,p.position[1]*2,p.position[2]]}));
 const project=prepareExampleCopies(scene([...a,...b,...c]),'groups');assert.ok(b.every(p=>p.instanceCopy));assert.ok(a.every(p=>p.instanceFamily&&!p.instanceCopy));assert.ok(c.every(p=>!p.instanceCopy));
 const plan=planSWBF2(project,{aiNavigation:false,shadows:false,lowDetail:false,includeCollision:false});assert.ok(plan.assets.some(asset=>asset.instances?.length===2));assert.equal(plan.assets.filter(a=>a.role!=='collision').length,2);
});
test('equivalent positive and negative half-turns do not make repeated groups unique',()=>{
 const parts=[makePart('block',{assemblyId:'a'}),makePart('block',{assemblyId:'a',position:[3,0,0],rotation:[0,Math.PI,0]}),makePart('block',{assemblyId:'b',position:[10,0,0]}),makePart('block',{assemblyId:'b',position:[13,0,0],rotation:[0,-Math.PI,0]})];
 prepareExampleCopies(scene(parts),'half-turn');assert.ok(parts.slice(2).every(p=>p.instanceCopy));assert.ok(parts.slice(0,2).every(p=>p.instanceFamily&&!p.instanceCopy));
});
