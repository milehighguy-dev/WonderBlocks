import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import JSZip from 'jszip';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[],output=await mkdtemp(path.join(tmpdir(),'wb-collision-helpers-'));
try{
 browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/exporter-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/styles/editor-ui.css"><link rel="stylesheet" href="/styles/workbench.css"><script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/exporter-test');
 await page.evaluate(async()=>{
  const {createSWBF2ExportUI}=await import('/src/swbf2/swbf2-export-ui.js'),{makePart}=await import('/src/core/model.js'),{buildPart}=await import('/src/core/geometry.js'),{instantiateFloraTreePreset}=await import('/src/flora/flora-tree-presets.js'),{readyObjectCollisions}=await import('/src/collision/collision-service.js'),{prepareAssemblyCollisions}=await import('/src/collision/assembly-collision.js'),{acornTowerFixture}=await import('/tests/fixtures/acorn-tower.js');
  const parts=[makePart('block',{name:'Plain block',scale:[500,40,500]}),makePart('flora',{...instantiateFloraTreePreset('endor-woodland-tree'),name:'Tree'}),makePart('stair-route',{name:'Stairs'})];
  window.projects=[...parts.map(p=>({format:'open-building-studio',version:1,name:p.name,parts:[p]})),acornTowerFixture(),{format:'open-building-studio',version:1,name:'Small prop',parts:[makePart('block')]}];window.current=0;window.downloads=[];
  const sources=await Promise.all(projects.map(async project=>{const roots=project.parts.map(p=>buildPart(p,{parts:project.parts}));await readyObjectCollisions(roots);const source=prepareAssemblyCollisions(project.parts,roots,{assign:false,includeHidden:true});await readyObjectCollisions([...source].map(([partId,collision])=>({userData:{partId,collision}})));return source;}));
  window.exportUI=createSWBF2ExportUI({snapshot:()=>projects[current],selection:()=>projects[current].parts.map(p=>p.id),previewRoots:()=>new Map(),notify:()=>{},download:(bytes,name)=>downloads.push({bytes:Array.from(bytes),name}),collisionSource:async(p,signal)=>{await new Promise(resolve=>setTimeout(resolve,60));if(signal.aborted)throw new DOMException('Canceled','AbortError');return sources.find(source=>source.has(p.parts[0].id));}});
  exportUI.open();
 });
 const dialog=page.locator('.swbf2-export'),helper=dialog.locator('[name=collision-helpers]'),help=dialog.locator('[data-helper-recommendation]'),button=dialog.locator('[data-action=export]');
 const ready=()=>page.waitForFunction(()=>document.querySelector('.swbf2-export').dataset.checkingCollision==='false');
 async function downloaded(){const count=await page.evaluate(()=>downloads.length);await button.click();await page.waitForFunction(n=>downloads.length>n,count);const item=await page.evaluate(()=>downloads.at(-1)),zip=await JSZip.loadAsync(Uint8Array.from(item.bytes));assert.equal(zip.file('validate-swbf2.ps1'),null);assert.doesNotMatch(await zip.file('README.txt').async('string'),/validate-swbf2/);return JSON.parse(await zip.file('export-report.json').async('string'));}
 async function open(index){await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();await page.evaluate(i=>{current=i;exportUI.open();},index);await ready();}
 await ready();assert.equal(await helper.isChecked(),false);assert.match(await help.textContent(),/Recommended: Off/);assert.equal(await button.isDisabled(),false);
 assert.doesNotMatch(await dialog.locator('[data-file-paths]').textContent(),/validate-swbf2/);
 let report=await downloaded();assert.equal(report.settings.separateCollisionHelpers,false);assert.equal(report.asset.collisionHelpers.length,0);
 const classLabel=dialog.getByRole('combobox',{name:'Class label',exact:true});assert.equal(await classLabel.inputValue(),'building');assert.equal(report.asset.classLabel,'building');
 const uniqueNames=dialog.getByRole('checkbox',{name:'Unique mesh / ODF names',exact:true});assert.equal(await uniqueNames.isChecked(),false);assert.equal(report.asset.mesh,'msh/plain_block.msh');assert.equal(report.asset.odf,'odf/plain_block.odf');assert.ok(report.files.includes('msh/plain_block.msh.option'));
 await uniqueNames.check();report=await downloaded();assert.equal(report.settings.uniqueAssetNames,true);assert.match(report.asset.mesh,/^msh\/wb_.*_[a-f0-9]{8}\.msh$/);assert.ok(report.files.includes(report.asset.mesh+'.option'));await uniqueNames.uncheck();
 await classLabel.selectOption('prop');report=await downloaded();assert.equal(report.asset.classLabel,'prop');assert.equal(report.asset.classRecommendation.recommended,'building');
 await dialog.locator('[name=output]').selectOption('scene');await ready();assert.equal(await classLabel.isVisible(),false);report=await downloaded();assert.equal(report.settings.classLabel,'auto');assert.ok(report.assets.filter(a=>a.role!=='collision').every(a=>a.classLabel==='building'));
 await dialog.locator('[name=output]').selectOption('object');await ready();assert.equal(await classLabel.inputValue(),'prop','manual choice survives format changes for the same selection');
 await open(0);assert.equal(await classLabel.inputValue(),'building','reopening restores the recommendation');
 await open(4);assert.equal(await classLabel.inputValue(),'prop');report=await downloaded();assert.equal(report.asset.classLabel,'prop');
 await open(3);assert.equal(await helper.isChecked(),false);assert.match(await help.textContent(),/Recommended: Off/);assert.match(await help.textContent(),/does not prove helpers/);
 await dialog.locator('[data-helper-details]>summary').click();assert.match(await dialog.locator('[data-helper-stats]').textContent(),/Infantry: up to 36/);assert.match(await dialog.locator('[data-helper-stats]').textContent(),/Vehicles: up to 140/);report=await downloaded();assert.equal(report.assets.length,1);assert.equal(report.asset.collisionHelpers.length,0);assert.equal(report.asset.mesh,'msh/acorn_tower.msh');assert.ok(report.files.includes('msh/acorn_tower.msh.option'));await dialog.screenshot({path:path.join(output,'acorn-recommendation.png')});
 await open(1);assert.equal(await classLabel.inputValue(),'prop');assert.equal(await helper.isChecked(),false);assert.match(await help.textContent(),/Recommended: Off/);await helper.check();report=await downloaded();assert.ok(report.asset.collisionHelpers.length>0);
 await helper.uncheck();assert.match(await help.textContent(),/Vehicle contacts need an in-game check/);assert.equal(await button.isDisabled(),false);report=await downloaded();assert.equal(report.asset.collisionHelpers.length,0);assert.equal(report.assets.length,1);
 await dialog.locator('[name=output]').selectOption('mesh');await ready();assert.equal(await classLabel.isVisible(),false);assert.equal(await helper.isChecked(),false);report=await downloaded();assert.ok(!report.asset.odf);assert.equal(report.asset.collisionHelpers.length,0);
 await dialog.screenshot({path:path.join(output,'tree-helpers-off.png')});
 await open(2);await dialog.locator('[name=output]').selectOption('object');await ready();assert.equal(await helper.isChecked(),true);assert.match(await help.textContent(),/Required: On/);
 await helper.uncheck();assert.equal(await button.isDisabled(),true);await helper.check();assert.equal(await button.isDisabled(),false);
 await dialog.locator('[name=output]').selectOption('mesh');await ready();assert.equal(await button.isDisabled(),true);assert.match(await help.textContent(),/Choose MSH \+ ODF/);
 await dialog.locator('[name=collision]').uncheck();assert.equal(await helper.isDisabled(),true);assert.equal(await button.isDisabled(),false);report=await downloaded();assert.ok(report.assets.every(a=>a.collisionBodies.length===0));
 await dialog.locator('[name=collision]').check();await dialog.locator('[name=output]').selectOption('object');await ready();assert.equal(await button.isDisabled(),false);
 await page.setViewportSize({width:620,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await dialog.screenshot({path:path.join(output,'helpers-mobile.png')});
 assert.deepEqual(errors,[]);console.log('PASS collision-helper recommendation, on/off downloads, dense override, native-mask requirement, MSH-only, collision exclusion, stale checks and narrow layout. Screenshots: '+output);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
