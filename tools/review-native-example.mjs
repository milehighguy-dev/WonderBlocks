// Explicit developer check. Normal exports never compile or bundle this script.
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {EXAMPLE_SCENES} from '../src/editor/example-scenes.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {SWBF2_VALIDATION_SCRIPT} from '../src/swbf2/swbf2-validation.js';
import {runProcess} from './test-process.mjs';
const id=process.argv[2]||'yavin-rainwell',scene=EXAMPLE_SCENES.find(scene=>scene.id===id);if(!scene)throw Error('Unknown example: '+id);
const root=await fs.mkdtemp(path.join(tmpdir(),'wb-example-native-'));console.log('Native example review: '+id+' — '+root);
const project=scene.load();project.parts=project.parts.filter(p=>p.type!=='character-reference');
const result=createSWBF2Package(project,{}, {packZip:false});
for(const [name,data] of result.files){const file=path.join(root,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);}
await fs.writeFile(path.join(root,'validate-swbf2.ps1'),SWBF2_VALIDATION_SCRIPT);
await runProcess('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'validate-swbf2.ps1'),'-ToolsPath',process.env.SWBF2_TOOLS_PATH||'C:/SWBF2_ModTools/BF2_ModTools/ToolsFL/bin'],{cwd:root,timeout:480000});
console.log('PASS '+id+': '+result.manifest.assets.length+' resources, '+result.manifest.objects+' placements, '+result.manifest.navigation?.hubs+' planning hubs.');
