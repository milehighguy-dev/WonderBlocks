import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
const {createWorldFolders}=createRequire(import.meta.url)('../src/swbf2/local-world-folders.cjs');
test('native folder capabilities persist, open the exact selected folder and cannot escape it',async t=>{
 const base=await mkdtemp(path.join(tmpdir(),'wb-local-folder-'));t.after(()=>rm(base,{recursive:true,force:true}));const world=path.join(base,'WON'),outside=path.join(base,'outside');await mkdir(world);await mkdir(outside);for(const name of ['msh','odf','world1'])await mkdir(path.join(world,name));await writeFile(path.join(world,'world1/WON.wld'),'authored world');
 const opened=[],options={registryPath:path.join(base,'folders.json'),choose:async()=>world,open:async folder=>opened.push(folder)},api=createWorldFolders(options),folder=await api.handle({action:'choose'}),call=(action,path,extra={})=>api.handle({id:folder.id,action,path,...extra});
 await call('open');assert.deepEqual(opened,[world]);assert.equal((await createWorldFolders(options).handle({action:'restore',id:folder.id})).path,world);
 await call('write','msh/example.msh',{base64:Buffer.from([1,2,3]).toString('base64')});assert.deepEqual([...Buffer.from((await call('read','msh/example.msh')).base64,'base64')],[1,2,3]);await call('write','msh/example.msh',{base64:Buffer.from([4,5]).toString('base64')});assert.deepEqual([...await readFile(path.join(world,'msh/example.msh'))],[4,5]);
 for(const relative of ['../outside/file','msh/../../outside/file','msh/evil:stream','msh/CON.odf','/outside/file'])await assert.rejects(call('write',relative,{base64:''}));await assert.rejects(call('write','world1/WON.wld',{base64:''}),/read only/);await assert.rejects(call('read','msh/missing.msh'),{code:'ENOENT'});
 await symlink(outside,path.join(world,'msh/linked'),'junction');await assert.rejects(call('write','msh/linked/escape.msh',{base64:''}),/linked folder/);assert.equal(await readFile(path.join(world,'world1/WON.wld'),'utf8'),'authored world');
});
