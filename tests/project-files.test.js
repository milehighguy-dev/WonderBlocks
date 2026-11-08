import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createProjectFiles} from '../src/editor/project-files.js';
const {createProjectFileService}=createRequire(import.meta.url)('../src/editor/project-files.cjs');
const data=name=>JSON.stringify({format:'open-building-studio',version:1,name,parts:[]});
const abort=()=>Object.assign(Error('Cancelled'),{name:'AbortError'});

test('browser Save chooses a file once, overwrites it, and Save As chooses another file',async()=>{
 const files=new Map(),dialogs=[];let next='first.building.json';
 const store=createProjectFiles({fetcher:null,pickFile:async options=>{dialogs.push(options);const name=next;return {name,createWritable:async()=>({write:async text=>files.set(name,text),close:async()=>{}})};}});
 assert.equal((await store.save(data('First'),'suggested.building.json')).status,'saved');assert.equal(dialogs[0].suggestedName,'suggested.building.json');
 await store.save(data('Changed'),'ignored.building.json');assert.equal(dialogs.length,1);assert.equal(files.get('first.building.json'),data('Changed'));
 next='second.building.json';await store.save(data('Copy'),'ignored.building.json',{saveAs:true});assert.equal(dialogs.length,2);assert.equal(dialogs[1].suggestedName,'first.building.json');assert.equal(files.size,2);assert.equal(files.get('first.building.json'),data('Changed'));assert.equal(store.name,'second.building.json');
});

test('cancelling Save As or a failed write leaves the previous save destination intact',async()=>{
 let cancel=false,fail=false,aborted=0,chosen=0;const writes=[];
 const store=createProjectFiles({fetcher:null,pickFile:async()=>{if(cancel)throw abort();chosen++;return {name:'chosen.json',createWritable:async()=>({write:async text=>{if(fail)throw Error('Disk full');writes.push(text);},close:async()=>{},abort:async()=>aborted++})};}});
 await store.save(data('Initial'),'x.json');cancel=true;assert.equal((await store.save(data('Cancelled'),'x.json',{saveAs:true})).status,'cancelled');assert.equal(store.name,'chosen.json');cancel=false;fail=true;await assert.rejects(store.save(data('Failure'),'x.json'),/Disk full/);assert.equal(aborted,1);fail=false;await store.save(data('Saved'),'x.json');assert.equal(chosen,1);assert.equal(writes.at(-1),data('Saved'));
});

test('changing documents clears the save target even if the old save is still finishing',async()=>{
 let complete;let dialogs=0;const store=createProjectFiles({fetcher:null,pickFile:async()=>({name:'file-'+(++dialogs)+'.json',createWritable:async()=>({write:async()=>new Promise(r=>complete=r),close:async()=>{}})})});
 const saving=store.save(data('Old'),'old.json');while(!complete)await new Promise(r=>setTimeout(r,0));assert.equal((await store.save(data('Duplicate'),'x.json')).status,'busy');store.reset();complete();await saving;assert.equal(store.name,null);
});

test('native project saving only writes chosen files and replaces their contents atomically',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wb-project-save-')),first=path.join(dir,'first.building.json'),second=path.join(dir,'second.building.json');await writeFile(first,data('Existing'));let selection=first;const options=[];
 const backend=createProjectFileService({choose:async opts=>{options.push(opts);return selection;}}),store=createProjectFiles({fetcher:async(_url,request)=>({ok:true,json:async()=>backend.handle(JSON.parse(request.body))})});
 await store.save(data('Replaced'),'suggested.json');assert.equal(await readFile(first,'utf8'),data('Replaced'));await store.save(data('Updated'),'x.json');assert.equal(options.length,1);assert.equal(await readFile(first,'utf8'),data('Updated'));
 selection=second;await store.save(data('Copy'),'x.json',{saveAs:true});assert.equal(options[1].previousPath,first);assert.equal(await readFile(second,'utf8'),data('Copy'));assert.equal(await readFile(first,'utf8'),data('Updated'));assert.deepEqual((await readdir(dir)).sort(),['first.building.json','second.building.json']);
 await assert.rejects(backend.handle({action:'write',id:first,text:data('Unauthorized')}),/Choose a project file/);await assert.rejects(backend.handle({action:'write',id:'unknown',text:data('Unauthorized')}),/Choose a project file/);
});

test('native cancellation preserves the existing file and unsupported browsers retain downloads',async()=>{
 const backend=createProjectFileService({choose:async()=>null}),native=createProjectFiles({fetcher:async(_url,request)=>({ok:true,json:async()=>backend.handle(JSON.parse(request.body))})});assert.equal((await native.save(data('Cancelled'),'x.json')).status,'cancelled');assert.equal(native.name,null);
 const downloads=[],browser=createProjectFiles({fetcher:null,pickFile:null,download:(...args)=>downloads.push(args)});assert.equal((await browser.save(data('Fallback'),'x.json')).status,'downloaded');assert.deepEqual(downloads,[[data('Fallback'),'x.json','application/json']]);
});
