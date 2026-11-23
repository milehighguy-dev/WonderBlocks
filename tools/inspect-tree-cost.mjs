import fs from 'node:fs';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {planSWBF2} from '../src/swbf2/export-swbf2.js';
const out={};
for(const id of ['biome-oak','biome-kapok','biome-mangrove','biome-willow','biome-pine']){
 const p={format:'open-building-studio',version:1,name:id,parts:[makePart('flora',instantiateFloraTreePreset(id))]};
 const plan=planSWBF2(p,{output:'object',shadows:false,aiNavigation:false});out[id]=plan.assets.flatMap(a=>a.leaves);
 console.log(id,out[id].length,[...new Set(out[id].map(l=>l.fields.texture))].length,[...new Set(out[id].map(l=>l.fields.heightScale.toFixed(2)))].join(','));
}
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2));
