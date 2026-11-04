import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import JSZip from 'jszip';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const output=await mkdtemp(path.join(tmpdir(),'wb-export-responsive-')),errors=[],measurements={};let browser;
console.log('Export responsiveness artifacts: '+output);
try{
 browser=await chromium.launch({channel:process.env.WONDERBLOCKS_BROWSER_CHANNEL||'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(240000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.exportMetrics={ticks:0,tasks:[],workers:0,terminated:0,phases:[]};setInterval(()=>exportMetrics.ticks++,20);
  new PerformanceObserver(list=>{if(window.exportStage)for(const e of list.getEntries())exportMetrics.tasks.push({stage:exportStage,duration:e.duration});}).observe({type:'longtask',buffered:true});
  const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{
   constructor(...args){super(...args);this.exportWorker=String(args[0]).includes('swbf2-export-worker.js');if(this.exportWorker)exportMetrics.workers++;this.addEventListener('message',({data})=>{const phase=data.progress?.phase;if(this.exportWorker&&phase&&!exportMetrics.phases.includes(phase))exportMetrics.phases.push(phase);});}
   terminate(){if(this.exportWorker)exportMetrics.terminated++;return super.terminate();}
  };
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/?demo=yavin-rainwell');
 await page.locator('#scene-loading:not([open])').waitFor({state:'attached'});console.log('Rainwell ready');
 const expected=JSON.parse(await readFile(new URL('../../examples/projects/yavin-rainwell.building.json',import.meta.url),'utf8'));
 const save=async()=>{const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Save project',exact:true}).click()]);return JSON.parse(await readFile(await download.path(),'utf8'));};
 assert.deepEqual(await save(),expected);
 await page.evaluate(async()=>{const T=await import('/vendor/three.module.js');const dispose=T.BufferGeometry.prototype.dispose;window.previewDisposals=0;T.BufferGeometry.prototype.dispose=function(){previewDisposals++;return dispose.call(this);};});
 const dialog=page.locator('.swbf2-export'),ready=()=>page.waitForFunction(()=>document.querySelector('.swbf2-export').dataset.checkingCollision==='false'),close=()=>dialog.getByRole('button',{name:'Close exporter',exact:true}).click();
 measurements.openCall=await page.evaluate(()=>{window.exportStage='open';window.openStarted=performance.now();document.getElementById('export-swbf2').click();return performance.now()-openStarted;});await ready();
 measurements.openReady=await page.evaluate(()=>performance.now()-openStarted);measurements.preview=await page.locator('.swbf2-export-preview').evaluate(e=>({...e.dataset}));
 assert.equal(Number(measurements.preview.reusedObjects),expected.parts.filter(p=>p.type!=='character-reference').length);assert.equal(measurements.preview.builtObjects,'0');assert.ok(measurements.openCall<1500,'opening dialog must not rebuild Rainwell');
 await dialog.screenshot({path:path.join(output,'rainwell-preview.png')});console.log('Dialog ready: '+Math.round(measurements.openReady)+' ms');
 await page.evaluate(()=>window.exportStage='cancel');await dialog.locator('[data-action=export]').click();
 await page.waitForFunction(()=>exportMetrics.phases.includes('Preparing scene objects'));const ticks=await page.evaluate(()=>exportMetrics.ticks);await page.waitForFunction(n=>exportMetrics.ticks>=n+30,ticks);
 const cancelStarted=Date.now();await close();await page.waitForFunction(()=>!document.querySelector('.swbf2-export').dataset.busy);measurements.cancel=Date.now()-cancelStarted;assert.ok(measurements.cancel<1500,'Cancel stays responsive during preparation');
 assert.equal(await page.evaluate(()=>previewDisposals),0,'closing preview must not dispose borrowed scene geometry');console.log('Canceled preparation: '+measurements.cancel+' ms');
 await page.locator('#export-swbf2').click();await ready();await page.evaluate(()=>{window.exportStage='export';exportMetrics.phases=[];});
 const exportStarted=Date.now(),downloadPromise=page.waitForEvent('download',{timeout:240000});await dialog.locator('[data-action=export]').click();
 const download=await downloadPromise;measurements.export=Date.now()-exportStarted;await download.saveAs(path.join(output,download.suggestedFilename()));
 await page.waitForFunction(()=>!document.querySelector('.swbf2-export').dataset.busy);measurements.metrics=await page.evaluate(()=>exportMetrics);
 assert.ok(measurements.metrics.phases.includes('Preparing surfaces and textures'));assert.ok(measurements.metrics.phases.includes('Packing download'));assert.equal(measurements.metrics.workers,measurements.metrics.terminated);
 const worst=Math.max(0,...measurements.metrics.tasks.map(t=>t.duration));await writeFile(path.join(output,'measurements.json'),JSON.stringify(measurements,null,2));assert.ok(worst<1500,'no multi-second main-thread export tasks: '+worst);
 const zip=await JSZip.loadAsync(await readFile(await download.path()),{checkCRC32:true}),report=JSON.parse(await zip.file('export-report.json').async('string'));
 assert.ok(report.objects>=244);assert.ok(report.assets.length>0);assert.ok(report.navigation?.hubs>0);assert.equal(report.settings.lowDetail,true);assert.equal(report.settings.shadows,true);const source=JSON.parse(await zip.file(report.sourceProject).async('string'));assert.ok(source.swbf2Exports?.profiles);delete source.swbf2Exports;assert.deepEqual(source,{...expected,parts:expected.parts.filter(p=>p.type!=='character-reference')});
 await close();assert.equal(await page.evaluate(()=>previewDisposals),0);const saved=await save();assert.ok(saved.swbf2Exports?.profiles);delete saved.swbf2Exports;assert.deepEqual(saved,expected,'preview, cancellation and full export preserve the scene while remembering export choices');
 // Browser workers must preserve bytes, including imported bark/foliage pixels,
 // typed mesh arrays and Map entries transferred back with the ZIP.
 await page.evaluate(()=>window.exportStage=null);
 await page.evaluate(async()=>{
  const {createSWBF2Package,createSWBF2PackageAsync}=await import('/src/swbf2/export-swbf2.js'),{crc32}=await import('/src/swbf2/swbf2-binary.js'),{makePart}=await import('/src/core/model.js'),{instantiateFloraTreePreset}=await import('/src/flora/flora-tree-presets.js');
  const project={format:'open-building-studio',version:1,name:'Worker parity',parts:[makePart('block'),makePart('stair-route'),makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'))]},settings={aiNavigation:false};
  const before=JSON.stringify(project),sync=createSWBF2Package(project,settings),async=await createSWBF2PackageAsync(project,settings);
  if(crc32(sync.zip)!==crc32(async.zip)||sync.zip.length!==async.zip.length||sync.files.size!==async.files.size)throw Error('Worker package bytes differ');
  for(const [name,value] of sync.files){const other=async.files.get(name);if(typeof value==='string'?value!==other:crc32(value)!==crc32(other)||value.length!==other.length)throw Error('Worker file differs: '+name);}
  if(JSON.stringify(project)!==before)throw Error('Worker export mutated source');
 });
 assert.deepEqual(errors,[]);
 console.log('PASS full Rainwell export, cached preview, responsive preparation/cancellation and unchanged source. Export '+measurements.export+' ms; longest main-thread task '+Math.round(worst)+' ms.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
