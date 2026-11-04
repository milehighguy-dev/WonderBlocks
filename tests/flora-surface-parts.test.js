import test from 'node:test';
import assert from 'node:assert/strict';
import {PROCEDURAL_FLORA,floraAsset,floraPlacementCategory} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset,floraConnectionSockets,floraEditableSections,floraSockets,floraWeldKey,floraWeldGeometry,floraSurfaceTarget,floraOrganMatrix,floraDeformPositions,validateFlora} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createFloraWeldPreview} from '../src/flora/flora-weld-preview.js';

test('surface parts reject removed synthetic joints and saved deformation controls',()=>{
 const f=defaultFlora(),part=addFloraAsset(f,f.branches[0].id,'flora-bent-twig');
 part.controls={'body:2':{offset:[.3,0,.2],rotation:[0,0,0],scale:[1,1,1]}};
 assert.throws(()=>validateFlora(f));delete part.controls;
 addFloraAsset(f,part.branch,'flora-ginkgo-leaf',0,0,{organ:part.id,socket:'z+'});assert.throws(()=>validateFlora(f));
});

test('a muscle attached by a surface pin updates its skin when the host moves',()=>{
 const f=defaultFlora(),host=addFloraAsset(f,f.branches[0].id,'flora-bent-twig');
 addFloraAsset(f,host.branch,'flora-basic-branch',0,0,{organ:host.id,surface:{mesh:0,triangle:10,bary:[.2,.3,.5]}});
 const before=floraWeldKey(f);host.offset[0]=1;validateFlora(f);assert.notEqual(floraWeldKey(f),before);
 assert.deepEqual(floraSockets(host.asset),[],'a surface pin does not create joints in its host');
});

test('every surface card has no editable joints or connection sockets',()=>{
 for(const a of PROCEDURAL_FLORA.filter(a=>floraPlacementCategory(a)==='Surface parts')){
  assert.equal(floraEditableSections(a.id).length,0,a.name);
  assert.equal(floraConnectionSockets(a.id).length,0,a.name);assert.deepEqual(floraSockets(a.id),[],a.name);
 }
 assert.deepEqual(floraSockets('flora-bent-twig'),[]);
 assert.ok(floraConnectionSockets('flora-taproot').some(s=>s.id==='joint:0'));
});

test('moving a twig decoration adds no skin, connector or joints and keeps its authored mesh through Finish',()=>{
 const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,'flora-elbow-branch');addFloraAsset(f,root.id,'flora-stepped-branch',1);
 const key=floraWeldKey(f),body=floraWeldGeometry(f),target=floraSurfaceTarget(f,{branch:root.id,at:.5}),twig=addFloraAsset(f,root.id,'flora-thorn-branch',.5,0,target);
 twig.offset=[2,.4,-1];twig.rotation=[.2,.4,.7];twig.scale=[.6,.8,.6];
 const part=makePart('flora',{flora:f}),editing=buildPart(part,{floraEditing:true,floraLive:true}),finished=buildPart(part,{floraEditing:true});
 const controller=createFloraWeldPreview({invalidate(){},workerFactory(){throw Error('Surface edit must reuse the existing body.');}});
 try{
  assert.equal(f.branches.length,2);assert.equal(twig.controls,undefined);assert.equal(floraWeldKey(f),key);
  controller.show(editing,part);const source=editing.children.find(m=>m.userData.floraOrgan===twig.id),saved=finished.children.find(m=>m.userData.floraOrgan===twig.id);
  assert.ok(source);assert.ok(saved);assert.ok(source.children.every(m=>m.visible&&!m.userData.floraWeldSource));
  const merged=editing.children.find(m=>m.userData.floraWeld);assert.deepEqual(merged.geometry.attributes.position.array,body.attributes.position.array);
  for(const [i,mesh] of source.children.entries()){
   const asset=floraAsset(twig.asset).meshes[i];assert.deepEqual(Array.from(mesh.geometry.attributes.position.array),Array.from(Float32Array.from(floraDeformPositions(twig,asset.positions))));
   assert.deepEqual(saved.children[i].geometry.attributes.position.array,mesh.geometry.attributes.position.array);assert.deepEqual(saved.children[i].geometry.index.array,mesh.geometry.index.array);
  }
  assert.deepEqual(source.matrix.elements,floraOrganMatrix(f,twig).elements);assert.deepEqual(saved.matrix.elements,source.matrix.elements);
 }finally{controller.close();body.dispose();disposePart(editing);disposePart(finished);}
});

test('switching a surface part style cannot reuse deformation vertices from the previous asset',()=>{
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-tapered-twig');o.morphs={'2e6521f4':.8};floraDeformPositions(o,floraAsset(o.asset).meshes[0].positions);
 o.asset='flora-bent-twig';const source=floraAsset(o.asset).meshes[0].positions,live=floraDeformPositions(o,source),fresh=floraDeformPositions(structuredClone(o),source);assert.equal(live.length,source.length);assert.deepEqual(Array.from(live),Array.from(fresh));
});
