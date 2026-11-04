import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {writeFileSync} from 'node:fs';
import {inspectWorldFolder,worldFolderNavigation,worldFolderFiles,writeWorldFolder} from '../src/swbf2/swbf2-world-folder.js';

// Real disk I/O behind the browser handle interface exercises partial writes,
// empty files, backups and restoration without touching any installed world.
import {Directory} from './fixtures/directory-handle.js';
function measuredDirectory(root,metrics,{fail=false}={}){
 return new Proxy(root,{get(target,key){
  if(key==='getDirectoryHandle')return async(...args)=>{metrics.directories++;return measuredDirectory(await target.getDirectoryHandle(...args),metrics,{fail});};
  if(key==='getFileHandle')return async(...args)=>{const handle=await target.getFileHandle(...args);return {...handle,createWritable:async()=>{const stream=await handle.createWritable();return {...stream,write:async value=>{
   metrics.active++;metrics.peak=Math.max(metrics.peak,metrics.active);
   try{await stream.write(value);await new Promise(resolve=>setTimeout(resolve,handle.name==='courtyard.msh'?35:3));if(fail&&handle.name==='white.tga')throw Error('Batched write failed');}finally{metrics.active--;}
  }};}};};
  return typeof target[key]==='function'?target[key].bind(target):target[key];
 }});
}
const originalIndex='Version(1);\nNextID(2);\nLayer("[Base]",0,0)\n{\n Description("");\n}\nLayer("conquest",1,0)\n{\n Description("");\n}\nGameMode("Common")\n{\n Layer(0);\n}\nGameMode("conquest")\n{\n Layer(1);\n}\n';
async function fixture(t){const folder=await mkdtemp(path.join(tmpdir(),'wb-world-folder-'));t.after(()=>rm(folder,{recursive:true,force:true}));for(const name of ['msh','odf','world1'])await mkdir(path.join(folder,name));await writeFile(path.join(folder,'world1/courtyard.ldx'),originalIndex);await writeFile(path.join(folder,'world1/courtyard.wld'),'Version(3);\nNextSequence(100);\n');await writeFile(path.join(folder,'world1/courtyard.req'),'ucft\n{\n REQN\n {\n  "world"\n  "courtyard"\n }\n}\n');return new Directory(folder);}
const result=(navigation)=>({filename:'courtyard.swbf2.zip',manifest:{navigation,layerFile:'world1/courtyard_wonderblocks.lyr'},files:new Map([
 ['msh/courtyard.msh',new Uint8Array([1,2,3])],['msh/courtyard.msh.option','-donotmergecollision\n'],['msh/white.tga',new Uint8Array([7,8])],['msh/white.tga.option','-maps 1\n'],['odf/courtyard.odf','[GameObjectClass]\nClassLabel = "building"\n'],['world1/courtyard_wonderblocks.lyr','Version(3);\nNextSequence(2);\nObject("test", "block", 1)\n{\n Layer(1);\n SeqNo(1);\n}\n'],['world1/courtyard.wld','scaffold'],['world1/courtyard.ldx','scaffold'],['source/courtyard.building.json','{}'],['README.txt','readme'],['export-report.json','{}']
])});
test('direct file plan retains source assets and import layer, isolates reports and excludes replacement scaffolds/scripts',()=>{
 const input=result(),files=worldFolderFiles(input);assert.ok(files.has('msh/courtyard.msh'));assert.ok(files.has('msh/white.tga.option'));assert.ok(files.has('odf/courtyard.odf'));assert.ok(files.has('world1/courtyard_wonderblocks.lyr'));assert.ok(files.has('_wonderblocks/exports/courtyard/source/courtyard.building.json'));assert.ok(![...files.keys()].some(p=>/\.(wld|ldx|ps1)$/.test(p)));
 input.files.set('world1/courtyard.pln','Hub');assert.throws(()=>worldFolderFiles(input),/Merge with existing/);input.manifest.navigation={merged:true};assert.ok(worldFolderFiles(input).has('world1/courtyard.pln'));
 input.files.set('msh/../../elsewhere.msh','bad');assert.throws(()=>worldFolderFiles(input),/Unsupported/);
});
test('world root is recognized, navigation reads world1 only and existing names/requests are retained',async t=>{
 const root=await fixture(t);await writeFile(path.join(root.folder,'world1/ABC.pln'),'Hub("Old") { Pos(20,0,20); Radius(.4); }');await writeFile(path.join(root.folder,'world1/ABC.bar'),'BarrierCount(0);');await writeFile(path.join(root.folder,'world1/ABC.req'),'ucft { REQN { "world" "ABC" } }');await writeFile(path.join(root.folder,'msh/bad.pln'),'ignored');
 assert.equal((await inspectWorldFolder(root)).canWriteWorld,true);const worlds=await worldFolderNavigation(root);assert.equal(worlds.length,1);assert.equal(worlds[0].planningFilename,'ABC.pln');assert.equal(worlds[0].requests[0].filename,'ABC.req');assert.equal((await inspectWorldFolder(await root.getDirectoryHandle('world1'))).canWriteWorld,false);
});
test('writes real assets/options, backs up matching bytes and leaves authored world files untouched',async t=>{
 const root=await fixture(t);await writeFile(path.join(root.folder,'msh/courtyard.msh'),Buffer.from([42,43]));await writeFile(path.join(root.folder,'msh/courtyard.msh.option'),'old flags');await writeFile(path.join(root.folder,'world1/courtyard.wld'),'authored world');await writeFile(path.join(root.folder,'odf/keep.odf'),'authored prop');
 const saved=await writeWorldFolder(root,result(),{backupName:'test-backup'});assert.equal(saved.layer,'world1/courtyard_wonderblocks.lyr');assert.equal(saved.backup,'_wonderblocks/backups/test-backup');assert.deepEqual([...await readFile(path.join(root.folder,'msh/courtyard.msh'))],[1,2,3]);assert.deepEqual([...await readFile(path.join(root.folder,saved.backup,'msh/courtyard.msh.wbbackup'))],[42,43]);assert.equal(await readFile(path.join(root.folder,saved.backup,'msh/courtyard.msh.option.wbbackup'),'utf8'),'old flags');
 for(const [file,text] of [['world1/courtyard.wld','authored world'],['odf/keep.odf','authored prop']])assert.equal(await readFile(path.join(root.folder,file),'utf8'),text);
 assert.equal(saved.registration.id,2);assert.match(await readFile(path.join(root.folder,'world1/courtyard.ldx'),'utf8'),/Layer\("wonderblocks", 2, 0\)/);assert.equal(await readFile(path.join(root.folder,saved.backup,'world1/courtyard.ldx.wbbackup'),'utf8'),originalIndex);
 const repeat=await writeWorldFolder(root,result(),{backupName:'unchanged'});assert.equal(repeat.updated,0);assert.equal(repeat.backup,null,'identical shared textures and assets are not rewritten or backed up again');
});
test('cancellation restores replaced files and removes newly written files',async t=>{
 const root=await fixture(t),controller=new AbortController();await writeFile(path.join(root.folder,'msh/courtyard.msh'),'original');
 await assert.rejects(writeWorldFolder(root,result(),{signal:controller.signal,backupName:'cancel',onProgress:p=>{if(p.phase==='Writing world folder'&&p.completed===2)controller.abort();}}),{name:'AbortError'});
 assert.equal(await readFile(path.join(root.folder,'msh/courtyard.msh'),'utf8'),'original');await assert.rejects(readFile(path.join(root.folder,'msh/courtyard.msh.option')),{code:'ENOENT'});
});
test('a failed write restores the original and removes the partially created target',async t=>{
 const root=await fixture(t);await writeFile(path.join(root.folder,'msh/courtyard.msh'),'original');root.fail.path=path.join('msh','white.tga');
 await assert.rejects(writeWorldFolder(root,result(),{backupName:'failure'}),/Disk write failed/);assert.equal(await readFile(path.join(root.folder,'msh/courtyard.msh'),'utf8'),'original');await assert.rejects(readFile(path.join(root.folder,'msh/white.tga')),{code:'ENOENT'});
});
test('planning edited during preparation or backup is rejected before overwriting world sources',async t=>{
 const root=await fixture(t);await writeFile(path.join(root.folder,'world1/ABC.pln'),'changed');const source={planningFilename:'ABC.pln',barrierFilename:'ABC.bar',planning:'old',barriers:'',requests:[]};
 await assert.rejects(writeWorldFolder(root,result({merged:true}),{navigationSource:source}),/planning changed/);await assert.rejects(readFile(path.join(root.folder,'msh/courtyard.msh')),{code:'ENOENT'});
 await writeFile(path.join(root.folder,'world1/ABC.pln'),'old');await writeFile(path.join(root.folder,'msh/courtyard.msh'),'original');
 await assert.rejects(writeWorldFolder(root,result({merged:true}),{navigationSource:source,backupName:'concurrent',onProgress:p=>{if(p.phase==='Backing up world files')writeFileSync(path.join(root.folder,'world1/ABC.pln'),'new author edit');}}),/planning changed/);
 assert.equal(await readFile(path.join(root.folder,'world1/ABC.pln'),'utf8'),'new author edit');assert.equal(await readFile(path.join(root.folder,'msh/courtyard.msh'),'utf8'),'original');
});
test('a failed layer-index write restores the layer, requests, index and replaced assets together',async t=>{
 const root=await fixture(t),oldLayer='Version(3);\nSaveType(0);\nNextSequence(77);\n';await writeFile(path.join(root.folder,'world1/courtyard_wonderblocks.lyr'),oldLayer);await writeFile(path.join(root.folder,'msh/courtyard.msh'),'original mesh');const request=await readFile(path.join(root.folder,'world1/courtyard.req'),'utf8');root.fail.path=path.join('world1','courtyard.ldx');
 await assert.rejects(writeWorldFolder(root,result(),{backupName:'index-failure'}),/Disk write failed/);
 for(const [file,text] of [['world1/courtyard.ldx',originalIndex],['world1/courtyard_wonderblocks.lyr',oldLayer],['world1/courtyard.req',request],['msh/courtyard.msh','original mesh']])assert.equal(await readFile(path.join(root.folder,file),'utf8'),text);
});
test('concurrent edits to the layer index survive, and explicit target worlds keep their own layer names',async t=>{
 const root=await fixture(t);await assert.rejects(writeWorldFolder(root,result(),{backupName:'concurrent-index',onProgress:p=>{if(p.phase==='Backing up world files')writeFileSync(path.join(root.folder,'world1/courtyard.ldx'),originalIndex+'\n// authored edit');}}),/World layers changed/);assert.ok((await readFile(path.join(root.folder,'world1/courtyard.ldx'),'utf8')).endsWith('// authored edit'));await assert.rejects(readFile(path.join(root.folder,'msh/courtyard.msh')),{code:'ENOENT'});
 await writeFile(path.join(root.folder,'world1/other.wld'),'Version(3);\nNextSequence(400);\n');await writeFile(path.join(root.folder,'world1/other.ldx'),originalIndex);await writeFile(path.join(root.folder,'world1/other.req'),'ucft { REQN { "world" "other" } }');const original=await readFile(path.join(root.folder,'world1/courtyard.ldx'),'utf8'),saved=await writeWorldFolder(root,result(),{worldName:'other',backupName:'other-world'});
 assert.equal(saved.layer,'world1/other_wonderblocks.lyr');assert.match(await readFile(path.join(root.folder,saved.layer),'utf8'),/SeqNo\(400\)/);assert.equal(await readFile(path.join(root.folder,'world1/courtyard.ldx'),'utf8'),original);
});
test('obsolete managed assets are archived on re-export and legacy backups lose native source extensions',async t=>{
 const root=await fixture(t);await writeWorldFolder(root,result(),{backupName:'first'});const reportPath=path.join(root.folder,'_wonderblocks/exports/courtyard/export-report.json'),report=JSON.parse(await readFile(reportPath,'utf8')),old=['msh/old_bad.msh','msh/old_bad.msh.option','odf/old_bad.odf'];for(const name of old)await writeFile(path.join(root.folder,name),'old source '+name);report.files.push(...old);await writeFile(reportPath,JSON.stringify(report));await mkdir(path.join(root.folder,'_wonderblocks/backups/legacy/msh'),{recursive:true});await writeFile(path.join(root.folder,'_wonderblocks/backups/legacy/msh/old_bad.msh'),'legacy mesh');
 const saved=await writeWorldFolder(root,result(),{backupName:'retired'});assert.equal(saved.archived,3);for(const name of old){await assert.rejects(readFile(path.join(root.folder,name)),{code:'ENOENT'});assert.equal(await readFile(path.join(root.folder,saved.backup,name+'.wbbackup'),'utf8'),'old source '+name);}assert.equal(await readFile(path.join(root.folder,'_wonderblocks/backups/legacy/msh/old_bad.msh.wbbackup'),'utf8'),'legacy mesh');await assert.rejects(readFile(path.join(root.folder,'_wonderblocks/backups/legacy/msh/old_bad.msh')),{code:'ENOENT'});
});
test('retirement protects authored references and rolls back archived sources when canceled',async t=>{
 const root=await fixture(t);await writeWorldFolder(root,result(),{backupName:'first'});const reportPath=path.join(root.folder,'_wonderblocks/exports/courtyard/export-report.json'),report=JSON.parse(await readFile(reportPath,'utf8')),old=['msh/old_bad.msh','msh/old_bad.msh.option','odf/old_bad.odf'];for(const name of old)await writeFile(path.join(root.folder,name),'old '+name);report.files.push(...old);await writeFile(reportPath,JSON.stringify(report));await writeFile(path.join(root.folder,'odf/authored.odf'),'GeometryName = "old_bad"\n');assert.equal((await writeWorldFolder(root,result(),{backupName:'protected'})).archived,0);
 // Re-establish the previous inventory: the authored reference can be removed
 // later without silently losing its protected resource history.
 await rm(path.join(root.folder,'odf/authored.odf'));await writeFile(reportPath,JSON.stringify(report));const controller=new AbortController();await assert.rejects(writeWorldFolder(root,result(),{backupName:'canceled-retire',signal:controller.signal,onProgress:p=>{if(p.phase==='Writing world folder'&&p.label==='msh/old_bad.msh')controller.abort();}}),{name:'AbortError'});for(const name of old)assert.equal(await readFile(path.join(root.folder,name),'utf8'),'old '+name);
});

test('independent files use bounded concurrent writes and reuse directory handles',async t=>{
 const root=await fixture(t),input=result(),metrics={active:0,peak:0,directories:0};
 for(let i=0;i<48;i++)input.files.set('msh/extra_'+i+'.msh',new Uint8Array([i]));
 await writeWorldFolder(measuredDirectory(root,metrics),input,{backupName:'batched'});
 assert.ok(metrics.peak>1);assert.ok(metrics.peak<=6);assert.equal(metrics.active,0);
 assert.ok(metrics.directories<25,'directory handles are shared across asset reads and writes: '+metrics.directories);
 for(let i=0;i<48;i++)assert.deepEqual([...await readFile(path.join(root.folder,'msh/extra_'+i+'.msh'))],[i]);
});

test('a failed concurrent write drains slow writes before restoring the whole batch',async t=>{
 const root=await fixture(t),metrics={active:0,peak:0,directories:0};await writeFile(path.join(root.folder,'msh/courtyard.msh'),'original');
 await assert.rejects(writeWorldFolder(measuredDirectory(root,metrics,{fail:true}),result(),{backupName:'batch-failure'}),/Batched write failed/);
 assert.ok(metrics.peak>1);assert.equal(metrics.active,0);assert.equal(await readFile(path.join(root.folder,'msh/courtyard.msh'),'utf8'),'original');
 for(const file of ['msh/white.tga','msh/courtyard.msh.option','odf/courtyard.odf'])await assert.rejects(readFile(path.join(root.folder,file)),{code:'ENOENT'});
});

test('canceled export keeps a newer outside edit instead of restoring an old asset backup over it',async t=>{
 const root=await fixture(t),controller=new AbortController();await writeFile(path.join(root.folder,'msh/courtyard.msh'),'original');
 await assert.rejects(writeWorldFolder(root,result(),{signal:controller.signal,backupName:'outside-edit',onProgress:p=>{if(p.phase==='Writing world folder'&&p.label==='msh/courtyard.msh'){writeFileSync(path.join(root.folder,p.label),'newer authored mesh');controller.abort();}}}),/Newer edits made outside Wonderblocks were kept: msh\/courtyard.msh/);
 assert.equal(await readFile(path.join(root.folder,'msh/courtyard.msh'),'utf8'),'newer authored mesh');assert.equal(await readFile(path.join(root.folder,'_wonderblocks/backups/outside-edit/msh/courtyard.msh.wbbackup'),'utf8'),'original');
 await assert.rejects(readFile(path.join(root.folder,'odf/courtyard.odf')),{code:'ENOENT'});
});

test('a fresh standalone export does not point to nonexistent backups when newer edits are kept',async t=>{
 const root=await fixture(t),controller=new AbortController(),input=result();input.filename='new_asset.object.zip';delete input.manifest.layerFile;for(const file of [...input.files.keys()])if(file.startsWith('world1/'))input.files.delete(file);
 await assert.rejects(writeWorldFolder(root,input,{signal:controller.signal,backupName:'no-originals',onProgress:p=>{if(p.phase==='Writing world folder'&&p.label==='msh/courtyard.msh'){writeFileSync(path.join(root.folder,p.label),'authored new mesh');controller.abort();}}}),error=>{assert.match(error.message,/Newer edits/);assert.doesNotMatch(error.message,/Originals are in/);return true;});
 assert.equal(await readFile(path.join(root.folder,'msh/courtyard.msh'),'utf8'),'authored new mesh');
});

test('the final registration check detects an outside edit after the last write and preserves it during rollback',async t=>{
 const root=await fixture(t),authored=originalIndex+'\n// saved by another editor';
 await assert.rejects(writeWorldFolder(root,result(),{backupName:'late-index',onProgress:p=>{if(p.phase==='Writing world folder'&&p.label==='world1/courtyard.ldx')writeFileSync(path.join(root.folder,p.label),authored);}}),/Newer edits made outside Wonderblocks were kept: world1\/courtyard.ldx/);
 assert.equal(await readFile(path.join(root.folder,'world1/courtyard.ldx'),'utf8'),authored);await assert.rejects(readFile(path.join(root.folder,'msh/courtyard.msh')),{code:'ENOENT'});
});

test('a late authored planning edit survives detection and rollback after navigation was written',async t=>{
 const root=await fixture(t),input=result({merged:true}),source={planningFilename:'ABC.pln',barrierFilename:'ABC.bar',planning:'old planning',barriers:'old barriers',requests:[]};
 await writeFile(path.join(root.folder,'world1/ABC.pln'),source.planning);await writeFile(path.join(root.folder,'world1/ABC.bar'),source.barriers);input.files.set('world1/ABC.pln','merged planning');input.files.set('world1/ABC.bar','merged barriers');
 await assert.rejects(writeWorldFolder(root,input,{navigationSource:source,backupName:'late-planning',onProgress:p=>{if(p.phase==='Writing world folder'&&p.label==='world1/courtyard.ldx')writeFileSync(path.join(root.folder,'world1/ABC.pln'),'new authored planning');}}),/Newer edits made outside Wonderblocks were kept: world1\/ABC.pln/);
 assert.equal(await readFile(path.join(root.folder,'world1/ABC.pln'),'utf8'),'new authored planning');assert.equal(await readFile(path.join(root.folder,'world1/ABC.bar'),'utf8'),source.barriers);assert.equal(await readFile(path.join(root.folder,'world1/courtyard.ldx'),'utf8'),originalIndex);
});

test('verified backups skip deep scans while newly discovered legacy backups are still repaired',async t=>{
 const root=await fixture(t);await writeFile(path.join(root.folder,'msh/courtyard.msh'),'original');
 await writeWorldFolder(root,result(),{backupName:'verified'});
 const backup=path.join(root.folder,'_wonderblocks/backups/verified');assert.match(await readFile(path.join(backup,'backup-format.json'),'utf8'),/wonderblocks-backup/);
 const wrap=directory=>new Proxy(directory,{get(target,key){if(key==='getDirectoryHandle')return async(...args)=>wrap(await target.getDirectoryHandle(...args));if(key==='values')return async function*(){if(target.folder===backup)throw Error('Already verified backup was scanned');for await(const entry of target.values())yield entry.kind==='directory'?wrap(entry):entry;};return typeof target[key]==='function'?target[key].bind(target):target[key];}});
 const legacy=path.join(root.folder,'_wonderblocks/backups/legacy');await mkdir(legacy);await writeFile(path.join(legacy,'raw.msh'),'old mesh');
 const repeat=await writeWorldFolder(wrap(root),result(),{backupName:'repeat'});assert.equal(repeat.updated,0);assert.equal(await readFile(path.join(legacy,'raw.msh.wbbackup'),'utf8'),'old mesh');
});
