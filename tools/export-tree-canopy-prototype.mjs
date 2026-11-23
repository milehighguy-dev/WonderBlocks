// Export a baked tree into a fresh source package; never install or launch it.
import fs from 'node:fs';
import path from 'node:path';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {SWBF2_VALIDATION_SCRIPT} from '../src/swbf2/swbf2-validation.js';
const [source,destination]=process.argv.slice(2);
if(!source||!destination)throw Error('Supply a canopy bake folder and a new package folder.');
if(fs.existsSync(destination))throw Error('Output folder already exists.');
const project=JSON.parse(fs.readFileSync(path.join(source,'source.building.json'),'utf8')),bake=JSON.parse(fs.readFileSync(path.join(source,'canopy.json'),'utf8'));
for(const zone of bake.zones){if(path.basename(zone.texture)!==zone.texture)throw Error('Invalid canopy image path.');zone.bytes=new Uint8Array(fs.readFileSync(path.join(source,zone.texture)));}
const result=createSWBF2Package(project,{output:'object',shadows:false,aiNavigation:false,maxTextureSize:bake.textureSize,nativeTreeCanopy:bake},{packZip:false});
for(const [name,data] of result.files){const file=path.join(destination,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
fs.writeFileSync(path.join(destination,'validate-swbf2.ps1'),SWBF2_VALIDATION_SCRIPT);
console.log(JSON.stringify(result.manifest.renderCost.total));
