import test from 'node:test';
import assert from 'node:assert/strict';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {BIOME_PRESETS} from '../src/flora/data/biome-presets-data.js';
import {biomeCrownVariant} from '../src/flora/biome-variations.js';

test('standalone trees retain native camera-facing leaves through bounded attachment trees',()=>{
 const part=makePart('flora',instantiateFloraTreePreset('biome-mangrove'));
 const {files,manifest}=createSWBF2Package({format:'open-building-studio',version:1,name:'native_mangrove',parts:[part]},{output:'object',classLabel:'prop',includeCollision:true,shadows:false,aiNavigation:false,maxTextureSize:256,compactTrees:false},{packZip:false});
 assert.equal(manifest.asset.foliage,'camera-facing-leafpatches');
 assert.ok(manifest.assets.reduce((n,a)=>n+(a.nativeLeafPatches||0),0)>16);
 const classes=new Map([...files].filter(([name])=>name.endsWith('.odf')).map(([name,text])=>[name.slice(4,-4),text]));
 const visited=new Set(),active=new Set();
 const visit=name=>{
  assert.ok(classes.has(name),name);assert.ok(!active.has(name),'attachment cycle');if(visited.has(name))return;
  active.add(name);const text=classes.get(name),children=[...text.matchAll(/AttachOdf = "([^"]+)"/g)].map(m=>m[1]);
  assert.ok((text.match(/AttachToHardPoint\s*=/g)||[]).length<=16,name);
  for(const child of children)visit(child);active.delete(name);visited.add(name);
 };
 visit(manifest.assets[0].name);
 for(const asset of manifest.assets)assert.ok(visited.has(asset.name),asset.name+' is reachable from the placed tree');
 const leaves=[...classes.values()].filter(t=>t.includes('ClassLabel = "leafpatch"'));assert.ok(leaves.length>16);
 assert.ok(leaves.every(t=>/MaxDistance = "1000"/.test(t)&&/MaxFallingLeaves = "0"/.test(t)));
});

test('tree variants differ in editable wood as well as their crowns',()=>{
 const spec=BIOME_PRESETS.find(p=>p.id==='biome-oak'),a=biomeCrownVariant(spec,0),b=biomeCrownVariant(spec,1),c=biomeCrownVariant(spec,2);
 assert.notDeepEqual(a.floraPreset.branches,b.floraPreset.branches);assert.notDeepEqual(a.floraPreset.branches,c.floraPreset.branches);
 assert.notDeepEqual(a.floraPreset.organs,b.floraPreset.organs);assert.notDeepEqual(b.floraPreset.organs,c.floraPreset.organs);
 assert.ok([a,b,c].every(p=>p.floraPreset.organs.filter(o=>o.billboard).every(o=>o.billboard.facing==='camera')));
});

test('shared collision families cannot escape the native asset namespace',()=>{
 const project={format:'open-building-studio',version:1,name:'Shared tree',parts:[]};
 for(const collisionFamily of ['../tree','Tree','tree/name','x'.repeat(32)])assert.throws(()=>createSWBF2Package(project,{collisionFamily}),/Collision family/);
});

test('every leafy crown family uses camera-facing patches while palm fronds stay modeled',()=>{
 const modeled=new Set(['date-palm','coconut-palm','understory-palm','pandanus','fan-palm']);
 const deadwood=new Set(['standing-snag','broken-tree','fallen-tree']);
 for(const spec of BIOME_PRESETS.filter(p=>p.family)){
  if(deadwood.has(spec.family)){assert.equal(spec.floraPreset.organs.length,0);continue;}
  const leaves=spec.floraPreset.organs.filter(o=>o.kind==='leaf');assert.ok(leaves.length,spec.id);
  if(modeled.has(spec.family))assert.ok(leaves.every(o=>!o.billboard),spec.id+' retains modeled fronds or strap leaves');
  else assert.ok(leaves.every(o=>o.billboard?.facing==='camera'),spec.id+' has no fixed crown leaves');
 }
});
