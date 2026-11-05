import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {makePart} from '../../src/core/model.js';
import {createInstanceCopies} from '../../src/core/instances.js';
import {instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';
import {createSWBF2Package} from '../../src/swbf2/export-swbf2.js';
import {acornTowerFixture} from '../fixtures/acorn-tower.js';

if(!process.argv[2])throw Error('Supply a fresh destination.');
const destination=path.resolve(process.argv[2]);if(fs.existsSync(destination))throw Error('Destination already exists.');
const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'));
const route=makePart('stair-route',{position:[20,7,-12],rotation:[0,.6,0]}),copies=createInstanceCopies([route],new Set([route.id]));copies[0].position=[-40,11,30];copies[0].rotation=[0,-.8,0];
const rooms=Array.from({length:150},(_,i)=>makePart('interior',{position:[i%15*12,0,Math.floor(i/15)*12],assemblyId:'rooms',assemblyName:'Rooms'}));
for(const [name,parts,separate,uniqueAssetNames=false,output='object'] of [
 ['tree-helpers',[tree],true],['tree-embedded',[tree],false],
 ['tree-unique',[tree],true,true],
 ['acorn-embedded',acornTowerFixture().parts,false],
 ['boxes-embedded',Array.from({length:70},(_,i)=>makePart('block',{position:[i*4,0,0]})),false],
 ['scene-helpers',[tree,route,...copies,...rooms],true,false,'scene'],
 ['asset-many-helpers',rooms,true]
]){
 const result=createSWBF2Package({format:'open-building-studio',version:1,name,parts},{output,uniqueAssetNames,separateCollisionHelpers:separate,shadows:false,lowDetail:false,aiNavigation:false}),root=path.join(destination,name);
 if(output==='object'){assert.equal(result.manifest.objects,1);assert.equal(result.manifest.asset.collisionHelpers.length>0,separate);}
 else{
  assert.equal(result.manifest.objects,result.manifest.assets.filter(a=>a.role!=='collision').reduce((n,a)=>n+(a.instanceCount||1),0));
  assert.ok(result.manifest.assets.some(a=>a.role==='collision'&&result.manifest.assets.some(parent=>parent.role==='collision'&&parent.name===a.attachedTo)));
 }
 for(const [name,data] of result.files){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
 console.log('Collision-helper native fixture: '+root+' ('+result.manifest.assets.length+' models)');
}
