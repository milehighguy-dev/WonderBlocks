import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {createRequire} from 'node:module';
import fileSystem from 'node:fs/promises';
const {readTextureLibrary,decodeTGA}=createRequire(import.meta.url)('../src/materials/read-texture-library.cjs');
const tile=async(file,color)=>sharp({create:{width:8,height:4,channels:4,background:color}}).png().toFile(file);
test('folders and source images create categories and textures without a manifest; edits are picked up on the next load',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'wb-library-'));
 try{
  const folder=path.join(root,'Alien Forest');await mkdir(folder);await tile(path.join(folder,'Silver Bark.PNG'),'#b9c3af');
  let library=await readTextureLibrary(root);assert.equal(library.categories[0].id,'alien-forest');assert.equal(library.categories[0].name,'Alien Forest');assert.deepEqual(library.categories[0].ids,['silver-bark']);
  const surface=library.surfaces[0];assert.equal(surface.name,'Silver Bark');assert.equal(surface.width,8);assert.equal(surface.height,4);assert.deepEqual([...Buffer.from(surface.rgba,'base64').slice(0,4)],[185,195,175,255]);
  await writeFile(path.join(folder,'Silver Bark.json'),JSON.stringify({name:'Pale bark',roughness:.6}));
  await tile(path.join(folder,'Silver Bark.PNG'),'#517389');library=await readTextureLibrary(root);assert.equal(library.surfaces[0].name,'Pale bark');assert.equal(library.surfaces[0].roughness,.6);assert.notEqual(library.surfaces[0].hash,surface.hash);
  const second=path.join(root,'Desert');await mkdir(second);await tile(path.join(second,'Sand.png'),'#dbcfb5');
  library=await readTextureLibrary(root);assert.equal(library.categories.length,2);assert.equal(library.surfaces.length,2);
  await rm(path.join(folder,'Silver Bark.PNG'));library=await readTextureLibrary(root);assert.equal(library.categories.length,1);assert.equal(library.surfaces[0].id,'sand');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('identical images can belong to multiple folders; conflicting names and reserved Plain fail clearly',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'wb-library-'));
 try{
  for(const name of ['A','B']){await mkdir(path.join(root,name));await tile(path.join(root,name,'Stone.png'),'#dccbb0');}
  let library=await readTextureLibrary(root);assert.equal(library.surfaces.length,1);assert.equal(library.categories.length,2);
  await tile(path.join(root,'B','Stone.png'),'#123456');await assert.rejects(readTextureLibrary(root,{strict:true}),/Conflicting textures named stone/);
  library=await readTextureLibrary(root);assert.equal(library.surfaces.length,1);assert.match(library.warnings[0],/Conflicting textures named stone/);
  await rm(path.join(root,'B','Stone.png'));await tile(path.join(root,'B','plain.png'),'white');await assert.rejects(readTextureLibrary(root,{strict:true}),/Reserved or invalid texture name/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('unreadable images and malformed metadata do not prevent loading the remaining library',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'wb-library-errors-'));
 try{
  const folder=path.join(root,'Custom');await mkdir(folder);await tile(path.join(folder,'Good.png'),'#cbd8b4');await writeFile(path.join(folder,'Good.json'),'{bad json');await writeFile(path.join(folder,'Broken.png'),'not an image');await writeFile(path.join(folder,'_category.json'),'[]');
  const library=await readTextureLibrary(root);assert.equal(library.surfaces.length,2);assert.equal(library.categories[0].name,'Custom');assert.equal(library.warnings.length,3);
  assert.equal(library.surfaces.find(s=>s.id==='good').unavailable,undefined);const broken=library.surfaces.find(s=>s.id==='broken');assert.equal(broken.unavailable,true);assert.equal(Buffer.from(broken.rgba,'base64').length,128*128*4);
  await tile(path.join(folder,'Broken.png'),'#aabbee');const repaired=await readTextureLibrary(root);assert.equal(repaired.surfaces.find(s=>s.id==='broken').unavailable,undefined);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('replacing an image updates cached pixels even when its file metadata is unchanged',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'wb-library-cache-')),originalStat=fileSystem.stat;
 try{
  const folder=path.join(root,'Tiles');await mkdir(folder);const file=path.join(folder,'Stone.png');await tile(file,'#aabbcc');const frozen=await originalStat(file),first=await readTextureLibrary(root);
  await tile(file,'#334455');fileSystem.stat=async(path,...args)=>path===file?frozen:originalStat(path,...args);
  const replaced=await readTextureLibrary(root);assert.notEqual(replaced.surfaces[0].hash,first.surfaces[0].hash);assert.deepEqual([...Buffer.from(replaced.surfaces[0].rgba,'base64').slice(0,4)],[51,68,85,255]);
 }finally{fileSystem.stat=originalStat;await rm(root,{recursive:true,force:true});}
});
test('Mod Tools TGA sources decode raw and RLE pixels with the proper origin',()=>{
 const header=Buffer.alloc(18);header[2]=2;header.writeUInt16LE(1,12);header.writeUInt16LE(2,14);header[16]=24;
 const raw=Buffer.concat([header,Buffer.from([0,0,255,255,0,0])]);assert.deepEqual([...decodeTGA(raw).data],[0,0,255,255,255,0,0,255]);
 header[2]=10;header[17]=32;const rle=Buffer.concat([header,Buffer.from([129,0,255,0])]);assert.deepEqual([...decodeTGA(rle).data],[0,255,0,255,0,255,0,255]);
 assert.throws(()=>decodeTGA(raw.subarray(0,19)),/Incomplete/);
});
