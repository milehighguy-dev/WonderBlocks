import fs from 'node:fs';
import path from 'node:path';
import {makePart} from '../../src/core/model.js';
import {defaultRoute} from '../../src/routes/stair-route.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';
import {kotorRailingDefaults} from '../../src/routes/kotor-kashyyyk.js';
import {createSWBF2Package} from '../../src/swbf2/export-swbf2.js';

if(!process.argv[2])throw Error('Supply a fresh output directory.');
const destination=path.resolve(process.argv[2]);if(fs.existsSync(destination))throw Error('Output directory already exists.');
const route=defaultRoute();route.width=4;
route.segments=[{kind:'stairs',run:10,rise:2,steps:12,turn:'straight',curveAngle:Math.PI/2,railing:kotorRailingDefaults()}];
const interior=defaultInterior();interior.doors=[{axis:'x',line:0,offset:3,width:1.2,height:2.2}];
const parts=[makePart('flora',{...instantiateFloraTreePreset('endor-woodland-tree'),position:[20,0,20]}),makePart('stair-route',{route}),makePart('interior',{interior,position:[-20,0,0]})];
// Exceed the generated primitive allowance, covering exact mesh fallback through ModelMunge.
for(let i=0;i<130;i++)parts.push(makePart('interior',{interior:defaultInterior(),position:[i%13*10,0,60+Math.floor(i/13)*10]}));
const output=createSWBF2Package({format:'open-building-studio',version:1,name:'Native exporter regression',parts});
if(!output.manifest.assets.some(a=>a.meshSerializedBoxes))throw Error('Fixture did not exercise primitive-budget fallback.');
fs.mkdirSync(destination,{recursive:true});
for(const [name,data] of output.files){const file=path.join(destination,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
console.log('Representative native package: '+destination+' ('+output.manifest.assets.length+' assets)');
