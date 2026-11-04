import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {makePart} from '../../src/core/model.js';
import {instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';
import {createSWBF2Package} from '../../src/swbf2/export-swbf2.js';
import {acornTowerFixture} from '../fixtures/acorn-tower.js';

if(!process.argv[2])throw Error('Supply a fresh destination.');
const destination=path.resolve(process.argv[2]);if(fs.existsSync(destination))throw Error('Destination already exists.');
const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'));
for(const [name,parts,separate,uniqueAssetNames=false] of [
 ['tree-helpers',[tree],true],['tree-embedded',[tree],false],
 ['tree-unique',[tree],true,true],
 ['acorn-embedded',acornTowerFixture().parts,false],
 ['boxes-embedded',Array.from({length:70},(_,i)=>makePart('block',{position:[i*4,0,0]})),false]
]){
 const result=createSWBF2Package({format:'open-building-studio',version:1,name,parts},{output:'object',uniqueAssetNames,separateCollisionHelpers:separate,shadows:false,lowDetail:false}),root=path.join(destination,name);
 assert.equal(result.manifest.objects,1);assert.equal(result.manifest.asset.collisionHelpers.length>0,separate);
 for(const [name,data] of result.files){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
 console.log('Collision-helper native fixture: '+root+' ('+result.manifest.assets.length+' models)');
}
