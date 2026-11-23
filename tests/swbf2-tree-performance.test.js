import test from 'node:test';
import assert from 'node:assert/strict';
import {compactLeafPatches,nativeLeafClusterKey,treeSpriteSegments,treeAtlasUV,treeCanopySignature,canopyZoneGroups,applyTreeCanopy} from '../src/swbf2/swbf2-tree-performance.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportMaterial,nativeLeafTexture} from '../src/swbf2/swbf2-textures.js';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {planSWBF2,createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {writeTGA} from '../src/swbf2/swbf2-binary.js';
const project=id=>({format:'open-building-studio',version:1,name:'Tree',parts:[makePart('flora',instantiateFloraTreePreset(id))]});

test('native tree sprites keep an asymmetric canopy upright in an off-center atlas cell',()=>{
 // Native model UVs use a bottom origin; atlas rectangles use image rows.
 const pixels=['green','red','blue','green'],sample=uv=>pixels[3-Math.floor(uv[1]*4)];
 for(const s of treeSpriteSegments({min:[-2,0,-2],max:[2,8,2]},0)){
  const base=s.positions.findIndex(p=>p[1]===0),top=s.positions.findIndex(p=>p[1]===8);
  for(const [t,color] of [[.01,'blue'],[.99,'red']]){
   const v=s.uvs[base][1]*(1-t)+s.uvs[top][1]*t;
   assert.equal(sample(treeAtlasUV([.25,v],[.25,.25,.5,.5])),color);
  }
 }
});
test('tree crown groups preserve particle counts and texture identities',()=>{
 const p=project('biome-kapok'),options={output:'object',shadows:false,aiNavigation:false},original=planSWBF2(p,{...options,compactTrees:false}).assets.flatMap(a=>a.leaves),grouped=compactLeafPatches(original);
 assert.ok(grouped.length<=original.length,'separate crown regions may remain separate rather than inflate their sampling domain');assert.equal(grouped.reduce((n,l)=>n+l.fields.count,0),original.reduce((n,l)=>n+l.fields.count,0));
 assert.deepEqual([...new Set(grouped.map(l=>l.fields.texture))],[...new Set(original.map(l=>l.fields.texture))]);
 assert.ok(grouped.every(l=>l.fields.radius>0&&l.fields.count<=192));
});
test('overhead atlases keep side views out of the overhead and unused quarters',()=>{
 const segments=treeSpriteSegments({min:[-2,0,-2],max:[2,8,2]},0,{overhead:true,canopyHeight:6});
 assert.equal(segments.length,3);
 for(const [i,segment] of segments.entries()){
  const [lo,hi]=[[0,.25],[.25,.5],[.5,.75]][i];
  assert.ok(segment.uvs.every(([u])=>u>=lo&&u<=hi));
 }
 assert.ok(segments[2].positions.every(p=>p[1]===6));
});
test('whole-tree sprites use four triangles without introducing vertex lighting',()=>{
 const p=project('biome-oak'),sprite={bytes:writeTGA(16,16,new Uint8Array(16*16*4)),bounds:{min:[-8,0,-8],max:[8,16,8]}},r=createSWBF2Package(p,{output:'object',includeCollision:false,shadows:false,aiNavigation:false,nativeTreeSprite:sprite,nativeLeafDistance:180},{packZip:false});
 const a=r.manifest.assets[0];assert.equal(a.lowDetailTriangles,4);assert.deepEqual(a.lowDetailConstruction,['whole-tree-cutout-sprite']);
 assert.ok(!String(r.files.get('msh/'+a.name+'.msh.option')).includes('-vertexlighting'));
 assert.ok(r.manifest.renderCost.total.leafObjects>0,'trunk sprites do not remove independent leaf objects');
 assert.equal(r.manifest.renderCost.perRoot[0].foliageFollowsModelLOD,false);
});

const cloud=(x=0,extra={})=>({position:[x,0,0],rotation:[0,0,0,1],fields:{texture:'leaves',heightScale:.7,count:10,radius:2,height:2,offset:0,minSize:1,maxSize:1,darknessMin:.5,darknessMax:1,atlas:2,...extra}});
test('bounded compaction preserves disconnected crowns, hanging sprays and fixed baked cards',()=>{
 const left=cloud(-20),right=cloud(20),hanging=cloud(0,{heightScale:3}),card=cloud(0,{count:1,radius:.001,height:0}),input=[left,right,hanging,card],before=JSON.stringify(input);
 assert.deepEqual(new Set(compactLeafPatches(input,{target:1})),new Set(input));
 assert.equal(JSON.stringify(input),before);
 const adjacent=[cloud(),cloud(.1)],grouped=compactLeafPatches(adjacent,{target:1});
 assert.equal(grouped.length,1);assert.equal(grouped[0].fields.count,20);
 assert.equal(compactLeafPatches([cloud(0,{count:100}),cloud(.1,{count:100})],{target:1}).length,2);
 const mixed=[cloud(),cloud(.1),cloud(-20,{texture:'other'}),cloud(20,{texture:'other'})];
 assert.equal(compactLeafPatches(mixed,{target:3}).length,3,'the target applies to the whole crown, not separately to every texture bucket');
});

test('leaf compaction is independent of physical collision and model LOD switches',()=>{
 const p=project('biome-kapok'),base={output:'object',shadows:false,aiNavigation:false},leaves=s=>planSWBF2(p,{...base,...s}).assets.flatMap(a=>a.leaves);
 // Deliberately overlapping authored patches exercise actual merging, rather
 // than relying on a preset's unrelated crown regions being merged together.
 const organ=p.parts[0].flora.organs.find(o=>o.billboard);
 p.parts[0].flora.organs=Array.from({length:5},()=>({...structuredClone(organ),id:crypto.randomUUID()}));
 const on=leaves({includeCollision:true,lowDetail:true}),off=leaves({includeCollision:false,lowDetail:false}),raw=leaves({includeCollision:false,lowDetail:false,compactTrees:false});
 assert.deepEqual(on,off);assert.ok(off.length<raw.length);
 assert.equal(off.reduce((n,l)=>n+l.fields.count,0),raw.reduce((n,l)=>n+l.fields.count,0));
});

test('canopy zones retain every source patch and reject edited crowns or incomplete bakes',()=>{
 const leaves=[cloud(-4),cloud(-3),cloud(3),cloud(4)],sources=canopyZoneGroups(leaves,2),bytes=writeTGA(16,16,new Uint8Array(16*16*4));
 assert.deepEqual(sources,[[0,1],[2,3]]);
 const bake={sourceSignature:treeCanopySignature(leaves),zones:sources.map(sources=>({sources,bytes,width:10,height:5,center:[0,0,0]}))};
 assert.equal(applyTreeCanopy(leaves,bake,()=> 'baked').length,2);
 assert.throws(()=>applyTreeCanopy([cloud(-5),...leaves.slice(1)],bake,()=> 'baked'),/no longer matches/);
 assert.throws(()=>applyTreeCanopy(leaves,{...bake,zones:bake.zones.slice(0,1)},()=> 'baked'),/missing/);
 assert.throws(()=>applyTreeCanopy(leaves,{...bake,zones:[...bake.zones,bake.zones[0]]},()=> 'baked'),/repeated/);
});

test('whole-canopy export reduces leaf entities without changing physical tree surfaces',()=>{
 const p=project('biome-oak'),settings={output:'object',shadows:false,aiNavigation:false,maxTextureSize:256,compactTrees:false},plan=planSWBF2(p,settings),leaves=plan.assets.flatMap(a=>a.leaves),bytes=writeTGA(16,16,new Uint8Array(16*16*4));
 const bake={sourceSignature:treeCanopySignature(leaves),zones:canopyZoneGroups(leaves).map(sources=>({sources,bytes,width:10,height:5,center:[0,10,0]}))};
 const before=createSWBF2Package(p,settings,{packZip:false}),after=createSWBF2Package(p,{...settings,nativeTreeCanopy:bake},{packZip:false});
 assert.equal(after.manifest.renderCost.total.leafObjects,4);assert.ok(before.manifest.renderCost.total.leafObjects>4);
 const physical=r=>r.manifest.assets.filter(a=>a.role==='collision').map(a=>[a.name,a.collisionBodies,a.sourceCollisionBodies,a.collisionTriangles,a.helperOffset,a.attachedTo,a.attachmentHardpoint]);
 assert.deepEqual(physical(after),physical(before));
 for(const a of before.manifest.assets.filter(a=>a.role==='collision'))assert.deepEqual(after.files.get('msh/'+a.name+'.msh'),before.files.get('msh/'+a.name+'.msh'));
 assert.ok(after.files.has('source/render-cost.json'));
 assert.equal(after.manifest.settings.nativeTreeCanopy.zones,4);
});

test('baked leaf clouds reduce actual cards while preserving independent bark collision',()=>{
 const p=project('biome-kapok'),root=buildPart(p.parts[0],{collision:false}),clouds={},bytes=writeTGA(16,16,new Uint8Array(16*16*4));
 try{root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.userData.floraBillboard)return;
  const settings=mesh.geometry.userData.billboard.settings,native=nativeLeafTexture(exportMaterial(mesh.material,{maxTextureSize:256}),settings.atlas,256);
  clouds[nativeLeafClusterKey(mesh,native.bytes)]={bytes,width:4,height:3,center:[0,0,0]};
 });}finally{disposePart(root);}
 const options={output:'object',classLabel:'prop',shadows:false,aiNavigation:false,maxTextureSize:256},before=planSWBF2(p,options),after=createSWBF2Package(p,{...options,nativeLeafClusters:clouds},{packZip:false}),records=after.manifest.assets;
 const original=before.assets.reduce((n,a)=>n+a.leaves.reduce((n,l)=>n+l.fields.count,0),0),cards=records.reduce((n,a)=>n+(a.nativeLeafTriangles??0)/2,0);
 assert.ok(cards<original/10,`${cards} rendered cards replace ${original}`);
 assert.equal(records.reduce((n,a)=>n+(a.originalLeafParticles??0),0),original);
 assert.equal(after.manifest.settings.nativeLeafClusters.entries,Object.keys(clouds).length);
 assert.ok(records.filter(a=>a.role==='collision').every(a=>a.collisionBodies.length===1&&!a.collisionGeometry));
 const leaves=[...after.files].filter(([n])=>n.includes('_leaves_')&&n.endsWith('.odf'));
 assert.ok(leaves.length);assert.ok(leaves.every(([,text])=>!text.includes('NaN')&&!text.includes('Infinity')));
});
