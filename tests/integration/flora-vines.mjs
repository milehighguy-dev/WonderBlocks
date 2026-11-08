import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
import {defaultFlora,addFloraAsset} from '../../src/flora/flora.js';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
const artifacts=await mkdtemp(path.join(tmpdir(),'wb-vines-'));
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 await page.evaluate(async()=>{const {TransformControls}=await import('/src/editor/transform-controls.js'),attach=TransformControls.prototype.attach;TransformControls.prototype.attach=function(object){const result=attach.call(this,object);window.shortcutControls=this;return result;};});
 const flora=defaultFlora();addFloraAsset(flora,flora.branches[0].id,'flora-basic-branch');
 const project={format:'open-building-studio',version:1,name:'Manual vine',parts:[makePart('flora',{flora})]};
 await page.locator('#file').setInputFiles({name:'manual-vine.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>document.getElementById('title').value==='Manual vine'&&!document.getElementById('scene-loading')?.open);
 await page.locator('[data-workspace-mode=flora]').click();await page.locator('#scene-outline .scene-select').first().click();await page.locator('[data-flora-edit]').click();
 const extend=page.getByRole('button',{name:'Extend branch',exact:true});await extend.waitFor({state:'visible'});
 await page.keyboard.press('e');
 const rotationHandle=await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),c=window.shortcutControls;c.getHelper().updateMatrixWorld(true);const rect=c.domElement.getBoundingClientRect();for(const mesh of c._gizmo.picker.rotate.children){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/30))){const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(c.camera);if(Math.abs(point.x)>.95||Math.abs(point.y)>.95)continue;c.pointerHover({x:point.x,y:point.y,button:0});if(c.axis)return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};}}throw Error('No visible rotation handle');});
 await page.mouse.move(rotationHandle.x,rotationHandle.y);assert.ok(await page.evaluate(()=>window.shortcutControls.axis));await page.keyboard.press('r');
 assert.equal(await page.evaluate(()=>window.shortcutControls.mode),'scale');assert.equal(await page.evaluate(()=>window.shortcutControls.axis),null,'R clears the hovered rotation handle');
 const joint=await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),c=window.shortcutControls;c.object.updateWorldMatrix(true,false);const point=c.object.getWorldPosition(new T.Vector3()).project(c.camera),rect=c.domElement.getBoundingClientRect();return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};});
 await page.mouse.move(joint.x,joint.y);await page.mouse.down();await page.mouse.move(joint.x,joint.y-40,{steps:5});await page.mouse.up();
 const scaleDownload=page.waitForEvent('download');await page.keyboard.press('Control+s');const scaled=JSON.parse(await readFile(await(await scaleDownload).path(),'utf8'));assert.ok(scaled.parts[0].flora.branches[0].radii[1]>flora.branches[0].radii[1],'R enables a real pointer scale gesture');await page.keyboard.press('Control+z');

 for(let i=0;i<6;i++)await extend.click();
 assert.equal(await page.getByRole('combobox',{name:'Selected plant part'}).locator('option').count(),8);
 const download=async()=>{const pending=page.waitForEvent('download');await page.keyboard.press('Control+s');return JSON.parse(await readFile(await(await pending).path(),'utf8'));};
 const eight=await download();assert.equal(eight.parts[0].flora.branches[0].points.length,8);
 await extend.click();const continued=await download();assert.equal(continued.parts[0].flora.branches.length,2);assert.equal(continued.parts[0].flora.branches[1].parent,continued.parts[0].flora.branches[0].id);
 await page.keyboard.press('Control+z');assert.deepEqual(await download(),eight);
 await page.keyboard.press('Control+Shift+z');assert.deepEqual(await download(),continued);
 await page.locator('[data-context-action=done]').click();assert.deepEqual(await download(),continued);
 assert.equal(await page.locator('[data-workspace-mode=flora]').getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);
 console.log('PASS browser: R activates scaling after rotation hover; Extend branch, Undo/Redo and Done preserve the vine.');
}catch(error){await page?.screenshot({path:path.join(artifacts,'failure.png')}).catch(()=>{});console.error('Vine browser artifacts: '+artifacts);throw error;}
finally{await browser?.close();await new Promise(r=>server.close(r));}
