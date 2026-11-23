import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {planSWBF2,createSWBF2Package} from '../src/swbf2/export-swbf2.js';

test('native foliage retains its crown without duplicating it into the model LOD',()=>{
 const p={format:'open-building-studio',version:1,name:'Distant oak',parts:[makePart('flora',instantiateFloraTreePreset('biome-oak'))]},before=JSON.stringify(p),settings={output:'object',classLabel:'prop',shadows:false,includeCollision:false,aiNavigation:false},plan=planSWBF2(p,settings),asset=plan.assets[0];
 assert.ok(asset.leaves.length,'crowns remain native camera-facing leafpatches');
 assert.ok(!asset.lowDetailRules.includes('native-leaf-canopy-cards'));
 assert.ok(asset.lowDetailSegments.length,'rule-based bark LOD remains available');
 assert.ok(asset.lowDetailSegments.every(s=>!s.colors),'the bark model does not acquire foliage vertex-lighting streams');
 const result=createSWBF2Package(p,settings,{packZip:false});
 for(const [name,text] of result.files)if(name.endsWith('.odf')&&text.includes('ClassLabel = "leafpatch"'))assert.ok(text.includes('MaxDistance = "1000"')&&!text.includes('NumVisible'));
 assert.equal(JSON.stringify(p),before);
});

test('explicit native leaf distance overrides are bounded and survive export',()=>{
 const p={format:'open-building-studio',version:1,name:'Range',parts:[makePart('flora',instantiateFloraTreePreset('biome-oak'))]};
 for(const nativeLeafDistance of [0,-1,NaN,Infinity,2001])assert.throws(()=>planSWBF2(p,{nativeLeafDistance}),/Native leaf distance/);
 const r=createSWBF2Package(p,{output:'object',includeCollision:false,shadows:false,nativeLeafDistance:400,aiNavigation:false},{packZip:false});
 assert.ok([...r.files].filter(([n,t])=>n.endsWith('.odf')&&t.includes('ClassLabel = "leafpatch"')).every(([,t])=>t.includes('MaxDistance = "400"')));
});
