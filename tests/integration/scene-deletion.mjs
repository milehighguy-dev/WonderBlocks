import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));

 // Observe the actual editor assembly without exposing app internals or touching
 // the user's browser. Root/collision identity detects costly silent rebuilds.
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),add=T.Object3D.prototype.add;window.sceneRoots=new Map();T.Object3D.prototype.add=function(...children){for(const child of children)if(child.userData.partId)sceneRoots.set(child.userData.partId,child);return add.apply(this,children);};});
 const trees=Array.from({length:24},(_,i)=>makePart('flora',{...instantiateFloraTreePreset(i%2?'endor-woodland-tree':'dagobah-twisted-elder'),name:i?'Remaining tree '+i:'Distant forest elder',position:[i*18,0,0]}));
 const floor=makePart('block',{name:'Ground',scale:[90,1,30]}),route=makePart('stair-route',{name:'Unrelated route',position:[0,1,12]});
 const project={format:'open-building-studio',version:1,name:'Tree deletion regression',parts:[floor,route,...trees]};
 await page.locator('#file').setInputFiles({name:'tree-deletion.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>document.getElementById('title').value==='Tree deletion regression'&&!document.getElementById('scene-loading')?.open,null,{timeout:90000});
 const save=async()=>{const pending=page.waitForEvent('download');await page.locator('#save').click();return JSON.parse(await readFile(await(await pending).path(),'utf8'));};
 const opened=await save();
 await page.getByRole('button',{name:'Distant forest elder',exact:true}).click();
 await page.evaluate(()=>{window.beforeRoots=new Map(sceneRoots);window.beforeCollision=new Map([...beforeRoots].map(([id,root])=>[id,root.userData.collision]));window.disposedRoots=[];for(const [id,root] of beforeRoots)root.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposedRoots.push(id)));});
 const elapsed=await page.evaluate(()=>{const start=performance.now();document.getElementById('delete-toolbar').click();return performance.now()-start;});
 const result=await page.evaluate(ids=>({elapsed:null,rebuilt:ids.filter(id=>beforeRoots.get(id)!==sceneRoots.get(id)),disposed:[...new Set(disposedRoots)],collisionChanges:ids.filter(id=>beforeRoots.get(id).parent&&beforeCollision.get(id)!==sceneRoots.get(id).userData.collision)}),project.parts.map(p=>p.id));
 console.log(JSON.stringify({deleteMilliseconds:Math.round(elapsed),rebuiltObjects:result.rebuilt.length,disposedObjects:result.disposed.length}));
  assert.deepEqual(result.rebuilt,[],'surviving trees, floor and route retain their meshes');
  assert.deepEqual(result.collisionChanges,[],'surviving objects retain prepared collision');
  assert.deepEqual(result.disposed,[trees[0].id],'only the deleted tree geometry is disposed');
  for(const action of ['undo','redo']){await page.locator('#'+action).click();assert.equal(await page.getByRole('button',{name:'Distant forest elder',exact:true}).count(),action==='undo'?1:0);}
  const saved=await save();assert.deepEqual(saved.parts,opened.parts.filter(p=>p.id!==trees[0].id));
 const objects=['block','round','platform','stair-route','wall-route'].map((type,i)=>makePart(type,{name:'Delete '+type,position:[i*20,0,50]}));
 const grouped=[0,1].map(i=>makePart('block',{name:'Group member '+i,position:[i*3,0,90],assemblyId:'delete-group',assemblyName:'Delete group'}));
 const next={...project,name:'All object deletion',parts:[...objects,...grouped,...trees.slice(1,3)]};
 await page.locator('#file').setInputFiles({name:'all-deletion.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(next))});
 await page.waitForFunction(()=>document.getElementById('title').value==='All object deletion'&&!document.getElementById('scene-loading')?.open);
 for(const [index,item] of [...objects,{name:'Select object group Delete group',ids:grouped.map(p=>p.id)}].entries()){
  await page.getByRole('button',{name:item.name,exact:true}).click();
  const current=(await save()).parts.map(p=>p.id),deleted=item.ids||[item.id];
  await page.evaluate(ids=>{window.deletionSnapshot=new Map(ids.map(id=>[id,sceneRoots.get(id)]));},current);
  if(index%2)await page.keyboard.press('Delete');else await page.locator('#delete-toolbar').click();
  assert.deepEqual(await page.evaluate(ids=>ids.filter(id=>deletionSnapshot.get(id)!==sceneRoots.get(id)),current.filter(id=>!deleted.includes(id))),[],item.name+' preserves every unrelated mesh');
  assert.deepEqual((await save()).parts.map(p=>p.id),current.filter(id=>!deleted.includes(id)));
 }
 // A room removal must restore the host's solid geometry without rebuilding a
 // distant object. This catches over-aggressive reuse of old cut surfaces.
 const room=makePart('interior',{name:'Delete room',interior:defaultInterior()}),host=makePart('block',{name:'Cut host',scale:[10,10,10]}),far=makePart('block',{name:'Distant block',position:[100,0,100]});
 const cutScene={...project,name:'Delete room cut',parts:[room,host,far]};
 await page.locator('#file').setInputFiles({name:'room-deletion.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cutScene))});
 await page.waitForFunction(()=>document.getElementById('title').value==='Delete room cut'&&!document.getElementById('scene-loading')?.open);
 await page.getByRole('button',{name:'Delete room',exact:true}).click();
 await page.evaluate(ids=>{window.deletionSnapshot=new Map(ids.map(id=>[id,sceneRoots.get(id)]));},[host.id,far.id]);
 await page.locator('#delete-toolbar').click();
 assert.deepEqual(await page.evaluate(ids=>ids.filter(id=>deletionSnapshot.get(id)!==sceneRoots.get(id)),[host.id,far.id]),[host.id],'only the cut host is rebuilt');
 const restored=await page.evaluate(id=>Array.from(sceneRoots.get(id).children[0].geometry.attributes.position.array),host.id);
 const uncut=await page.evaluate(async part=>{const {buildPart,disposePart}=await import('/src/core/geometry.js'),root=buildPart(part,{batch:true,collision:false});try{return Array.from(root.children[0].geometry.attributes.position.array);}finally{disposePart(root);}},host);
 assert.deepEqual(restored,uncut,'deleting the room restores the original solid host');
 console.log('PASS shape, platform, route, wall, group, toolbar and keyboard deletion; room cuts rebuild only the affected hull');
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
