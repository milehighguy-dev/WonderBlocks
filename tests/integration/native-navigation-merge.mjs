// Development-only: compare the browser merge to the existing PowerShell helper,
// then compile it in a test project with a supplied existing-world scaffold.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {makePart} from '../../src/core/model.js';
import {createSWBF2Package} from '../../src/swbf2/export-swbf2.js';
import {parsePlanning,parseBarriers} from '../../src/swbf2/swbf2-navigation-merge.js';
import {SWBF2_VALIDATION_SCRIPT} from '../../src/swbf2/swbf2-validation.js';
import {runProcess} from '../../tools/test-process.mjs';
const root=process.argv[2]?path.resolve(process.argv[2]):await fs.mkdtemp(path.join(tmpdir(),'wb-merge-native-'));
if(process.argv[2]){try{await fs.access(root);throw Error('Choose a fresh native fixture folder.');}catch(error){if(error.code!=='ENOENT')throw error;}await fs.mkdir(root,{recursive:true});}
const world='Version(3);\nSaveType(0);\nNextSequence(1);\n',hub=(name,p)=>`Hub("${name}") { Pos(${p}); Radius(.4); }`,link=(name,a,b)=>`Connection("${name}") { Start("${a}"); End("${b}"); Flag(3); }`;
const source={worldName:'ABC',planningFilename:'ABC.pln',barrierFilename:'ABC.bar',planning:hub('old_a',[100,10,100])+hub('old_b',[104,10,100])+link('old_link','old_a','old_b'),barriers:'BarrierCount(1);\nBarrier("old_bar") { Corner(300,0,300); Corner(301,0,300); Corner(301,0,301); Corner(300,0,301); Flag(63); }',requests:[{filename:'ABC.req',text:'ucft\n{\n REQN { "world" "ABC" }\n}\n'}]};
const part=makePart('platform',{position:[80,5,-90]});Object.assign(part.platform.sections[0],{width:2,depth:2,radius:0});part.platform.railing='none';
const project={format:'open-building-studio',version:1,name:'Native merged navigation',parts:[part]},settings={shadows:false,lowDetail:false};
const modern=createSWBF2Package(project,settings,{navigationMerge:source}),legacy=createSWBF2Package(project,settings);
async function writePackage(folder,result){for(const [name,data] of result.files){const file=path.join(folder,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);}}
const oldRoot=path.join(root,'legacy'),newRoot=path.join(root,'merged');await writePackage(oldRoot,legacy);await writePackage(newRoot,modern);
for(const [name,text] of [['ABC.wld',world],['ABC.pln',source.planning],['ABC.bar',source.barriers],['ABC.req',source.requests[0].text]])await fs.writeFile(path.join(oldRoot,'world1',name),text);
const ps=(script,args=[])=>runProcess('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,...args],{cwd:root,timeout:180000});
await ps(path.join(oldRoot,'merge-ai-navigation.ps1'),['-WorldFile',path.join(oldRoot,'world1','ABC.wld')]);
const graphSummary=text=>{const graph=parsePlanning(text);return {hubs:graph.hubs.map(h=>[h.name,h.position,h.radius]),connections:graph.connections.map(c=>[c.name,c.start,c.end,c.flags])};};
assert.deepEqual(graphSummary(modern.files.get('world1/ABC.pln')),graphSummary(await fs.readFile(path.join(oldRoot,'world1','ABC.pln'),'utf8')));
const barrierSummary=text=>parseBarriers(text).map(b=>[b.name,b.corners,b.flags]);assert.deepEqual(barrierSummary(modern.files.get('world1/ABC.bar')),barrierSummary(await fs.readFile(path.join(oldRoot,'world1','ABC.bar'),'utf8')));
assert.equal(modern.files.get('world1/ABC.req'),await fs.readFile(path.join(oldRoot,'world1','ABC.req'),'utf8'));
// The real map is intentionally absent from downloads. This test supplies one
// so WorldMunge and LevelPack can check the merged companion files together.
await fs.writeFile(path.join(newRoot,'world1','ABC.wld'),world);const report=structuredClone(modern.manifest);report.files.push('world1/ABC.wld');await fs.writeFile(path.join(newRoot,'export-report.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join(newRoot,'validate-swbf2.ps1'),SWBF2_VALIDATION_SCRIPT);
await ps(path.join(newRoot,'validate-swbf2.ps1'),['-ToolsPath',process.env.SWBF2_TOOLS_PATH||'C:/SWBF2_ModTools/BF2_ModTools/ToolsFL/bin']);
console.log('PASS browser/PowerShell merge parity and native planning/world/level checks. Artifacts: '+root);
