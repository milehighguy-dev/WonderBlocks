import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
import {defaultFlora,addFloraAsset} from '../../src/flora/flora.js';

const baseline=process.argv.includes('--baseline'),root=fileURLToPath(new URL('../../',import.meta.url)),output=path.resolve(root,'../../work/workbench-review');await mkdir(output,{recursive:true});
const {createServer}=createRequire(import.meta.url)('../../server.cjs');const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?demo=classical-temple');await ready();
 async function ready(){await page.waitForFunction(()=>!document.querySelector('#scene-loading')?.open,null,{timeout:60000});}
 async function capture(name){
  await page.evaluate(async()=>{const images=[...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight;});await Promise.all(images.map(img=>img.decode().catch(()=>{})));});
  await page.screenshot({path:path.join(output,(baseline?'before-':'after-')+name+'.png'),animations:'disabled'});
 }
 async function layout(){
  const result=await page.evaluate(()=>{const header=document.querySelector('body>header'),viewport=document.querySelector('#viewport'),canvas=viewport.querySelector('canvas'),modes=header.querySelector('.workspace-modes').getBoundingClientRect(),actions=header.querySelector('.actions').getBoundingClientRect();return {header:header.getBoundingClientRect().bottom,viewport:viewport.getBoundingClientRect().top,canvas:canvas.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth-innerWidth,overlap:modes.bottom>actions.top+2&&actions.bottom>modes.top+2&&modes.right>actions.left+2};});
  assert.ok(result.canvas>300);if(!baseline){assert.ok(result.overflow<=1,JSON.stringify(result));assert.equal(result.overlap,false,JSON.stringify(result));assert.ok(result.viewport>=result.header-1);}
 }
 await page.locator('#scene-outline .scene-select').first().click();await layout();await capture('object');
 if(!baseline){
  await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),previous=T.Mesh.prototype.onBeforeRender;window.restoreVisibilityCheck=()=>T.Mesh.prototype.onBeforeRender=previous;T.Mesh.prototype.onBeforeRender=function(renderer,scene,...args){if(renderer.domElement.parentElement?.id==='viewport')window.viewportVisibility={floor:scene.getObjectByName('Editor floor')?.visible,grid:scene.getObjectByName('Editor grid')?.visible};return previous.call(this,renderer,scene,...args);};});
  try{
   await page.getByRole('button',{name:'Floor on',exact:true}).click();await page.waitForFunction(()=>window.viewportVisibility?.floor===false&&window.viewportVisibility?.grid===true);assert.equal(await page.locator('#floor-toggle').getAttribute('aria-pressed'),'false');
   await page.getByRole('button',{name:'Grid on',exact:true}).click();await page.waitForFunction(()=>window.viewportVisibility?.floor===false&&window.viewportVisibility?.grid===false);
   await page.getByRole('button',{name:'Floor off',exact:true}).click();await page.waitForFunction(()=>window.viewportVisibility?.floor===true&&window.viewportVisibility?.grid===false);
   await page.getByRole('button',{name:'Grid off',exact:true}).click();await page.waitForFunction(()=>window.viewportVisibility?.floor===true&&window.viewportVisibility?.grid===true);
  }finally{await page.evaluate(()=>window.restoreVisibilityCheck());}
 }
 await page.setViewportSize({width:1100,height:800});await layout();await capture('compact');await page.setViewportSize({width:1440,height:960});
 await page.locator('[data-workspace-mode=material]').click();await page.locator('.material-workspace .texture-category-grid').waitFor({state:'visible'});await capture('materials');
 await page.locator('.material-workspace [data-texture-category=tatooine]').click();await page.locator('.material-workspace .texture-card').first().waitFor({state:'visible'});await capture('textures');
 async function openPart(part){await page.locator('[data-workspace-mode=object]').click();await page.locator('#file').setInputFiles({name:'ui-study.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'open-building-studio',version:1,name:'UI study',parts:[part]}))});await ready();await page.locator('#scene-outline .scene-select').first().click();}
 const flora=defaultFlora(),trunk=addFloraAsset(flora,flora.branches[0].id,'flora-basic-trunk');addFloraAsset(flora,trunk.id,'flora-ginkgo-leaf',.85);addFloraAsset(flora,trunk.id,'flora-ginkgo-leaf',.65,Math.PI);
 await openPart(makePart('flora',{name:'Tree study',flora}));await page.locator('[data-workspace-mode=flora]').click();await capture('flora');await page.locator('[data-flora-edit]').click();await page.locator('.editing-context[data-mode=flora]').waitFor();await capture('flora-edit');
 const move=page.getByRole('checkbox',{name:'Move with mouse',exact:true});assert.equal(await move.isChecked(),true);await move.uncheck();await move.check();await page.locator('.context-done').click();assert.equal(await page.locator('[data-workspace-mode=flora]').getAttribute('aria-pressed'),'true');
 await openPart(makePart('stair-route',{name:'Route study'}));await page.locator('#selection-action').click();await page.locator('.editing-context[data-mode=route]').waitFor();await capture('route');await page.locator('.context-done').click();
 await openPart(makePart('interior',{name:'Room study'}));await page.locator('#selection-action').click();await page.locator('.editing-context[data-mode=interior]').waitFor();await capture('rooms');await page.locator('.context-done').click();
 await page.setViewportSize({width:740,height:900});await layout();await capture('narrow');
 assert.deepEqual(errors,[]);console.log('PASS object, material, flora, route and room workspaces; header layout at 1440/1100/740px. Images: '+output);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
