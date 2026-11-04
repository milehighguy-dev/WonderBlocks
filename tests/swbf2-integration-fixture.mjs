// Create a small, fresh package for the PowerShell/native integration checks.
import fs from 'node:fs';
import path from 'node:path';
import {makePart} from '../src/core/model.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
if(!process.argv[2])throw Error('Usage: node tests/swbf2-integration-fixture.mjs NEW_OUTPUT_FOLDER');
const destination=path.resolve(process.argv[2]);
if(fs.existsSync(destination))throw Error('Choose a new empty output folder; the destination already exists.');
const part=makePart('platform',{position:[80,5,-90]});Object.assign(part.platform.sections[0],{width:2,depth:2,radius:0});part.platform.railing='none';
const output=createSWBF2Package({format:'open-building-studio',version:1,name:'Navigation integration fixture',parts:[part]});
fs.mkdirSync(destination,{recursive:true});
for(const [name,data] of output.files){const file=path.join(destination,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
console.log('Created the two-hub native integration package: '+destination);
