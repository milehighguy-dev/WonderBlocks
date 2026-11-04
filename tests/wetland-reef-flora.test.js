import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {CORAL_FIXTURES,coralAttachmentFixture} from './fixtures/coral-attachment-fixture.js';
import {CORAL_PARTS} from '../src/flora/reef-flora.js';
import {WILLOW_SPRAY} from '../src/flora/wetland-foliage.js';
import {PROCEDURAL_FLORA,floraAsset,floraPlacementCategory} from '../src/flora/flora-palette.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {defaultFlora,addFloraAsset,validateFlora,floraOrganMatrix,removeFloraPart} from '../src/flora/flora.js';
import {billboardCards,validateBillboard} from '../src/flora/flora-billboards.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';

function closed(mesh){
 const edges=new Map();let volume=0;
 for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3),[a,b,c]=ids.map(j=>new T.Vector3().fromArray(mesh.positions,j*3));assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()>1e-16,'no collapsed coral triangles');volume+=a.dot(b.clone().cross(c))/6;for(let j=0;j<3;j++){const x=ids[j],y=ids[(j+1)%3],key=Math.min(x,y)+':'+Math.max(x,y),e=edges.get(key)||{count:0,winding:0};e.count++;e.winding+=x<y?1:-1;edges.set(key,e);}}
 assert.ok([...edges.values()].every(e=>e.count===2&&e.winding===0),'closed coral shells with consistent edge winding');assert.ok(volume>0,'coral faces point outward');
}
test('coral catalogue contains reusable closed parts, with blunt forks and local surface morphs',()=>{
 assert.equal(CORAL_PARTS.length,4);assert.equal(floraAsset('coral-encrusting-base'),undefined);assert.equal(floraAsset('coral-round-branch'),undefined);
 for(const a of CORAL_PARTS){assert.equal(floraAsset(a.id),a);assert.equal(a.alphaMap(),null);assert.ok(a.triangles<=(a.id==='coral-brain-lobe'?192:600));assert.ok(fs.existsSync(new URL(a.iconUrl)));closed(a.meshes[0]);
  assert.equal(floraPlacementCategory(a),'Surface parts');
  const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,a.id);
   const neutral=a.shapeMesh({width:.5,height:.5});assert.deepEqual(neutral.positions,a.meshes[0].positions);
   for(const key of ['width','height']){const low=a.shapeMesh({[key]:0}),high=a.shapeMesh({[key]:1});assert.deepEqual(low.indices,high.indices);assert.notDeepEqual(low.positions,high.positions);closed(low);closed(high);}
   o.morphs={width:.8,height:.3};
  validateFlora(f);const g=buildPart(makePart('flora',{flora:f}));try{assert.equal(geometryStats(g).triangles,a.triangles);g.traverse(m=>{if(m.isMesh){assert.equal(m.material.alphaTest,0);assert.equal(m.material.map,a.textureMap());}});}finally{disposePart(g);}
 }
});
test('brain coral stays a cheap noisy lump with continuous UVs across the crown and seam',()=>{
 const a=floraAsset('coral-brain-lobe'),m=a.meshes[0];assert.equal(a.triangles,192);
 // Keep silhouette variation gentle: no modeled maze walls or deep folds.
 let irregular=0;
 for(let i=0;i<m.positions.length-3;i+=3){const x=m.positions[i]/.7/1.1,y=m.positions[i+1]/.65/.95,z=m.positions[i+2]/.7,r=Math.hypot(x,y,z);assert.ok(r>.9&&r<1.1,'noise stays close to the rounded shell');if(Math.abs(r-1)>.008)irregular++;}
 assert.ok(irregular>20,'the low-poly lump has visible geometric noise');
 for(let i=0;i<m.indices.length;i+=3){const ids=m.indices.slice(i,i+3);for(let j=0;j<3;j++){const p=ids[j],q=ids[(j+1)%3];if(p===m.positions.length/3-1||q===m.positions.length/3-1)continue;assert.ok(Math.abs(m.uv[p*2]-m.uv[q*2])<.18,'no UV wrap strip');assert.ok(Math.abs(m.uv[p*2+1]-m.uv[q*2+1])<.18,'no crown UV fan strip');}}
});

test('coral examples use attached growth pieces without a generic branch or base',()=>{
 for(const kind of CORAL_FIXTURES){
  const f=coralAttachmentFixture(kind);validateFlora(JSON.parse(JSON.stringify(f)));assert.equal(f.branches.length,1);assert.equal(f.branches[0].anchor,true);assert.ok(f.organs.length>=4);assert.ok(f.organs.every(o=>CORAL_PARTS.some(a=>a.id===o.asset)));
  const parent=f.organs[0],child=f.organs[1],before=new T.Vector3().setFromMatrixPosition(floraOrganMatrix(f,child));parent.offset[0]+=1;const after=new T.Vector3().setFromMatrixPosition(floraOrganMatrix(f,child));assert.ok(Math.abs(after.x-before.x-1)<1e-6);assert.equal(child.parentOrgan,parent.id);
  const original=floraOrganMatrix(f,child).elements;parent.morphs={width:1};assert.notDeepEqual(floraOrganMatrix(f,child).elements,original);validateFlora(f);
  const arm=f.organs[1],count=f.organs.length;assert.equal(removeFloraPart(f,arm.id),true);assert.ok(f.organs.length<count);assert.ok(f.organs.some(o=>o.id===parent.id));
 }
});

test('willow spray has a connected top anchor, downward growth and editable billboard settings',()=>{
 assert.equal(floraAsset(WILLOW_SPRAY.id),WILLOW_SPRAY);validateBillboard(WILLOW_SPRAY.billboard);const mask=WILLOW_SPRAY.alphaMap().image;
 assert.ok(mask.data[((mask.height-1)*mask.width+64)*4]>200,'stalk reaches its exact top attachment');assert.ok(mask.data.some((v,i)=>i%4===0&&v===0));
 const card=billboardCards(WILLOW_SPRAY.billboard)[0];assert.equal(card.center[1]+card.height/2,0);assert.ok(card.height>card.width*2);assert.equal(WILLOW_SPRAY.billboard.count,1,'one low-cost connected spray per placement');
});
test('wetland trees reuse existing trunks, roots and profiles and keep independent editable attachments',()=>{
 const existing=new Set(PROCEDURAL_FLORA.map(a=>a.id));
 for(const [id,root] of [['weeping-willow','flora-forked-bough'],['red-mangrove','flora-stilt-base']]){
  const a=instantiateFloraTreePreset(id),b=instantiateFloraTreePreset(id);validateFlora(a.flora);assert.equal(a.flora.detail,'swbf2');assert.equal(a.flora.organs.filter(o=>o.kind==='bark')[0].asset,root);assert.ok(a.flora.organs.filter(o=>o.kind==='bark').every(o=>existing.has(o.asset)));assert.ok(a.flora.branches.filter(b=>!b.anchor).every(b=>existing.has(b.profile)));assert.ok(a.flora.branches.length>3);
  const ids=new Set([...a.flora.branches,...a.flora.organs].map(n=>n.id));assert.ok([...b.flora.branches,...b.flora.organs].every(n=>!ids.has(n.id)));
  const group=buildPart(makePart('flora',a));try{const box=new T.Box3().setFromObject(group),stats=geometryStats(group);assert.ok(box.max.y>4&&box.max.y<12,id+' useful tree scale');assert.ok(stats.triangles<10000,id+' economical complete tree');}finally{disposePart(group);}
  if(id==='weeping-willow')for(const o of a.flora.organs.filter(o=>o.asset===WILLOW_SPRAY.id)){assert.ok(new T.Vector3(0,1,0).transformDirection(floraOrganMatrix(a.flora,o)).y>.999,'willow sprays hang vertically from curved branches');}
 }
});
test('wetland presets and all four coral colonies save and export directly from their parts',()=>{
 const parts=['weeping-willow','red-mangrove'].map(id=>makePart('flora',instantiateFloraTreePreset(id)));
 for(const kind of CORAL_FIXTURES)parts.push(makePart('flora',{name:kind+' coral',flora:coralAttachmentFixture(kind)}));
 const project={format:'open-building-studio',version:1,name:'Flora export fixture',parts};validateProject(JSON.parse(JSON.stringify(project)));
 const out=createSWBF2Package(project,{aiNavigation:false});for(const ext of ['.msh','.odf','.tga'])assert.ok([...out.files.keys()].some(name=>name.endsWith(ext)));assert.ok(out.manifest.assets.every(a=>a.triangles>0));
});
