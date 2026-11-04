import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {prepareTextureLibrary}=createRequire(import.meta.url)('../desktop/user-data.cjs');

test('desktop defaults update without replacing custom textures, edits or deliberate deletions',async t=>{
 const base=await mkdtemp(path.join(tmpdir(),'wb-desktop-data-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const defaults=path.join(base,'bundled'),data=path.join(base,'profile');await mkdir(path.join(defaults,'stone'),{recursive:true});
 for(const name of ['edit.png','update.png','delete.png'])await writeFile(path.join(defaults,'stone',name),'original');
 const library=await prepareTextureLibrary(defaults,data);assert.equal(await readFile(path.join(library,'stone/update.png'),'utf8'),'original');
 await writeFile(path.join(library,'stone/edit.png'),'user edit');await writeFile(path.join(library,'stone/custom.png'),'new user texture');await rm(path.join(library,'stone/delete.png'));
 for(const name of ['edit.png','update.png','delete.png','new.png'])await writeFile(path.join(defaults,'stone',name),'new default');
 await prepareTextureLibrary(defaults,data);
 assert.equal(await readFile(path.join(library,'stone/edit.png'),'utf8'),'user edit');assert.equal(await readFile(path.join(library,'stone/custom.png'),'utf8'),'new user texture');
 assert.equal(await readFile(path.join(library,'stone/update.png'),'utf8'),'new default');assert.equal(await readFile(path.join(library,'stone/new.png'),'utf8'),'new default');
 await assert.rejects(access(path.join(library,'stone/delete.png')),{code:'ENOENT'});
 await prepareTextureLibrary(defaults,data);assert.equal(await readFile(path.join(library,'stone/edit.png'),'utf8'),'user edit');
});
