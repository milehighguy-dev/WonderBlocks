import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
import {defaultHallwayRoute} from '../../src/routes/hallway.js';
const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 const load=async(parts,name)=>{await page.locator('#file').setInputFiles({name:'regression.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'open-building-studio',version:1,name,parts}))});await page.waitForFunction(name=>document.getElementById('title').value===name&&!document.getElementById('scene-loading')?.open,name);};
 const save=async()=>{const pending=page.waitForEvent('download');await page.locator('#save').click();return JSON.parse(await readFile(await(await pending).path(),'utf8'));};
 const parts=Array.from({length:32},(_,i)=>makePart('block',{name:'Block '+i,position:[i%8*3,0,Math.floor(i/8)*3],...(i<2?{assemblyId:'group',assemblyName:'Two blocks'}:{})}));
 await load(parts,'Render regression');await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),remove=T.Object3D.prototype.remove;window.partRemovals=0;T.Object3D.prototype.remove=function(...objects){partRemovals+=objects.filter(o=>o.userData?.partId).length;return remove.apply(this,objects);};});
 await page.getByRole('button',{name:'Block 5',exact:true}).click();await page.locator('#part-name').fill('Renamed block');await page.locator('#part-name').press('Tab');assert.equal(await page.evaluate(()=>partRemovals),0,'renaming does not rebuild scene geometry');
 await page.evaluate(()=>partRemovals=0);await page.locator('#duplicate-toolbar').click();assert.equal((await save()).parts.length,33);assert.equal(await page.evaluate(()=>partRemovals),32,'duplicate rebuilds the scene once instead of repeating it during commit');
 const host=makePart('block',{name:'Fit host',scale:[4,4,4]}),route=makePart('stair-route',{name:'Fitted passage',route:defaultHallwayRoute(),position:[0,0,2]});route.route.segments[0].hallway.entranceFit={partId:host.id,end:'start'};
 await load([host,route],'Host removal');await page.getByRole('button',{name:'Fit host',exact:true}).click();await page.locator('#delete-toolbar').click();const removed=await save();assert.equal(removed.parts.length,1);assert.equal(removed.parts[0].route.segments[0].hallway.entranceFit,undefined);
 await page.locator('#undo').click();const restored=await save();assert.equal(restored.parts.length,2);assert.equal(restored.parts[1].route.segments[0].hallway.entranceFit.partId,host.id);
 const landing=makePart('stair-route',{name:'Landing host',position:[0,0,10],route:defaultHallwayRoute()}),linked=makePart('stair-route',{name:'Linked passage',route:defaultHallwayRoute()});linked.route.links={end:{partId:landing.id,segment:0,side:'back'}};
 await load([landing,linked],'Connected render regression');assert.equal((await save()).parts[1].route.segments[0].run,10);
 await page.getByRole('button',{name:'Landing host',exact:true}).click();await page.evaluate(()=>partRemovals=0);await page.locator('#position-2').fill('12');await page.locator('#position-2').press('Tab');const connected=await save();assert.equal(connected.parts[1].route.segments[0].run,12,'moving the host refits the connected route before saving');assert.equal(await page.evaluate(()=>partRemovals),2,'connected scene rebuilds once after a host move');
 await page.locator('#undo').click();assert.equal((await save()).parts[1].route.segments[0].run,10);await page.locator('#redo').click();assert.equal((await save()).parts[1].route.segments[0].run,12);
 assert.deepEqual(errors,[]);console.log('PASS no geometry rebuild on rename, one rebuild per duplicate, fitted-host deletion cleanup, connected route updates and undo/redo.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
