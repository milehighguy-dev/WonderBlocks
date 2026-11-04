import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createFloraWeldPreview} from '../src/flora/flora-weld-preview.js';
import {defaultFlora,addFloraAsset,floraWeldGeometry,floraWeldKey,buildFlora,floraAttachmentFrame,branchGeometry} from '../src/flora/flora.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {makePart} from '../src/core/model.js';
import {clearFloraSkinCache} from '../src/flora/flora-skin.js';
beforeEach(()=>clearFloraSkinCache());

function plant(){const f=defaultFlora();f.detail='standard';const a=addFloraAsset(f,f.branches[0].id,'flora-elbow-branch');addFloraAsset(f,a.id,'flora-stepped-branch',1);addFloraAsset(f,a.id,'flora-ginkgo-leaf',.6);return makePart('flora',{flora:f});}
const preview=p=>buildPart(p,{floraEditing:true,floraLive:true});
function worker(){return {messages:[],postMessage(data){this.messages.push(structuredClone(data));},terminate(){this.terminated=true;},reply(i=0){const {key,flora}=this.messages[i],g=floraWeldGeometry(flora);this.onmessage({data:{key,position:g.attributes.position.array,normal:g.attributes.normal.array,uv:g.attributes.uv.array,index:g.index.array,step:g.userData.skinStep}});g.dispose();}};}
const visibleBark=g=>{const result=[];g.traverseVisible(m=>{if(m.isMesh&&m.userData.floraComponent==='bark')result.push(m);});return result;};

test('equivalent copied plants reuse the weld cache across different node IDs and edits remain independent',()=>{
 const source=plant().flora,copy=structuredClone(source),nodes=[...copy.branches,...copy.organs],ids=new Map(nodes.map((n,i)=>[n.id,'copied-'+i]));
 for(const node of nodes)for(const key of ['id','parent','branch','parentOrgan'])if(ids.has(node[key]))node[key]=ids.get(node[key]);
 const before=JSON.stringify(copy),sourceKey=floraWeldKey(source);assert.equal(floraWeldKey(copy),sourceKey);const a=floraWeldGeometry(source),b=floraWeldGeometry(copy);
 try{assert.deepEqual(a.attributes.position.array,b.attributes.position.array);assert.deepEqual(a.index.array,b.index.array);assert.notEqual(a.attributes.position.array.buffer,b.attributes.position.array.buffer);assert.equal(JSON.stringify(copy),before);copy.branches[1].points[1][0]+=.3;assert.notEqual(floraWeldKey(copy),sourceKey);const saved=a.attributes.position.array[0];b.attributes.position.array[0]+=2;assert.equal(a.attributes.position.array[0],saved);}finally{a.dispose();b.dispose();}
});

test('SWBF2 worker preview and finished geometry agree after changing surface detail',()=>{
 const flora=defaultFlora(),body=addFloraAsset(flora,flora.branches[0].id,'flora-antler-base');body.controls={'joint:12':{offset:[.3,.15,.2],rotation:[0,.2,.1],scale:[1,1,1]}};
 for(const p of [plant(),makePart('flora',{flora})]){
 p.flora.detail='swbf2';const g=preview(p),w=worker(),c=createFloraWeldPreview({invalidate(){},workerFactory:()=>w});let finished;
 try{c.show(g,p);assert.equal(g.userData.floraWeldPending,true);w.reply();assert.equal(g.userData.floraWeldPending,false);finished=buildPart(p,{collision:false});
  const shown=visibleBark(g)[0].geometry,saved=visibleBark(finished)[0].geometry;assert.deepEqual(shown.index.array,saved.index.array);assert.deepEqual(shown.attributes.position.array,saved.attributes.position.array);
 }finally{c.close();disposePart(g);if(finished)disposePart(finished);}
 }
});

test('textured elevated branches retain their attachment while the edited weld is pending',()=>{
 const p=plant(),stem=p.flora.branches.find(b=>!b.anchor),branch=p.flora.branches.filter(b=>!b.anchor).at(-1);
 stem.points=stem.points.map(point=>point.map((value,i)=>value+(i===1?8:0)));
 p.flora.finishes={bark:{preset:'forest-bark',scale:.5}};
 p.position=[3,2,-4];p.scale=[20,20,20];p.rotation=[.1,.4,0];
 branch.points[1][0]+=.3;
 const g=preview(p),w=worker(),c=createFloraWeldPreview({invalidate(){},workerFactory:()=>w});
 try{
  c.show(g,p);assert.equal(w.messages.length,1);assert.equal(g.userData.floraWeldPending,true);
  const mesh=g.children.find(m=>m.userData.floraBranch===branch.id),expected=floraAttachmentFrame(p.flora,branch);
  assert.ok(new T.Vector3().setFromMatrixPosition(expected).y>5);
  assert.deepEqual(mesh.matrix.elements,expected.elements);
  g.updateMatrixWorld(true);
  const actualBox=new T.Box3().setFromObject(mesh,true),expectedGeometry=branchGeometry(p.flora,branch);
  try{
   expectedGeometry.applyMatrix4(g.matrixWorld);expectedGeometry.computeBoundingBox();
   assert.ok(actualBox.min.distanceTo(expectedGeometry.boundingBox.min)<1e-3);
   assert.ok(actualBox.max.distanceTo(expectedGeometry.boundingBox.max)<1e-3);
  }finally{expectedGeometry.dispose();}
  w.reply();assert.equal(g.userData.floraWeldPending,false);assert.equal(visibleBark(g).length,1);
 }finally{c.close();disposePart(g);}
});

test('settled editing shows one welded bark mesh, retains leaf picking and uses the same mesh after Finish',()=>{
 const p=plant(),g=preview(p),w=worker(),c=createFloraWeldPreview({invalidate(){},workerFactory:()=>w});
 try{
  const sources=g.children.filter(m=>m.userData.floraBranch),buffers=sources.map(m=>m.geometry.attributes.position.array),leaf=g.children.find(m=>m.userData.floraOrgan);
  c.show(g,p);assert.equal(w.messages.length,1);assert.equal(g.userData.floraWeldPending,true);w.reply();
  const bark=visibleBark(g);assert.equal(bark.length,1);assert.equal(bark[0].userData.floraWeld,true);assert.equal(g.userData.floraWeldPending,false);
  assert.equal(leaf.visible,true);sources.forEach((m,i)=>{assert.equal(m.visible,false);assert.equal(m.geometry.attributes.position.array,buffers[i]);});
  const finished=new T.Group();buildFlora(finished,p.flora,p);try{assert.deepEqual(visibleBark(finished)[0].geometry.attributes.position.array,bark[0].geometry.attributes.position.array);}finally{disposePart(finished);}
  // Foliage tweaks do not run another wood job or degrade the welded surface.
  p.flora.organs[0].scale=[.7,.7,.7];c.show(g,p);assert.equal(w.messages.length,1);assert.equal(visibleBark(g).length,1);
  c.show(g,p,{moving:true});assert.equal(visibleBark(g).length,2);assert.ok(sources.every(m=>m.visible));assert.equal(w.messages.length,1);
 }finally{c.close();disposePart(g);}
});

test('rapid edits coalesce, stale meshes never appear, Undo uses its cached weld, and closing cancels work',()=>{
 const p=plant(),a=preview(p),w=worker(),c=createFloraWeldPreview({invalidate(){},workerFactory:()=>w});let b;
 try{
  c.show(a,p);const changed=structuredClone(p);changed.flora.branches[1].points[1][0]+=.2;b=preview(changed);
  c.show(b,changed,{moving:true});w.reply();assert.equal(visibleBark(b).length,2);assert.equal(w.messages.length,1);
  c.show(b,changed);assert.equal(w.messages.length,2);
  c.show(a,p);assert.equal(visibleBark(a).length,1);const restored=visibleBark(a)[0];
  w.reply(1);assert.equal(visibleBark(a)[0].uuid,restored.uuid);assert.equal(w.messages.length,2);
  c.show(b,changed);assert.equal(visibleBark(b).length,1);assert.equal(w.messages.length,2);
  c.close();assert.equal(w.terminated,true);w.reply(1);assert.equal(visibleBark(b).length,1);
 }finally{c.close();disposePart(a);if(b)disposePart(b);}
});

test('single authored parts stay exact and worker failure leaves complete editable meshes',()=>{
 const p=plant();p.flora.branches.pop();const g=preview(p),w=worker(),c=createFloraWeldPreview({invalidate(){},workerFactory:()=>w});
 try{
  const positions=visibleBark(g)[0].geometry.attributes.position.array;c.show(g,p);assert.equal(w.messages.length,0);assert.equal(visibleBark(g)[0].geometry.attributes.position.array,positions);
  addFloraAsset(p.flora,p.flora.branches[0].id,'flora-stepped-branch',1);const two=preview(p);try{c.show(two,p);w.onmessage({data:{key:w.messages[0].key,error:'Test failed build'}});assert.equal(visibleBark(two).length,2);assert.equal(two.userData.floraWeldPending,false);assert.equal(two.userData.floraWeldError,'Test failed build');}finally{disposePart(two);}
 }finally{c.close();disposePart(g);}
});
