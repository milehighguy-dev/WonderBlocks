import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Class labels',parts});
const settings={aiNavigation:false,shadows:false,lowDetail:false};
const label=(parts,extra={})=>planSWBF2(project(parts),{...settings,output:'object',...extra}).assets[0].classLabel;

test('automatic labels use scaled geometry, all three dimensions and a two-metre cutoff',()=>{
 for(const scale of [[1,1,1],[2,2,2],[-2,1,.5]])assert.equal(label([makePart('block',{scale})]),'prop');
 for(const scale of [[2.01,1,1],[1,2.01,1],[1,1,2.01]])assert.equal(label([makePart('block',{scale})]),'building');
 assert.equal(label([makePart('block',{position:[500,300,-200],rotation:[0,Math.PI/2,0],scale:[1,1.5,.5]})]),'prop');
});
test('scene labels calculate each exported object or group without a single-asset override',()=>{
 const parts=[makePart('block',{position:[-50,0,0]}),makePart('block',{position:[50,0,0],scale:[1,5,1]})];
 const plan=planSWBF2(project(parts),{...settings,classLabel:'building'});
 assert.equal(plan.options.classLabel,'auto');assert.deepEqual(plan.assets.map(a=>a.classLabel),['prop','building']);
 parts[1].scale=[1,1,1];assert.deepEqual(planSWBF2(project(parts),settings).assets.map(a=>a.classLabel),['prop','prop']);
 assert.equal(label(parts),'building','single export measures the combined selection');
 for(const p of parts){p.assemblyId='group';p.assemblyName='Combined';}
 const combined=planSWBF2(project(parts),settings);assert.equal(combined.assets.length,1);assert.equal(combined.assets[0].classLabel,'building');
});
test('trees stay props and scene foliage keeps its leafpatch class',()=>{
 const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'));
 assert.equal(label([tree]),'prop');const result=createSWBF2Package(project([tree]),settings);
 assert.ok(result.manifest.assets.every(a=>a.classLabel==='prop'));
 assert.ok([...result.files].some(([name,text])=>name.endsWith('.odf')&&text.includes('ClassLabel = "leafpatch"')));
 for(const asset of result.manifest.assets)assert.match(result.files.get('odf/'+asset.name+'.odf'),/ClassLabel = "prop"/);
 assert.equal(label([tree],{classLabel:'building'}),'building','standalone override can change a tree label');
});
test('standalone override changes ODF labels and reports while preserving every mesh, texture and option',()=>{
 const p=project([makePart('stair-route')]),before=JSON.stringify(p);
 const automatic=createSWBF2Package(p,{...settings,output:'object'}),overridden=createSWBF2Package(p,{...settings,output:'object',classLabel:'prop'});
 assert.equal(automatic.manifest.asset.classLabel,'building');assert.equal(overridden.manifest.asset.classLabel,'prop');assert.equal(overridden.manifest.asset.classRecommendation.recommended,'building');
 assert.ok(overridden.manifest.asset.collisionHelpers.length>0);
 for(const asset of overridden.manifest.assets){assert.equal(asset.classLabel,'prop');assert.match(overridden.files.get('odf/'+asset.name+'.odf'),/ClassLabel = "prop"/);}
 for(const [name,bytes] of automatic.files)if(name.startsWith('msh/'))assert.deepEqual(overridden.files.get(name),bytes,name);
 assert.equal(JSON.stringify(p),before);
 const mesh=createSWBF2Package(project([makePart('block')]),{...settings,output:'mesh',classLabel:'building'});
 assert.ok(![...mesh.files.keys()].some(n=>n.endsWith('.odf')));assert.equal(mesh.manifest.settings.classLabel,'auto');
 assert.throws(()=>planSWBF2(p,{classLabel:'tree'}),/class label/);
});
