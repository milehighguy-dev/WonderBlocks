import {SWBF2_VALIDATION_SCRIPT} from '../src/swbf2/swbf2-validation.js';
import {readdir,mkdtemp,access,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {runProcess} from './test-process.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const mode=process.argv[2]||'all';
const valid=['all','unit','integration','native','release'];
if(!valid.includes(mode))throw Error('Use: node tools/run-tests.mjs ['+valid.join('|')+']');
const node=(args,timeout=120000)=>runProcess(process.execPath,args,{cwd:root,timeout});
// Developer fixtures stage the internal checker explicitly; downloads never contain it.
const stageChecker=folder=>writeFile(path.join(folder,'validate-swbf2.ps1'),SWBF2_VALIDATION_SCRIPT);
const ps=(script,args=[])=>runProcess('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,...args],{cwd:root,timeout:180000});
async function integrations(native=false){
 if(process.platform!=='win32')throw Error('PowerShell/SDK integration requires Windows. Run test:unit and test:browser separately on other systems. No native pass is claimed.');
 const tools=process.env.SWBF2_TOOLS_PATH||'C:/SWBF2_ModTools/BF2_ModTools/ToolsFL/bin';
 if(native)for(const name of ['WorldMunge.exe','PathPlanningMunge.exe','LevelPack.exe','pc_ModelMunge.exe','pc_TextureMunge.exe','OdfMunge.exe']){
  try{await access(path.join(tools,name));}catch{throw Error('Native test unavailable: missing '+path.join(tools,name)+'. Set SWBF2_TOOLS_PATH.');}
 }
 // Short, unique paths avoid SDK MAX_PATH failures; preserve logs for review.
 const parent=await mkdtemp(path.join(tmpdir(),'wb-check-')),fixture=path.join(parent,'nav');
 console.log('Integration artifacts: '+parent);
 await node(['tests/swbf2-integration-fixture.mjs',fixture]);
 await stageChecker(fixture);
 await ps('tests/swbf2-validation-preflight.ps1',['-PackagePath',fixture]);
 await ps('tests/swbf2-navigation-merge.ps1',['-PackagePath',fixture,...(native?['-NativeToolsPath',tools]:[])]);
 if(native){
  await node(['tests/integration/native-rainwell-flora.mjs',path.join(parent,'rainwell-flora')],240000);
  await node(['tests/integration/native-layer-registration.mjs',path.join(parent,'layer-registration')],180000);
  await node(['tests/integration/native-export-workflows.mjs'],180000);
  await node(['tests/integration/native-navigation-merge.mjs',path.join(parent,'navigation-merge')],180000);
  const assets=path.join(parent,'assets');await node(['tests/integration/native-assets.mjs',assets],180000);
  await stageChecker(assets);await ps(path.join(assets,'validate-swbf2.ps1'),['-ToolsPath',tools]);
  const standalone=path.join(parent,'standalone');await node(['tests/integration/native-standalone.mjs',standalone],180000);
  for(const name of ['assembly','tree','primitive-overflow']){await stageChecker(path.join(standalone,name));await ps(path.join(standalone,name,'validate-swbf2.ps1'),['-ToolsPath',tools]);}
  const helpers=path.join(parent,'collision-helpers');await node(['tests/integration/native-collision-helpers.mjs',helpers],180000);
  for(const name of ['tree-helpers','tree-embedded','tree-unique','acorn-embedded','boxes-embedded','scene-helpers','asset-many-helpers']){await stageChecker(path.join(helpers,name));await ps(path.join(helpers,name,'validate-swbf2.ps1'),['-ToolsPath',tools]);}
 }
 console.log('PASS '+(native?'native model/texture/object/world/planning':'PowerShell package/merge')+' integration');
}
try{
 if(['all','unit','release'].includes(mode)){
  const tests=(await readdir(path.join(root,'tests'))).filter(n=>n.endsWith('.test.js')).sort();
  await node(['--test','--test-concurrency=4',...tests.map(n=>'tests/'+n)],900000);
 }
 if(['all','integration','release'].includes(mode)){
  await node(['tests/integration/browser.mjs'],360000);
  await node(['tests/integration/collision-helpers.mjs'],120000);
  await node(['tests/integration/navigation-merge.mjs'],120000);
  await node(['tests/integration/export-readiness.mjs'],120000);
  await node(['tests/integration/world-folder.mjs'],120000);
  await node(['tests/integration/export-workflows.mjs'],120000);
  await node(['tests/integration/instances.mjs'],120000);
  await node(['tests/integration/scene-edit-regressions.mjs'],120000);
  await node(['tests/integration/worker-startup.mjs'],120000);
  await node(['tests/integration/group-scale.mjs'],120000);
  await node(['tests/integration/texture-palette.mjs'],120000);
  await node(['tests/integration/texture-folders.mjs'],120000);
  await node(['tests/integration/export-responsive.mjs'],360000);
  await node(['tests/integration/scene-loading.mjs'],180000);
  await node(['tests/integration/scale-controls.mjs'],120000);
  await node(['tests/integration/floor-openings.mjs'],120000);
  await integrations(false);
 }
 if(['native','release'].includes(mode))await integrations(true);
}catch(error){console.error(error.message);process.exitCode=1;}
