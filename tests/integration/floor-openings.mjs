import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {storeysFixture} from '../fixtures/storeys-fixture.js';
const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,artifacts=await mkdtemp(path.join(tmpdir(),'wb-floor-openings-'));
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 const project=storeysFixture();await page.locator('#file').setInputFiles({name:'floor-openings.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);
 await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),old=T.Mesh.prototype.onBeforeRender;T.Mesh.prototype.onBeforeRender=function(renderer,scene,camera,...rest){if(scene.children.some(g=>g.children.some(m=>m.userData.handle?.startsWith('floor-opening:'))))window.floorOpeningView={renderer,scene,camera};return old.call(this,renderer,scene,camera,...rest);};});
 await page.locator('#scene-outline').getByRole('button',{name:project.parts[0].name,exact:true}).click();await page.locator('#selection-action').click();
 const editor=page.getByRole('dialog',{name:'3D interior editor',exact:true});await editor.waitFor({state:'visible'});
 await editor.locator('[data-stair-select]').selectOption('main-stair');await editor.locator('[data-edit-floor-opening]').click();
 const width=editor.locator('[data-floor-opening-width]'),initial=Number(await width.inputValue());
 await width.fill('3');await width.press('Tab');assert.equal(Number(await width.inputValue()),3);
 await editor.locator('[data-undo]').click();assert.equal(Number(await width.inputValue()),initial);await editor.locator('[data-redo]').click();assert.equal(Number(await width.inputValue()),3);
 await width.fill('100');await width.press('Tab');assert.equal(Number(await width.inputValue()),3,'out-of-building resize is rejected');
 const handle=async mode=>page.evaluate(mode=>{const {scene,camera,renderer}=window.floorOpeningView;scene.updateMatrixWorld(true);let grip;scene.traverse(m=>{if(m.userData.handle==='floor-opening:'+mode+':main-stair')grip=m;});if(!grip)throw Error('Missing opening handle '+mode);const p=grip.getWorldPosition(new camera.position.constructor()).project(camera),r=renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},mode);
 let point=await handle('right');await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+35,point.y,{steps:5});await page.mouse.up();const dragged=Number(await width.inputValue());assert.notEqual(dragged,3,'gold edge handle resizes the actual opening');
 await editor.locator('[data-undo]').click();assert.equal(Number(await width.inputValue()),3);await editor.locator('[data-redo]').click();assert.equal(Number(await width.inputValue()),dragged);
 point=await handle('right');await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+25,point.y,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();assert.equal(Number(await width.inputValue()),dragged,'Escape restores drag start');
 await editor.locator('[data-reset-floor-opening]').click();assert.equal(Number(await width.inputValue()),initial);await editor.locator('[data-undo]').click();assert.equal(Number(await width.inputValue()),dragged);
 await editor.locator('[data-edit-floor-opening]').click();point=await handle('move');await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+22,point.y,{steps:4});await page.mouse.up();assert.equal(await editor.locator('[data-floor-opening-settings]').isVisible(),true,'centre selects opening directly');assert.equal(Number(await width.inputValue()),dragged,'moving preserves dimensions');await page.locator('[data-context-action=frame]').click();await editor.screenshot({path:path.join(artifacts,'floor-opening-editor.png')});
 await page.locator('[data-context-action=done]').click();
 async function saved(){const pending=page.waitForEvent('download');await page.locator('#save').click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));}
 const savedProject=await saved(),building=savedProject.project?.parts?.[0]||savedProject.parts[0];assert.ok(building.interior.stairs[0].opening);assert.equal(building.interior.stairs[0].opening.width,dragged);
 await page.locator('#selection-action').click();await editor.locator('[data-stair-select]').selectOption('main-stair');await editor.locator('[data-edit-floor-opening]').click();assert.equal(Number(await width.inputValue()),dragged);
 await width.fill('4');await width.press('Tab');await page.locator('[data-context-action=cancel]').click();const cancelled=await saved(),after=cancelled.project?.parts?.[0]||cancelled.parts[0];assert.equal(after.interior.stairs[0].opening.width,dragged);
 assert.deepEqual(errors,[]);console.log('PASS: floor opening controls, drag, Undo/Redo, invalid resize, Escape, reset, save/reopen and Cancel. Artifacts: '+artifacts);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
