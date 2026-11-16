import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {Vector3} from '../../vendor/three.module.js';
import {makePart,validateProject} from '../../src/core/model.js';
import {defaultFlora,addFloraAsset} from '../../src/flora/flora.js';
import {defaultHallwayRoute} from '../../src/routes/hallway.js';
import {partMatrix} from '../../src/interiors/entrances.js';
import {routeLayout} from '../../src/routes/stair-route.js';
const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.savedDestinations=[];window.showSaveFilePicker=async()=>({name:'route-destination.building.json',createWritable:async()=>({write:async text=>savedDestinations.push(JSON.parse(text)),close:async()=>{}})});});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 const load=async(parts,name)=>{await page.locator('#file').setInputFiles({name:'route-destination.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'open-building-studio',version:1,name,parts}))});await page.waitForFunction(name=>document.getElementById('title').value===name&&!document.getElementById('scene-loading')?.open,name);};
 const save=async()=>{const count=await page.evaluate(()=>savedDestinations.length);await page.keyboard.press('Control+s');await page.waitForFunction(count=>savedDestinations.length>count,count);return page.evaluate(()=>savedDestinations.at(-1));};
 const open=async()=>{await page.locator('#scene-outline').getByRole('button',{name:'Tree entry hallway',exact:true}).click();await page.locator('#selection-action').click();await page.waitForFunction(()=>document.querySelector('.editing-context').dataset.mode==='route');};
 const tip=part=>new Vector3(...routeLayout(part.route).at(-1).end).applyMatrix4(partMatrix(part));
 for(const [action,type]of [['Add interior','interior'],['Add platform','platform']]){
  const flora=defaultFlora();addFloraAsset(flora,flora.branches[0].id,'flora-basic-branch');flora.branches[0].points=[[0,0,0],[0,12,0]];flora.branches[0].radii=[2,1];
  const tree=makePart('flora',{name:'Tree host',flora}),route=makePart('stair-route',{name:'Tree entry hallway',position:[0,3,4],rotation:[Math.PI-.001,.18,-Math.PI+.006],route:defaultHallwayRoute()});route.route.segments[0].run=8;route.route.segments[0].hallway.entranceFit={partId:tree.id,end:'start'};
  await load([tree,route],action+' from a tree');await open();const button=page.locator('.route-destinations').getByRole('button',{name:action,exact:true});assert.equal(await button.isDisabled(),true);
  await page.getByRole('button',{name:'Level route',exact:true}).click();assert.equal(await button.isDisabled(),false);const levelled=(await save()).parts.find(p=>p.id===route.id);assert.ok(tip(route).distanceTo(tip(levelled))<1e-7);
  await page.locator('#route-back').click();assert.equal(await button.isDisabled(),true);(await save()).parts.find(p=>p.id===route.id).rotation.forEach((v,i)=>assert.ok(Math.abs(v-route.rotation[i])<1e-12));
  await page.locator('#route-redo').click();assert.equal(await button.isDisabled(),false);await button.click();await page.waitForFunction(type=>document.querySelector('.editing-context').dataset.mode===type,type);
  const result=await save();validateProject(result);assert.equal(result.parts.length,3);const linked=result.parts.find(p=>p.id===route.id);assert.equal(result.parts.find(p=>p.id===linked.route.links.end.partId).type,type);assert.ok(tip(route).distanceTo(tip(linked))<1e-7);
  await page.locator('[data-context-action=done]').click();await page.waitForFunction(()=>document.querySelector('.editing-context').dataset.mode==='object');
 }

 for(const [action,type]of [['Add interior','interior'],['Add platform','platform']]){
  const route=makePart('stair-route',{name:'Tree entry hallway',rotation:[Math.PI,.18,-Math.PI],route:defaultHallwayRoute()});
  await load([route],action+' equivalent upright rotation');await open();assert.equal(await page.getByRole('button',{name:'Level route',exact:true}).isVisible(),false);await page.locator('.route-destinations').getByRole('button',{name:action,exact:true}).click();await page.waitForFunction(type=>document.querySelector('.editing-context').dataset.mode===type,type);validateProject(await save());await page.locator('[data-context-action=done]').click();
 }
 // A destination outside the project bounds must fail before leaving the draft.
 for(const action of ['Add interior','Add platform']){
  const route=makePart('stair-route',{name:'Tree entry hallway',position:[990,2,990],rotation:[0,Math.PI/4,0],scale:[1,1,10],route:defaultHallwayRoute()});route.route.segments[0].run=8;
  await load([route],action+' rejected destination');await open();await page.locator('.route-destinations').getByRole('button',{name:action,exact:true}).click();
  assert.equal(await page.locator('#route-workspace').isVisible(),true,'invalid destination retains the editor');const saved=await save();assert.equal(saved.parts.length,1);assert.deepEqual(saved.parts[0].route,route.route);await page.locator('[data-context-action=cancel]').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS route destinations: tilted tree hallway, anchored levelling with Undo/Redo, room/platform creation and invalid-transition draft preservation.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
