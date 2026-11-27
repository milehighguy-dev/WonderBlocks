import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {BIOME_PRESETS} from '../src/flora/data/biome-presets-data.js';
import {BIOME_TREE_FAMILIES} from '../src/flora/biome-variations.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {floraCurve,validateFlora} from '../src/flora/flora.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {createFloraPalette,FLORA_PALETTE_ASSETS,floraPaletteCategory} from '../src/flora/flora-palette.js';

test('every Archipelago tree has three distinct valid woody structures with connected branches',()=>{
 for(const family of BIOME_TREE_FAMILIES){
  const variants=BIOME_PRESETS.filter(p=>p.family===family);
  assert.equal(variants.length,3,family);
  const wood=variants.map(p=>JSON.stringify([p.floraPreset.branches,p.floraPreset.organs.filter(o=>o.kind==='bark')]));
  assert.equal(new Set(wood).size,3,family+' must vary its wood, not only the leaf seed');
  for(const p of variants){
   assert.equal(p.collection,'Archipelago');assert.equal(p.paletteCategory,'Tree presets');
   const f=instantiateFloraTreePreset(p.id).flora;validateFlora(f);
   for(const b of f.branches.filter(b=>b.parent&&!b.parentOrgan&&!b.branchSurface)){
    assert.deepEqual(b.points[0],[0,0,0]);
    assert.ok(floraCurve(f,b.id).getPoint(0).distanceTo(floraCurve(f,b.parent).getPoint(b.at))<1e-6,p.id+' attached '+b.name);
   }
  }
 }
});

test('mangroves, palms, coastal trees and deadwood have distinct habitat forms',()=>{
 const tree=id=>BIOME_PRESETS.find(p=>p.id==='biome-'+id).floraPreset;
 assert.equal(tree('black-mangrove').branches.filter(b=>/pneumatophore/.test(b.name)).length,10);
 assert.ok(!tree('black-mangrove').branches.some(b=>/prop root/.test(b.name)));
 assert.ok(tree('mangrove').branches.some(b=>/prop root/.test(b.name)));
 assert.ok(tree('fan-palm').organs.every(o=>o.asset==='biome-fan-frond'&&!o.billboard));
 assert.ok(tree('date-palm').organs.every(o=>o.asset==='biome-palm-frond'&&!o.billboard));
 assert.notEqual(tree('date-palm').organs.length,tree('coconut-palm').organs.length);
 assert.ok(tree('coastal-wind-tree').branches[0].points.at(-1)[0]>2);
 assert.ok(tree('treeline-conifer').branches.some(b=>/leader/.test(b.name)));
 assert.ok(tree('treeline-conifer').branches[0].points.at(-1)[1]<6);
 for(const kind of ['standing-snag','broken-tree','fallen-tree'])assert.equal(tree(kind).organs.length,0);
 assert.ok(tree('fallen-tree').branches[0].points.at(-1)[0]>6);
});

test('tree collection and habitat filters find Archipelago presets without hiding other categories',()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.attrs={};}append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}setAttribute(k,v){this.attrs[k]=v;}}
 const old=globalThis.document;globalThis.document={createElement:tag=>new El(tag)};
 try{
  const palette=createFloraPalette(()=>{},{initialCategory:'Tree presets'}),all=e=>[e,...e.children.flatMap(all)],nodes=all(palette),collection=nodes.find(e=>e.attrs['aria-label']==='Tree collection'),habitat=nodes.find(e=>e.attrs['aria-label']==='Tree habitat'),cards=()=>all(palette).filter(e=>e.attrs['data-flora-part']);
  collection.value='Archipelago';collection.onchange();assert.equal(cards().length,84);
  habitat.value='swamp';habitat.onchange();assert.ok(cards().some(c=>c.attrs['data-flora-part']==='biome-black-mangrove'));assert.ok(!cards().some(c=>c.attrs['data-flora-part']==='biome-oak'));
  const search=nodes.find(e=>e.tag==='input');search.value='Island Coconut Palm';search.oninput();assert.equal(cards().length,3,'global search ignores habitat filters');
  nodes.find(e=>e.tag==='button'&&e.textContent==='Biomes').onclick();assert.equal(cards().length,FLORA_PALETTE_ASSETS.filter(a=>floraPaletteCategory(a)==='Biomes').length);
  assert.equal(collection.value,'');assert.equal(habitat.value,'');
 }finally{globalThis.document=old;}
});

test('new trees keep their planted footprint and shape at lower detail',()=>{
 for(const id of ['black-mangrove','fan-palm','coastal-wind-tree','treeline-conifer','woodland-sapling','standing-snag','broken-tree','fallen-tree']){
  const roots=[false,true].map(lowDetail=>buildPart(makePart('flora',instantiateFloraTreePreset('biome-'+id)),{collision:false,lowDetail}));
  try{
   const stats=roots.map(root=>{let triangles=0;root.traverse(m=>{if(m.isMesh){triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));}});return {triangles,box:new T.Box3().setFromObject(root)};});
   assert.ok(stats[1].triangles<stats[0].triangles,id+' fewer triangles');
   const full=stats[0].box.getSize(new T.Vector3()),far=stats[1].box.getSize(new T.Vector3());
   for(const axis of ['x','y','z'])assert.ok(far[axis]/full[axis]>.65&&far[axis]/full[axis]<1.35,id+' retains '+axis+' extent');
  }finally{roots.forEach(disposePart);}
 }
});

test('native new tree exports include physical wood, low detail and resolved attachments',()=>{
 for(const id of ['black-mangrove','fan-palm','standing-snag']){
  const project={format:'open-building-studio',version:1,name:'arch_'+id.replaceAll('-','_'),parts:[makePart('flora',instantiateFloraTreePreset('biome-'+id))]};
  const {files,manifest}=createSWBF2Package(project,{output:'object',classLabel:'prop',includeCollision:true,shadows:false,aiNavigation:false,maxTextureSize:256},{packZip:false});
  assert.ok(manifest.assets.some(a=>a.role==='collision'||a.collisionTriangles>0||a.primitiveCollision),id+' physical wood');
  assert.ok(manifest.assets[0].lowDetailTriangles>0,id+' distant mesh');
  for(const [name,text] of files)if(name.endsWith('.odf'))for(const [,child] of text.matchAll(/AttachOdf = "([^"]+)"/g))assert.ok(files.has('odf/'+child+'.odf'),child);
 }
});
