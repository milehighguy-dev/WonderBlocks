import fs from 'node:fs';
import path from 'node:path';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
const destination=path.resolve(process.argv[2]);
if(fs.existsSync(destination))throw Error('Use a fresh export directory');
const project=JSON.parse(fs.readFileSync(new URL('../examples/projects/cinderlock.building.json',import.meta.url),'utf8'));
project.name='CLF';
// Place the playable solid terraces above SDK terrain without changing their relative heights.
for(const p of project.parts){p.position[1]+=20;if(p.route&&Number.isFinite(p.route.groundHeight))p.route.groundHeight+=20;}
project.parts=project.parts.filter(p=>!/capture console|illuminated display|locator mast/.test(p.name));
const output=createSWBF2Package(project);
fs.mkdirSync(destination,{recursive:true});
for(const [name,bytes] of output.files){const file=path.join(destination,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}
fs.writeFileSync(path.join(destination,'cinderlock.swbf2.zip'),output.zip);
console.log(JSON.stringify({assets:output.manifest.assets.length,budget:output.manifest.primitiveBudget,navigation:output.manifest.navigation,warnings:output.manifest.warnings},null,2));
