import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject,History} from '../src/core/model.js';
import {groupScaleLimits,groupScalePivot,scaleObjectGroup} from '../src/editor/group-scale.js';
import {dragScale,limitScaleTravel} from '../src/editor/scale-drag.js';
import * as T from '../vendor/three.module.js';
import {buildPart,disposePart} from '../src/core/geometry.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} versus ${b}`);
const project=parts=>({format:'open-building-studio',version:1,name:'Group scale',parts});
function parts(){return [makePart('block',{position:[-4,1,0],rotation:[.2,.7,0],scale:[-3,.08,6],assemblyId:'group',assemblyName:'Test group'}),makePart('block',{position:[5,2,-3],rotation:[0,-.4,.1],scale:[1,2,4],assemblyId:'group',assemblyName:'Test group'})];}
function bounds(parts){const box=new T.Box3();for(const part of parts){const root=buildPart(part,{collision:false});box.union(new T.Box3().setFromObject(root,true));disposePart(root);}return box;}

test('bottom-anchored group scaling preserves the floor contact for enlargement and reduction',()=>{
 for(const elevation of [0,7,-3]){
  const source=parts(),initial=bounds(source);for(const p of source)p.position[1]+=elevation-initial.min.y;
  const before=bounds(source),pivot=groupScalePivot(before);close(pivot[1],elevation);
  for(const factor of [2,.4]){
   const result=scaleObjectGroup(source,pivot,factor),after=bounds(result.parts);
   close(after.min.y,elevation);close(after.max.y-elevation,(before.max.y-elevation)*result.factor);
   close((after.min.x+after.max.x)/2,pivot[0]);close((after.min.z+after.max.z)/2,pivot[2]);
  }
 }
});

test('group scaling preserves rotated/reflected parts and their relative spacing through save and undo',()=>{
 const source=parts(),before=structuredClone(source),pivot=[1,2,3],history=new History(project(source)),result=scaleObjectGroup(source,pivot,2);
 assert.deepEqual(source,before);assert.equal(result.factor,2);
 result.parts.forEach((part,index)=>{
  const original=source[index];assert.deepEqual(part.rotation,original.rotation);assert.equal(part.assemblyId,original.assemblyId);
  part.scale.forEach((v,i)=>close(v/original.scale[i],2));part.position.forEach((v,i)=>close(v,pivot[i]+(original.position[i]-pivot[i])*2));
 });
 validateProject(JSON.parse(JSON.stringify(project(result.parts))));history.push(project(result.parts));assert.deepEqual(history.undo().parts,source);assert.deepEqual(history.redo().parts,result.parts);
});

test('one shared bound stops the whole group before any member flattens or leaves the project',()=>{
 const source=parts(),pivot=[0,0,0],small=scaleObjectGroup(source,pivot,1e-8);close(small.factor,.625);
 for(const [index,part] of small.parts.entries())part.scale.forEach((v,i)=>close(v/source[index].scale[i],small.factor));
 source[1].position[0]=990;const large=scaleObjectGroup(source,pivot,1e8);close(large.factor,1000/990);validateProject(project(large.parts));
 const bounds=groupScaleLimits(source,pivot);for(const snap of [null,.1]){
  const travel=limitScaleTravel([1,1,1],'XYZ',10000,snap,bounds),result=dragScale([1,1,1],'XYZ',travel,snap,bounds);close(result[0],bounds[1]);assert.ok(dragScale([1,1,1],'XYZ',travel-20,snap,bounds)[0]<result[0]);
 }
});

test('numeric scaling rejects invalid factors and fixed-size character references',()=>{
 for(const factor of [0,-2,NaN,Infinity])assert.throws(()=>scaleObjectGroup(parts(),[0,0,0],factor));
 assert.throws(()=>scaleObjectGroup([{type:'character-reference',position:[0,0,0],scale:[1,1,1]}],[0,0,0],2),/original size/);
});
