import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {makePart} from '../../src/core/model.js';
import {instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';
import {createSWBF2Package} from '../../src/swbf2/export-swbf2.js';

if(!process.argv[2])throw Error('Supply a fresh destination.');
const destination=path.resolve(process.argv[2]);if(fs.existsSync(destination))throw Error('Destination already exists.');
const cases=[
 ['assembly',[makePart('block'),makePart('stair-route',{position:[4,0,0]})],{output:'object'}],
 ['tree',[makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'))],{output:'mesh',includeCollision:false}],
 ['primitive-overflow',Array.from({length:66},(_,i)=>makePart('block',{position:[i%11*2,0,Math.floor(i/11)*2]})),{output:'object'}],
];
for(const [name,parts,settings] of cases){
 const result=createSWBF2Package({format:'open-building-studio',version:1,name:'Standalone '+name,parts},settings),root=path.join(destination,name);
 assert.equal(result.manifest.objects,1);assert.ok(![...result.files.keys()].some(n=>n.startsWith('world1/')));
 if(name==='tree')assert.equal(result.manifest.assets.length,1);else assert.ok(result.manifest.asset.collisionHelpers.length>0);
 for(const [name,data] of result.files){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
 console.log('Standalone native fixture: '+root+' ('+result.manifest.assets.length+' models)');
}
