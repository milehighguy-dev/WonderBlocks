import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';

test('single-card willow sprays have a valid native leaf sampling domain',()=>{
 // LeafPatchClass::Init computes (Height / HeightScale) / Radius before
 // accumulating class bounds. A zero-radius card poisons the static scene tree.
 assert.ok(Number.isNaN((0/2.2)/0*0),'the former zero-spread export produces NaN');
 for(const id of ['biome-willow','biome-willow-b','biome-willow-c']){
  const p={format:'open-building-studio',version:1,name:id,parts:[makePart('flora',instantiateFloraTreePreset(id))]},result=createSWBF2Package(p,{output:'object',classLabel:'prop',includeCollision:false,shadows:false,aiNavigation:false,maxTextureSize:256,compactTrees:false},{packZip:false});
  let single=0;
  for(const [name,text] of result.files){
   if(!name.endsWith('.odf')||!text.includes('ClassLabel = "leafpatch"'))continue;
   const values=Object.fromEntries([...text.matchAll(/^(\w+)\s*=\s*"([^"\n]+)"/gm)].map(m=>[m[1],m[2]]));
   const radius=Math.fround(Number(values.Radius)),height=Math.fround(Number(values.Height)),scale=Math.fround(Number(values.HeightScale));
   assert.ok(radius>0&&Number.isFinite(radius),id+' / '+name);
   for(const y of [-radius,0,radius])assert.ok(Number.isFinite(Math.fround(Math.fround(Math.fround(height/scale)/radius)*y)));
   if(Number(values.NumParticles)===1){single++;assert.equal(radius,Math.fround(.001));assert.equal(height,0);}
  }
  assert.equal(single,48,id+' retains all hanging spray cards');
 }
});
