import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
import {platformPorts} from '../../src/platforms/platform.js';
import {defaultHallwayRoute} from '../../src/routes/hallway.js';
import {instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true}),errors=[];
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),add=T.Object3D.prototype.add;T.Object3D.prototype.add=function(...objects){if(!window.historyAssembly&&this.type==='Group'&&this.parent?.isScene&&objects.some(o=>o.userData.partId))window.historyAssembly=this;return add.apply(this,objects);};});
 const block=makePart('block',{name:'Edited block',scale:[4,3,4]}),platform=makePart('platform',{name:'Connected deck',position:[30,2,0]}),port=platformPorts(platform).find(p=>p.ref.side==='back');
 const route=makePart('stair-route',{name:'Connected route',route:{width:2,thickness:.2,gap:.15,segments:[{kind:'landing',run:4,rise:0,steps:1,turn:'straight'}],links:{start:port.ref}}});
 const trees=Array.from({length:12},(_,i)=>makePart('flora',{...instantiateFloraTreePreset('dagobah-twisted-elder'),name:'Background tree '+i,position:[i*16,0,60]}));
 const project={format:'open-building-studio',version:1,name:'History performance',parts:[block,platform,route,...trees]};
 await page.locator('#file').setInputFiles({name:'history-performance.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>document.getElementById('title').value==='History performance'&&!document.getElementById('scene-loading')?.open,null,{timeout:90000});
 const save=async()=>{const pending=page.waitForEvent('download');await page.locator('#save').click();return JSON.parse(await readFile(await(await pending).path(),'utf8'));};
 const snapshot=()=>page.evaluate(()=>{window.historyRoots=new Map(historyAssembly.children.map(root=>[root.userData.partId,root]));});
 const changed=()=>page.evaluate(()=>historyAssembly.children.filter(root=>historyRoots.get(root.userData.partId)!==root).map(root=>root.userData.partId));
 await page.getByRole('button',{name:block.name,exact:true}).click();await page.locator('#position-1').fill('7');await page.locator('#position-1').press('Tab');
 for(const [action,y] of [['undo',0],['redo',7]]){
  await snapshot();await page.locator('#'+action).click();assert.deepEqual(await changed(),[block.id],action+' rebuilds only the edited block');
  assert.equal(await page.evaluate(id=>historyAssembly.children.find(root=>root.userData.partId===id).position.y,block.id),y,'the visible transform follows history');
 }
 // An isolated transform uses the direct mesh update path. Its render snapshot
 // must advance too, or Undo can incorrectly reuse the still-moved mesh.
 await page.getByRole('button',{name:block.name,exact:true}).click();await page.locator('#scale-1').fill('5');await page.locator('#scale-1').press('Tab');
 await snapshot();await page.locator('#undo').click();assert.deepEqual(await changed(),[block.id]);
 assert.equal(await page.evaluate(id=>historyAssembly.children.find(root=>root.userData.partId===id).scale.y,block.id),3);
 // Route editing replaces a connected platform's live preview. Cancel returns
 // the original mesh and collision object without building the scene again.
 await page.getByRole('button',{name:route.name,exact:true}).click();const before=await save();await snapshot();
 await page.locator('#selection-action').click();await page.locator('#route-width').fill('3');await page.locator('#route-width').press('Tab');
 await page.locator('[data-context-action=cancel]').click();assert.deepEqual(await changed(),[],'cancel restores original scene meshes');assert.deepEqual(await save(),before);
 // Cancel a plant session while keeping all scene meshes, including its source.
 await page.getByRole('button',{name:trees[0].name,exact:true}).click();await snapshot();await page.locator('#selection-action').click();
 await page.locator('[data-context-action=cancel]').click();assert.deepEqual(await changed(),[]);
 const isolated={...project,name:'Isolated history',parts:[block,...trees.slice(0,2)]};
 await page.locator('#file').setInputFiles({name:'isolated-history.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(isolated))});
 await page.waitForFunction(()=>document.getElementById('title').value==='Isolated history'&&!document.getElementById('scene-loading')?.open);
 await page.getByRole('button',{name:block.name,exact:true}).click();await page.locator('#position-1').fill('5');await page.locator('#position-1').press('Tab');
 for(const [action,y] of [['undo',0],['redo',5]]){
  await snapshot();await page.locator('#'+action).click();assert.deepEqual(await changed(),[block.id]);
  assert.equal(await page.evaluate(id=>historyAssembly.children.find(root=>root.userData.partId===id).position.y,block.id),y,'isolated live mesh transform follows '+action);
 }
 const host=makePart('block',{name:'Cut building',scale:[10,10,10]}),hall=makePart('stair-route',{name:'Cutting hallway',position:[0,1,2],route:defaultHallwayRoute()});
 const hullScene={...project,name:'Cancel hull preview',parts:[host,hall,...trees.slice(0,2)]};
 await page.locator('#file').setInputFiles({name:'cancel-hull.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(hullScene))});
 await page.waitForFunction(()=>document.getElementById('title').value==='Cancel hull preview'&&!document.getElementById('scene-loading')?.open);
 await page.getByRole('button',{name:hall.name,exact:true}).click();const hullBefore=await save();await snapshot();
 await page.locator('#selection-action').click();await page.locator('#route-run').fill('5');await page.locator('#route-run').press('Tab');
 assert.ok((await changed()).includes(host.id),'the draft actually replaces the cut hull');
 await page.locator('[data-context-action=cancel]').click();assert.deepEqual(await changed(),[],'cancel restores the original cut hull');assert.deepEqual(await save(),hullBefore);
 assert.deepEqual(errors,[]);console.log('PASS scene Undo/Redo retain unrelated meshes; transforms restore visibly; route and plant Cancel retain original scene geometry');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
