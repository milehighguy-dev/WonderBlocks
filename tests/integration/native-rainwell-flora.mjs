import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {createSWBF2Package} from '../../src/swbf2/export-swbf2.js';
import {SWBF2_VALIDATION_SCRIPT} from '../../src/swbf2/swbf2-validation.js';
import {runProcess} from '../../tools/test-process.mjs';
const root=process.argv[2]?path.resolve(process.argv[2]):await fs.mkdtemp(path.join(tmpdir(),'wb-rain-flora-'));if(process.argv[2])await fs.mkdir(root);
const project=JSON.parse(await fs.readFile(new URL('../../examples/projects/yavin-rainwell.building.json',import.meta.url),'utf8'));project.parts=project.parts.filter(p=>p.type==='flora');const before=JSON.stringify(project),result=createSWBF2Package(project,{aiNavigation:false});
for(const [name,data] of result.files){const file=path.join(root,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);}
assert.equal(JSON.stringify(project),before);const mains=result.manifest.assets.filter(a=>a.role!=='collision');assert.ok(mains.length>1);for(const asset of mains)assert.ok((asset.nativeLeafPatches||0)<=63);
const placements=mains.reduce((n,a)=>n+(a.instanceCount||1),0);assert.ok(placements>=project.parts.length);const represented=new Set(mains.flatMap(a=>a.sourcePartIds));for(const part of project.parts)assert.ok(represented.has(part.id));
await fs.writeFile(path.join(root,'validate-swbf2.ps1'),SWBF2_VALIDATION_SCRIPT);await runProcess('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'validate-swbf2.ps1'),'-ToolsPath',process.env.SWBF2_TOOLS_PATH||'C:/SWBF2_ModTools/BF2_ModTools/ToolsFL/bin'],{cwd:root,timeout:180000});
console.log('PASS Rainwell forest: '+project.parts.length+' separate plants, '+mains.length+' plant resources, '+placements+' plant placements; all meshes compiled. Artifacts: '+root);
