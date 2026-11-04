import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const output=await mkdtemp(path.join(tmpdir(),'wb-direct-world-'));let browser;const errors=[];
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/exporter-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/styles/editor-ui.css"><link rel="stylesheet" href="/styles/workbench.css"><script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/exporter-test');
 await page.evaluate(()=>{window.exportTransfers=[];const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(data.result?.files)exportTransfers.push({zip:data.result.zip===null?null:data.result.zip?.length,files:data.result.files.size});});}};});
 await page.evaluate(async()=>{
  // Use actual browser filesystem handles in its private test storage. Only the
  // native picker is substituted; traversal, streams and writes are real.
  window.root=await (await navigator.storage.getDirectory()).getDirectoryHandle('WON',{create:true});for(const name of ['msh','odf','world1'])await root.getDirectoryHandle(name,{create:true});
  window.put=async(path,text)=>{const names=path.split('/');let dir=root;for(const n of names.slice(0,-1))dir=await dir.getDirectoryHandle(n,{create:true});const w=await (await dir.getFileHandle(names.at(-1),{create:true})).createWritable();await w.write(text);await w.close();};
  window.get=async path=>{const names=path.split('/');let dir=root;for(const n of names.slice(0,-1))dir=await dir.getDirectoryHandle(n);return (await (await dir.getFileHandle(names.at(-1))).getFile()).text();};
  await put('world1/WON.pln','Hub("Old") { Pos(80,0,80); Radius(.4); }');await put('world1/WON.bar','BarrierCount(0);');await put('world1/WON.req','ucft { REQN { "world" "WON" } }');await put('world1/WON.wld','original world');await put('world1/WON.ldx','Version(1);\nNextID(2);\nLayer("[Base]",0,0)\n{\n Description("");\n}\nLayer("conquest",1,0)\n{\n Description("");\n}\nGameMode("Common")\n{\n Layer(0);\n}\nGameMode("conquest")\n{\n Layer(1);\n}\n');await put('world1/WON_conquest.lyr','Version(3);\nNextSequence(600);\n');await put('world1/WON.ter','original terrain');await put('odf/keep.odf','original prop');
  window.pickers=[];window.showDirectoryPicker=async options=>{pickers.push({mode:options.mode,startIn:options.startIn?.name});return root;};
  const {createSWBF2ExportUI}=await import('/src/swbf2/swbf2-export-ui.js'),{makePart}=await import('/src/core/model.js');const part=makePart('platform',{position:[10,2,-20]});Object.assign(part.platform.sections[0],{width:2,depth:2,radius:0});part.platform.railing='none';window.project={format:'open-building-studio',version:1,name:'Courtyard',parts:[part]};window.downloads=[];
  window.exportUI=createSWBF2ExportUI({chooseFolderHandle:options=>window.showDirectoryPicker(options),snapshot:()=>project,selection:()=>[],previewRoots:()=>new Map(),notify:()=>{},download:(bytes,name)=>downloads.push(name)});exportUI.open();
 });
 const dialog=page.locator('.swbf2-export'),button=dialog.locator('[data-action=export]'),merge=dialog.getByRole('checkbox',{name:'Merge with existing world planning',exact:true}),ai=dialog.getByRole('checkbox',{name:'Generate AI planning and barriers',exact:true}),destination=dialog.getByRole('combobox',{name:'Export to',exact:true});
 await page.waitForFunction(()=>document.querySelector('.swbf2-export').dataset.checkingCollision==='false');await merge.check();await dialog.locator('[data-choose-merge-folder]').click();await page.waitForFunction(()=>document.querySelector('[name=merge-world]').value.endsWith('WON.pln'));await destination.selectOption('folder');
 assert.equal(await button.isDisabled(),false);assert.equal(await page.evaluate(()=>pickers.length),1,'same folder reused for navigation and direct output');assert.doesNotMatch(await dialog.locator('[data-file-paths]').textContent(),/\.wld|merge-ai-navigation.ps1/);assert.match(await dialog.locator('[data-file-paths]').textContent(),/WON.ldx/);
 async function save(){await button.click();await dialog.locator('[role=status]').filter({hasText:'Saved to WON'}).waitFor();await page.waitForFunction(()=>!document.querySelector('.swbf2-export').dataset.busy);}
 await save();const first=await page.evaluate(async()=>({planning:await get('world1/WON.pln'),report:JSON.parse(await get('_wonderblocks/exports/'+project.swbf2Exports.profiles['scene:scene'].id+'/export-report.json'))}));assert.match(first.planning,/Old/);assert.ok(first.report.navigation.hubs>1);assert.equal(first.report.navigation.worldName,'WON');
 assert.equal(first.report.destination.layerID,2);assert.equal(first.report.destination.requiresLayerImport,false);assert.match(await page.evaluate(path=>get(path),first.report.layerFile),/Layer\(2\)/);assert.match(await page.evaluate(path=>get(path),first.report.layerFile),/SeqNo\(600\)/);assert.ok((await page.evaluate(()=>get('world1/WON.req'))).includes(first.report.layerFile.slice(7,-4)));const registeredIndex=await page.evaluate(()=>get('world1/WON.ldx'));
 const mesh='msh/'+first.report.assets[0].name+'.msh';await page.evaluate(async path=>{const names=path.split('/');let dir=root;for(const n of names.slice(0,-1))dir=await dir.getDirectoryHandle(n);if(!(await (await dir.getFileHandle(names.at(-1))).getFile()).size)throw Error('Empty mesh');},mesh);
 // A changed authored graph is read on each export, and prior generated nodes
 // are replaced rather than duplicated. Actual matching assets are backed up.
 await page.evaluate(()=>put('world1/WON.pln','Hub("NewAuthored") { Pos(90,0,90); Radius(.4); }'));
 await save();const second=await page.evaluate(async()=>{const dir=await (await root.getDirectoryHandle('_wonderblocks')).getDirectoryHandle('backups');let backups=0;for await(const entry of dir.values())if(entry.kind==='directory')backups++;return {planning:await get('world1/WON.pln'),backups};});
 assert.match(second.planning,/NewAuthored/);assert.doesNotMatch(second.planning,/Hub\("Old"\)/);assert.equal((second.planning.match(/Hub\(/g)||[]).length,(first.planning.match(/Hub\(/g)||[]).length);assert.ok(second.backups>=2);
 for(const [file,text] of [['world1/WON.wld','original world'],['world1/WON.ldx',registeredIndex],['world1/WON.ter','original terrain'],['odf/keep.odf','original prop']])assert.equal(await page.evaluate(p=>get(p),file),text);
 await merge.uncheck();assert.equal(await button.isDisabled(),true);await ai.uncheck();assert.equal(await button.isDisabled(),false);await save();assert.match(await page.evaluate(()=>get('world1/WON.pln')),/NewAuthored/);assert.equal(await page.evaluate(()=>downloads.length),0);
 await dialog.getByRole('combobox',{name:'Export format',exact:true}).selectOption('object');await page.waitForFunction(()=>document.querySelector('.swbf2-export').dataset.checkingCollision==='false');await save();assert.ok(await page.evaluate(()=>get('odf/courtyard.odf')));
 assert.equal(await page.evaluate(()=>get('world1/WON.ldx')),registeredIndex,'standalone assets do not change layer registration');
 await dialog.screenshot({path:path.join(output,'direct-desktop.png')});await page.setViewportSize({width:620,height:860});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await dialog.screenshot({path:path.join(output,'direct-mobile.png')});
 assert.ok(await page.evaluate(()=>exportTransfers.length>=4&&exportTransfers.every(result=>result.zip===null&&result.files>0)),'folder workers return files without a ZIP');
 await destination.selectOption('zip');assert.match(await button.textContent(),/Download/);assert.deepEqual(errors,[]);console.log('PASS direct folder assets/options/layer, shared picker, fresh navigation, repeated export/backups, preserved world/terrain, standalone, files-only workers and ZIP switch. Artifacts: '+output);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
