import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import JSZip from 'jszip';
const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const output=await mkdtemp(path.join(tmpdir(),'wb-nav-merge-')),folder=path.join(output,'world1');await mkdir(folder);
const originals=new Map([
 ['ABC.pln','Hub("OldA") { Pos(80,0,80); Radius(.4); }\nHub("OldB") { Pos(85,0,80); Radius(.4); }\nConnection("OldLink") { Start("OldA"); End("OldB"); Flag(3); }'],
 ['ABC.bar','BarrierCount(0);'],['ABC.req','ucft\n{\n REQN { "world" "ABC" }\n}\n'],['Other.pln','Hub("OtherHub") { Pos(100,0,100); Radius(.4); }'],['Other.bar','BarrierCount(0);'],['ABC.wld','Version(3);\nSaveType(0);\nNextSequence(1);\n']
]);for(const [name,text] of originals)await writeFile(path.join(folder,name),text);
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/exporter-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/styles/editor-ui.css"><link rel="stylesheet" href="/styles/workbench.css"><script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/exporter-test');
 await page.evaluate(async()=>{
  const {createSWBF2ExportUI}=await import('/src/swbf2/swbf2-export-ui.js'),{makePart}=await import('/src/core/model.js');
  const part=makePart('platform',{position:[10,2,-20]});Object.assign(part.platform.sections[0],{width:2,depth:2,radius:0});part.platform.railing='none';window.project={format:'open-building-studio',version:1,name:'Courtyard',parts:[part]};window.downloads=[];
  window.exportUI=createSWBF2ExportUI({snapshot:()=>project,selection:()=>[],previewRoots:()=>new Map(),notify:()=>{},download:(bytes,name)=>downloads.push({bytes:Array.from(bytes),name})});exportUI.open();
 });
 const dialog=page.locator('.swbf2-export'),ai=dialog.getByRole('checkbox',{name:'Generate AI planning and barriers',exact:true}),merge=dialog.getByRole('checkbox',{name:'Merge with existing world planning',exact:true}),world=dialog.getByRole('combobox',{name:'Keep world filenames',exact:true}),button=dialog.locator('[data-action=export]');
 const ready=()=>page.waitForFunction(()=>document.querySelector('.swbf2-export').dataset.checkingCollision==='false');await ready();assert.equal(await merge.isChecked(),false);await merge.check();assert.equal(await button.isDisabled(),true);
 await dialog.locator('[name=merge-folder]').setInputFiles(folder);await world.waitFor();assert.equal(await world.locator('option').count(),2);assert.match(await world.inputValue(),/ABC.pln$/);assert.equal(await button.isDisabled(),false);
 async function download(){const count=await page.evaluate(()=>downloads.length);await button.click();await page.waitForFunction(n=>downloads.length>n,count);const item=await page.evaluate(()=>downloads.at(-1));return JSZip.loadAsync(Uint8Array.from(item.bytes),{checkCRC32:true});}
 let zip=await download(),report=JSON.parse(await zip.file('export-report.json').async('string'));assert.equal(report.navigation.worldName,'ABC');assert.equal(report.navigation.merged,true);assert.ok((await zip.file('world1/ABC.pln').async('string')).includes('OldLink'));assert.equal(zip.file('world1/courtyard.pln'),null);assert.equal(zip.file('merge-ai-navigation.ps1'),null);assert.ok(!Object.keys(zip.files).some(n=>/\.(wld|ldx)$/.test(n)));
 const mergedPreview=await zip.file('ai-navigation-preview.html').async('string'),mergedHubCount=report.navigation.hubs;
 const req=await zip.file('world1/ABC.req').async('string');assert.ok(req.indexOf('"congraph"')<req.indexOf('"world"'));assert.equal(zip.file(report.layerFile)!==null,true);
 assert.doesNotMatch(await dialog.locator('[data-file-paths]').textContent(),/courtyard.pln|merge-ai-navigation.ps1|\.wld|\.ldx/);assert.match(await dialog.locator('[data-file-paths]').textContent(),/ABC.pln/);
 await world.selectOption({label:'world1/Other.pln'});zip=await download();report=JSON.parse(await zip.file('export-report.json').async('string'));assert.equal(report.navigation.worldName,'Other');assert.ok((await zip.file('world1/Other.pln').async('string')).includes('OtherHub'));assert.equal(zip.file('world1/ABC.pln'),null);
 await ai.uncheck();assert.equal(await merge.isDisabled(),true);assert.equal(await world.isVisible(),false);zip=await download();assert.equal(zip.file('world1/Other.pln'),null);assert.ok(zip.file('world1/courtyard.wld'));
 await ai.check();assert.equal(await merge.isChecked(),true);await world.selectOption({label:'world1/ABC.pln'});await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();await page.evaluate(()=>exportUI.open());await ready();assert.equal(await merge.isChecked(),true);assert.match(await world.inputValue(),/ABC.pln$/);
 const broken=path.join(output,'broken');await mkdir(broken);await writeFile(path.join(broken,'Bad.pln'),'Hub("open") {');await dialog.locator('[name=merge-folder]').setInputFiles(broken);await dialog.locator('[data-merge-status]').filter({hasText:'Unclosed scope'}).waitFor();assert.equal(await button.isDisabled(),true);
 const full=path.join(output,'full');await mkdir(full);await writeFile(path.join(full,'Full.pln'),Array.from({length:255},(_,i)=>`Hub("h${i}") { Pos(${i},0,200); Radius(.4); }`).join('\n'));await dialog.locator('[name=merge-folder]').setInputFiles(full);await world.waitFor();await page.waitForFunction(()=>!document.querySelector('.swbf2-export [data-action=export]').disabled);const previousDownloads=await page.evaluate(()=>downloads.length);await button.click();await dialog.locator('[role=status]').filter({hasText:'255 hubs or connections'}).waitFor();assert.equal(await page.evaluate(()=>downloads.length),previousDownloads);assert.equal(await button.isDisabled(),false);
 await dialog.locator('[name=merge-folder]').setInputFiles(folder);await page.waitForFunction(()=>document.querySelector('[name=merge-world]').value.endsWith('ABC.pln'));await download();
 await dialog.screenshot({path:path.join(output,'merge-desktop.png')});await page.setViewportSize({width:620,height:860});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await dialog.screenshot({path:path.join(output,'merge-mobile.png')});
 const preview=await browser.newPage();preview.on('pageerror',e=>errors.push(e.message));await preview.route('**/preview',route=>route.fulfill({contentType:'text/html',body:mergedPreview}));await preview.goto('http://127.0.0.1:'+server.address().port+'/preview');await preview.waitForFunction(count=>Number(document.querySelector('canvas').dataset.hubs)===count,mergedHubCount);
 for(const [name,text] of originals)assert.equal(await readFile(path.join(folder,name),'utf8'),text,'folder source changed: '+name);
 assert.deepEqual(errors,[]);console.log('PASS export-time folder merge, existing filenames/world selection, disabled AI, preserved originals, direct ZIP and narrow layout. Artifacts: '+output);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
