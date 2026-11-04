import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
const {createServer}=createRequire(import.meta.url)('../../server.cjs');
const root=await mkdtemp(path.join(tmpdir(),'wb-texture-folders-')),textureRoot=path.join(root,'textures');
await cp(fileURLToPath(new URL('../../textures/',import.meta.url)),textureRoot,{recursive:true});
const category=path.join(textureRoot,'Alien Forest');await mkdir(category);
const pattern=Buffer.alloc(16*8*4);for(let y=0;y<8;y++)for(let x=0;x<16;x++)pattern.set(x<8?[126,175,84,255]:[58,106,44,255],(y*16+x)*4);
await sharp(pattern,{raw:{width:16,height:8,channels:4}}).png().toFile(path.join(category,'Forest Tile.png'));
await cp(path.join(category,'Forest Tile.png'),path.join(category,'Z Forest Alias.png'));
await writeFile(path.join(category,'Broken.png'),'not an image');
for(const [name,alpha] of [['Cutout Grid',0],['Soft Grid',128]]){const pixels=Buffer.from(pattern);for(let i=3;i<pixels.length;i+=8)pixels[i]=alpha;await sharp(pixels,{raw:{width:16,height:8,channels:4}}).png().toFile(path.join(category,name+'.png'));}
const openedFolders=[],server=createServer({textureRoot,openTexturesFolder:async folder=>openedFolders.push(folder)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,errors=[];let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 const project={format:'open-building-studio',version:1,name:'Folder textures',parts:[makePart('block',{color:'#ffffff'})]};
 await page.locator('#file').setInputFiles({name:'test.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);await page.locator('#scene-outline .scene-select').first().click();await page.locator('[data-workspace-mode=material]').click();
 const panel=page.locator('.material-workspace');await panel.getByRole('button',{name:'Alien Forest textures',exact:true}).click();
 const folderButton=panel.getByRole('button',{name:'Open textures folder',exact:true});await folderButton.click();await panel.getByText('Textures folder opened.',{exact:true}).waitFor();assert.deepEqual(openedFolders,[textureRoot]);
 assert.match(await panel.locator('.texture-folder').innerText(),/Add tiling images/);assert.ok(await folderButton.evaluate(button=>button.closest('.texture-palette').lastElementChild===button.parentElement));
 assert.equal(await panel.locator('.texture-card').count(),5);assert.equal(await panel.locator('[data-surface=plain]').count(),0);assert.equal(await panel.locator('[data-surface=broken]').isDisabled(),true);await panel.locator('.texture-library-issues>summary').click();assert.match(await panel.locator('.texture-library-issues').innerText(),/Broken.png/);
 await page.evaluate(async()=>{
  const {buildPart,disposePart}=await import('/src/core/geometry.js'),{makePart}=await import('/src/core/model.js'),{exportMaterial}=await import('/src/swbf2/swbf2-textures.js'),{applySurface,surfaceTexture}=await import('/src/materials/surfaces.js'),{createSWBF2PackageAsync}=await import('/src/swbf2/export-swbf2.js'),T=await import('/vendor/three.module.js');
  const aliasMaterial=new T.MeshStandardMaterial({color:'#ffffff',map:surfaceTexture('forest-tile')}),original=exportMaterial(aliasMaterial);aliasMaterial.map=surfaceTexture('z-forest-alias');const alias=exportMaterial(aliasMaterial);aliasMaterial.dispose();if(original.texture!==alias.texture)throw Error('Identical added images exported under different texture names');
  for(const [preset,flag] of [['cutout-grid',16],['soft-grid',4]]){const part=makePart('block',{surface:{preset,scale:1}}),root=buildPart(part);try{let material;root.traverse(mesh=>{if(mesh.isMesh&&mesh.material.map?.userData.surfacePreset===preset)material=mesh.material;});const texture=exportMaterial(material);if(!(texture.flags&flag)||texture.bytes[16]!==32)throw Error('Texture alpha was lost');applySurface(root,material,{...part,surface:{preset:'forest-tile',scale:1}});if(material.transparent||material.alphaTest!==0||!material.depthWrite)throw Error('Old transparency settings survived an opaque texture');}finally{disposePart(root);}}
  const bad={format:'open-building-studio',version:1,name:'Bad texture',parts:[makePart('block',{surface:{preset:'broken',scale:1}})]};
  try{await createSWBF2PackageAsync(bad,{aiNavigation:false},{packZip:false});throw Error('Unreadable image was silently exported');}catch(error){if(!error.message.includes('Cannot export unreadable texture'))throw error;}
 });
 await panel.getByRole('button',{name:'Apply Forest Tile',exact:true}).click();await panel.locator('[data-surface=forest-tile][aria-pressed=true]').waitFor();
 let pending=page.waitForEvent('download');await page.locator('#save').click();const saved=JSON.parse(await readFile(await(await pending).path(),'utf8'));assert.equal(saved.parts[0].surface.preset,'forest-tile');
 await page.reload();await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 await page.locator('#file').setInputFiles({name:'saved.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 const exported=await page.evaluate(async project=>{
  const {createSWBF2PackageAsync}=await import('/src/swbf2/export-swbf2.js'),{surfaceTexture}=await import('/src/materials/surfaces.js');
  const map=surfaceTexture('forest-tile');if(map.image.width!==16||map.image.height!==8)throw Error('Source dimensions lost');
  const result=await createSWBF2PackageAsync(project,{aiNavigation:false,collision:false,shadow:false,lod:false});
  return [...result.files].filter(([name])=>name.endsWith('.tga')).map(([name,bytes])=>({name,pixel:[...bytes.slice(18,21)]}));
 },saved);
 const texture=exported.find(f=>f.name.includes('forest_tile'));assert.ok(texture,JSON.stringify(exported));assert.deepEqual(texture.pixel,[84,175,126]);
 await page.locator('#scene-outline .scene-select').first().click();await page.locator('[data-workspace-mode=material]').click();await panel.getByRole('button',{name:'Remove texture',exact:true}).click();
 pending=page.waitForEvent('download');await page.locator('#save').click();const cleared=JSON.parse(await readFile(await(await pending).path(),'utf8'));assert.equal(cleared.parts[0].surface.preset,'plain');assert.equal(cleared.parts[0].color,'#ffffff');
 await sharp({create:{width:8,height:8,channels:4,background:'#abcf8a'}}).jpeg().toFile(path.join(category,'New Moss.jpg'));
 await page.reload();await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 assert.equal(await page.evaluate(async()=>{const {SURFACES}=await import('/src/materials/surfaces.js');return SURFACES.some(s=>s.id==='new-moss');}),true);
 assert.deepEqual(errors,[]);console.log('PASS folder discovery, adding images without restart, material paint/remove, saved scene reload, source dimensions and worker TGA export.');
}finally{await browser?.close();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
