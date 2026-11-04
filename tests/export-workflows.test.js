import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {makePart} from '../src/core/model.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {writeWorldFolder} from '../src/swbf2/swbf2-world-folder.js';
import {Directory} from './fixtures/directory-handle.js';
const index='Version(1);\nNextID(1);\nLayer("[Base]",0,0)\n{\nDescription("");\n}\nGameMode("Common")\n{\nLayer(0);\n}\n';
async function world(t){const folder=await mkdtemp(path.join(tmpdir(),'wb-workflows-'));t.after(()=>rm(folder,{recursive:true,force:true}));for(const name of ['msh','odf','world1'])await mkdir(path.join(folder,name));for(const [name,text] of [['WON.wld','Version(3);\nNextSequence(20);\n'],['WON.ldx',index],['WON.req','ucft { REQN { "world" "WON" } }']])await writeFile(path.join(folder,'world1',name),text);return new Directory(folder);}
const scene=(name,id)=>({format:'open-building-studio',version:1,name,parts:[makePart('block')],swbf2Exports:{active:'scene:scene',profiles:{'scene:scene':{id,values:{output:'scene'}}}}});
const pack=p=>createSWBF2Package(p,{shadows:false,lowDetail:false,aiNavigation:false},{packZip:false});
test('scene assets-only packages retain exact resource bytes and omit every placement/planning file',()=>{
 const p=scene('Scene resources','zip-scene'),full=pack(p),assets=createSWBF2Package(p,{shadows:false,lowDetail:false,assetsOnly:true},{packZip:false});assert.equal(assets.manifest.assetsOnly,true);assert.equal(assets.manifest.objects,0);assert.equal(assets.manifest.navigation,undefined);assert.equal(assets.manifest.layerFile,undefined);assert.ok(![...assets.files.keys()].some(path=>path.startsWith('world1/')||path.endsWith('.ps1')));
 for(const [path,value] of full.files)if(/^(msh|odf)\//.test(path))assert.deepEqual(assets.files.get(path),value,path);const other=scene('Scene resources','another-zip-scene');assert.notEqual(full.manifest.layerFile,pack(other).manifest.layerFile);assert.match(full.files.get('README.txt'),new RegExp(full.manifest.layerName));
});
test('independent scene layers, repeated replacement and assets-only preserve WorldEdit work',async t=>{
 const root=await world(t),a=scene('First','first-scene'),b=scene('Second','second-scene'),savedA=await writeWorldFolder(root,pack(a),{worldName:'WON'}),savedB=await writeWorldFolder(root,pack(b),{worldName:'WON'});
 assert.notEqual(savedA.layer,savedB.layer);const bLayer=await readFile(path.join(root.folder,savedB.layer),'utf8');assert.match(await readFile(path.join(root.folder,'world1/WON.ldx'),'utf8'),/wb_first_/);assert.match(await readFile(path.join(root.folder,'world1/WON.ldx'),'utf8'),/wb_second_/);
 const edited=(await readFile(path.join(root.folder,savedA.layer),'utf8'))+'\n// WorldEdit placement changes\n';await writeFile(path.join(root.folder,savedA.layer),edited);await writeFile(path.join(root.folder,'world1/WON.pln'),'authored planning');const before=await readFile(path.join(root.folder,'world1/WON.ldx'),'utf8');
 a.parts[0].scale=[2,3,4];const result=await writeWorldFolder(root,pack(a),{worldName:'WON',mode:'assets'});assert.ok(result.updated>0);assert.equal(await readFile(path.join(root.folder,savedA.layer),'utf8'),edited);assert.equal(await readFile(path.join(root.folder,'world1/WON.ldx'),'utf8'),before);assert.equal(await readFile(path.join(root.folder,'world1/WON.pln'),'utf8'),'authored planning');
 a.parts.push(makePart('orb'));await assert.rejects(writeWorldFolder(root,pack(a),{worldName:'WON',mode:'assets'}),/resources were added/);
 a.name='Renamed first';const renamed=await writeWorldFolder(root,pack(a),{worldName:'WON'});assert.equal(renamed.layer,savedA.layer);assert.equal(await readFile(path.join(root.folder,savedB.layer),'utf8'),bLayer);assert.equal((await readFile(path.join(root.folder,'world1/WON.ldx'),'utf8')).match(/Layer\("wb_first_[^"]+"/g).length,1);
});
test('single asset overwrite requires an explicit choice only when another asset owns the name',async t=>{
 const root=await world(t),a=scene('Same asset','first-asset');a.swbf2Exports.active='asset:one';a.swbf2Exports.profiles={'asset:one':{id:'first-asset',values:{output:'object'}}};const build=p=>createSWBF2Package(p,{output:'object',shadows:false,lowDetail:false},{packZip:false});
 await writeWorldFolder(root,build(a));a.parts[0].scale=[2,2,2];await writeWorldFolder(root,build(a));const before=await readFile(path.join(root.folder,'msh/same_asset.msh'));
 const b=structuredClone(a);b.swbf2Exports.profiles['asset:one'].id='second-asset';b.parts[0].scale=[3,3,3];await assert.rejects(writeWorldFolder(root,build(b)),error=>error.name==='ExportOwnershipError'&&error.conflicts.some(c=>c.path==='msh/same_asset.msh'));assert.deepEqual(await readFile(path.join(root.folder,'msh/same_asset.msh')),before);
 await writeWorldFolder(root,build(b),{allowOverwrite:true});assert.notDeepEqual(await readFile(path.join(root.folder,'msh/same_asset.msh')),before);b.parts[0].scale=[4,4,4];await writeWorldFolder(root,build(b));assert.equal(await readFile(path.join(root.folder,'world1/WON.ldx'),'utf8'),index);a.parts[0].scale=[5,5,5];await assert.rejects(writeWorldFolder(root,build(a)),error=>error.name==='ExportOwnershipError');
});

test('ownership metadata failure rolls back new resources before changing scene placements',async t=>{
 const root=await world(t),p=scene('Failed registration','failed-registration');root.fail.path=path.join('_wonderblocks','asset-owners.json');await assert.rejects(writeWorldFolder(root,pack(p),{worldName:'WON'}),/Disk write failed/);assert.equal(await readFile(path.join(root.folder,'world1/WON.ldx'),'utf8'),index);await assert.rejects(readFile(path.join(root.folder,'_wonderblocks/asset-owners.json')),{code:'ENOENT'});const {readdir}=await import('node:fs/promises');assert.deepEqual(await readdir(path.join(root.folder,'msh')),[]);assert.deepEqual(await readdir(path.join(root.folder,'odf')),[]);
});

test('removing generated navigation preserves authored planning and refuses dangling WorldEdit links',async t=>{
 const root=await world(t),p=scene('Planning owner','planning-owner'),source={worldName:'WON',planningFilename:'WON.pln',barrierFilename:'WON.bar',planning:'Hub("authored") { Pos(80,0,80); Radius(.4); }',barriers:'BarrierCount(0);',requests:[{filename:'WON.req',text:'ucft { REQN { "world" "WON" } }'}]};
 p.parts=[makePart('platform',{position:[0,2,0]})];Object.assign(p.parts[0].platform.sections[0],{width:2,depth:2,radius:0});p.parts[0].platform.railing='none';
 await writeFile(path.join(root.folder,'world1/WON.pln'),source.planning);await writeFile(path.join(root.folder,'world1/WON.bar'),source.barriers);
 const {createSWBF2Package:packageScene}=await import('../src/swbf2/export-swbf2.js'),generated=packageScene(p,{shadows:false,lowDetail:false},{navigationMerge:source,packZip:false});await writeWorldFolder(root,generated,{worldName:'WON',navigationSource:source});
 const before=await readFile(path.join(root.folder,'world1/WON.pln'),'utf8');assert.match(before,/authored/);assert.ok(before.includes(generated.manifest.navigation.prefix));
 await writeWorldFolder(root,pack(p),{worldName:'WON'});assert.equal(await readFile(path.join(root.folder,'world1/WON.pln'),'utf8'),before,'disabling planning preserves it by default');
 const hub=JSON.parse(generated.files.get('source/ai-navigation.json')).hubs.find(h=>h.name!=='authored').name;await writeFile(path.join(root.folder,'world1/WON.pln'),before+`\nConnection("manual") { Start("authored"); End("${hub}"); Flag(3); }`);await assert.rejects(writeWorldFolder(root,pack(p),{worldName:'WON',cleanupNavigation:true}),/Disconnect those references/);
 await writeFile(path.join(root.folder,'world1/WON.pln'),before);await writeWorldFolder(root,pack(p),{worldName:'WON',cleanupNavigation:true});const cleaned=await readFile(path.join(root.folder,'world1/WON.pln'),'utf8');assert.match(cleaned,/authored/);assert.ok(!cleaned.includes(generated.manifest.navigation.prefix));
});

test('the first identified re-export adopts its proven old layer and replaces its old planning prefix',async t=>{
 const root=await world(t),p=scene('Existing scene','adopted-scene'),legacy=structuredClone(p);delete legacy.swbf2Exports;legacy.parts=[makePart('platform',{position:[0,2,0]})];Object.assign(legacy.parts[0].platform.sections[0],{width:2,depth:2,radius:0});legacy.parts[0].platform.railing='none';p.parts=structuredClone(legacy.parts);
 const old=createSWBF2Package(legacy,{shadows:false,lowDetail:false,aiNavigation:false},{packZip:false}),first=await writeWorldFolder(root,old,{worldName:'WON'});assert.equal(first.registration.name,'wonderblocks');
 const oldNav=createSWBF2Package(legacy,{shadows:false,lowDetail:false},{packZip:false}),source={worldName:'WON',planningFilename:'WON.pln',barrierFilename:'WON.bar',planning:oldNav.files.get(oldNav.manifest.navigation.planningFile),barriers:oldNav.files.get(oldNav.manifest.navigation.barrierFile),requests:[{filename:'WON.req',text:await readFile(path.join(root.folder,'world1/WON.req'),'utf8')}]};
 await writeFile(path.join(root.folder,'world1/WON.pln'),source.planning);await writeFile(path.join(root.folder,'world1/WON.bar'),source.barriers);
 const oldReportPath=path.join(root.folder,'_wonderblocks/exports/existing_scene/export-report.json'),oldReport=JSON.parse(await readFile(oldReportPath,'utf8'));oldReport.navigation={...oldNav.manifest.navigation,planningFile:'world1/WON.pln',barrierFile:'world1/WON.bar',report:'_wonderblocks/exports/existing_scene/source/ai-navigation.json'};await writeFile(oldReportPath,JSON.stringify(oldReport));await writeFile(path.join(root.folder,oldReport.navigation.report),oldNav.files.get('source/ai-navigation.json'));
 const modern=createSWBF2Package(p,{shadows:false,lowDetail:false},{navigationMerge:source,packZip:false}),next=await writeWorldFolder(root,modern,{worldName:'WON',navigationSource:source});assert.equal(next.layer,first.layer);const planning=await readFile(path.join(root.folder,'world1/WON.pln'),'utf8');assert.ok(!planning.includes(oldNav.manifest.navigation.prefix));assert.ok(planning.includes(modern.manifest.navigation.prefix));
 const report=JSON.parse(await readFile(path.join(root.folder,'_wonderblocks/exports/adopted-scene/export-report.json'),'utf8')),nav=JSON.parse(await readFile(path.join(root.folder,report.navigation.report),'utf8'));assert.equal(nav.hubs.length,report.navigation.hubs);assert.equal(nav.hubs.length,oldNav.manifest.navigation.hubs);
});
