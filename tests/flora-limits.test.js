import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {FLORA_LIMITS,floraCapacityError} from '../src/flora/flora-limits.js';
import {defaultFlora,addFloraAsset,duplicateFloraSubtree,extendFloraBranch,floraCurve,validateFlora,floraNeedsWeld,floraSockets} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';

function longVine(count=64){
 const f=defaultFlora();let parent;
 for(let i=0;i<count;i++){const b=addFloraAsset(f,parent?.id||f.branches[0].id,'flora-basic-branch',1);b.points=[[0,0,0],[0,.5,0]];b.radii=[.1,.1];parent=b;}
 return f;
}

test('a 64-section vine passes authoring, rendering and save/load beyond the old branch cap',()=>{
 const f=longVine(),part=makePart('flora',{flora:f}),project=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Large vine',parts:[part]})));
 assert.equal(project.parts[0].flora.branches.length,64);assert.equal(floraNeedsWeld(f),false);assert.ok(floraCurve(f,f.branches.at(-1).id).getPoint(1).distanceTo(new T.Vector3(0,32,0))<1e-6);
 const g=buildPart(part,{floraEditing:true,floraLive:true,collision:false});try{assert.equal(g.children.filter(m=>m.userData.floraBranch).length,64);for(const mesh of g.children.filter(m=>m.isMesh)){assert.ok(mesh.geometry.userData.floraSampleRings>=4,'each curved span retains enough samples');assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));}}finally{disposePart(g);}
 const root=f.branches[0];duplicateFloraSubtree(f,f.branches.at(-1).id);assert.equal(f.branches.length,65);root.points=Array.from({length:8},(_,i)=>[0,i*.5,0]);root.radii=Array(8).fill(.1);const extended=extendFloraBranch(f,root.id);assert.ok(extended);validateFlora(f);
});

test('more than 160 foliage parts export while native models retain their attachment budget',()=>{
 const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');
 for(let i=0;i<200;i++)addFloraAsset(f,root.id,'endor-leaves',.2+.6*(i/200),i*.4);
 assert.equal(f.organs.length,200);validateFlora(f);
 const part=makePart('flora',{flora:f}),output=createSWBF2Package({format:'open-building-studio',version:1,name:'Large foliage',parts:[part]},{aiNavigation:false,includeCollision:false,shadows:false,lowDetail:false});
 const foliage=output.manifest.assets.filter(a=>a.nativeLeafPatches);assert.ok(foliage.length>=4);assert.equal(foliage.reduce((n,a)=>n+a.nativeLeafPatches,0),200);assert.ok(foliage.every(a=>a.nativeLeafPatches<=63));
});

test('one shared authoring budget permits the exact limits and rejects only overflow',()=>{
 const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,'flora-basic-branch'),leaf=addFloraAsset(f,root.id,'flora-ginkgo-leaf',.5);
 f.branches=Array.from({length:FLORA_LIMITS.branches},(_,i)=>({...structuredClone(root),id:'branch-'+i,parent:i?'branch-0':null}));
 f.organs=Array.from({length:FLORA_LIMITS.parts},(_,i)=>({...structuredClone(leaf),id:'leaf-'+i,branch:'branch-0'}));
 assert.equal(floraCapacityError(f),null);validateFlora(f);assert.match(floraCapacityError(f,{branches:1}),/256/);assert.match(floraCapacityError(f,{parts:1}),/2048/);
 assert.throws(()=>addFloraAsset(f,'branch-0','flora-basic-branch'),/Branch limit/);assert.throws(()=>addFloraAsset(f,'branch-0','flora-ginkgo-leaf'),/Leaf\/body part limit/);assert.throws(()=>duplicateFloraSubtree(f,'branch-1'),/Branch limit/);
 f.organs.push({...structuredClone(leaf),id:'overflow',branch:'branch-0'});assert.throws(()=>validateFlora(f));
});

test('large flora parts, editable joints and branch thickness survive rendering and save/load',()=>{
 const flora=defaultFlora(),branch=addFloraAsset(flora,flora.branches[0].id,'flora-basic-branch'),leaf=addFloraAsset(flora,branch.id,'flora-ginkgo-leaf',.5),trunk=addFloraAsset(flora,flora.branches[0].id,'temp-base-stem');
 branch.radii=branch.radii.map(()=>8);leaf.scale=[25,40,25];trunk.scale=[30,30,30];
 const joint=floraSockets(trunk.asset).find(s=>s.parent);assert.ok(joint);trunk.controls={[joint.id]:{offset:[0,0,0],rotation:[0,0,0],scale:[20,20,20]}};
 const project=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Giant flora',parts:[makePart('flora',{flora})]})));
 assert.deepEqual(project.parts[0].flora,flora);const root=buildPart(project.parts[0],{floraEditing:true,floraLive:true,collision:false});
 try{root.updateMatrixWorld(true);assert.ok(new T.Box3().setFromObject(root).getSize(new T.Vector3()).length()>50);root.traverse(m=>{if(m.isMesh)assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));});}finally{disposePart(root);}
 for(const value of [Infinity,NaN,-1]){const invalid=structuredClone(flora);invalid.organs[0].scale[0]=value;assert.throws(()=>validateFlora(invalid));}
});
