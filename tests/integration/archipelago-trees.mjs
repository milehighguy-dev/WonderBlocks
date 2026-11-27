import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const {createServer}=createRequire(import.meta.url)('../../server.cjs');
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,channel:fs.existsSync(chromium.executablePath())?'chromium':'chrome'});
 const page=await browser.newPage({viewport:{width:900,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__archipelago_trees',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/styles/editor-ui.css"><style>body{padding:20px}section{width:320px}</style>'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/__archipelago_trees');
 await page.evaluate(async()=>{
  const {createFloraPalette}=await import('/src/flora/flora-palette.js');
  document.body.append(createFloraPalette(id=>window.chosenTree=id,{initialCategory:'Tree presets'}));
 });
 const cards=page.locator('[data-flora-part]');
 await page.getByLabel('Tree collection',{exact:true}).selectOption('Archipelago');assert.equal(await cards.count(),84);
 await page.getByLabel('Tree habitat',{exact:true}).selectOption('swamp');assert.ok(await page.locator('[data-flora-part="biome-black-mangrove"]').count());assert.equal(await page.locator('[data-flora-part="biome-oak"]').count(),0);
 await page.getByLabel('Tree habitat',{exact:true}).selectOption('tropical-coast');
 const palm=page.locator('[data-flora-part="biome-fan-palm"]');await palm.click();assert.equal(await page.evaluate(()=>window.chosenTree),'biome-fan-palm');
 const image=palm.locator('img');await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());assert.equal(await image.evaluate(img=>img.naturalWidth),128);
 await page.getByLabel('Find flora parts',{exact:true}).fill('Archipelago Stunted Treeline');assert.equal(await cards.count(),3);
 const result=await page.evaluate(async()=>{
  const {instantiateFloraTreePreset}=await import('/src/flora/flora-tree-presets.js'),{makePart,validateProject}=await import('/src/core/model.js');
  const a=makePart('flora',instantiateFloraTreePreset('biome-fallen-tree')),b=makePart('flora',instantiateFloraTreePreset('biome-fallen-tree'));
  const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Archipelago trees',parts:[a,b]})));
  return {construction:saved.parts[0].flora.woodConstruction,independent:saved.parts[0].flora.branches[0].id!==saved.parts[1].flora.branches[0].id};
 });
 assert.equal(result.construction,'swept');assert.equal(result.independent,true);
 await page.getByRole('button',{name:'Biomes',exact:true}).click();assert.equal(await cards.count(),37);assert.equal(await page.getByLabel('Tree collection',{exact:true}).isVisible(),false);
 await page.getByRole('button',{name:'Tree presets',exact:true}).click();await page.getByLabel('Tree collection',{exact:true}).selectOption('Archipelago');await page.getByLabel('Tree habitat',{exact:true}).selectOption('tropical-coast');
 if(process.argv[2]){const file=path.resolve(process.argv[2]);fs.mkdirSync(path.dirname(file),{recursive:true});await page.screenshot({path:file,fullPage:true});}
 await page.getByRole('button',{name:'Branches',exact:true}).click();
 for(const id of ['yavin-branch-spray','yavin-branch-cross']){const card=page.locator('[data-flora-part="'+id+'"]');assert.equal(await card.count(),1);await card.locator('img').evaluate(img=>img.decode());await card.click();assert.equal(await page.evaluate(()=>window.chosenTree),id);}
 assert.deepEqual(errors,[]);console.log('PASS Archipelago collection, habitat filters, thumbnails, Yavin branch planes, exact preset selection and independent editable save/load.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
