import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {makePart} from '../../src/core/model.js';
import * as T from '../../vendor/three.module.js';
import {buildPart,disposePart} from '../../src/core/geometry.js';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[],output=await mkdtemp(path.join(tmpdir(),'wb-group-scale-')),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} versus ${b}`);
function bounds(parts){const box=new T.Box3();for(const part of parts){const root=buildPart(part,{collision:false});box.union(new T.Box3().setFromObject(root,true));disposePart(root);}return box;}
try{
 browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?demo=classical-temple');await page.waitForFunction(()=>!document.querySelector('#scene-loading')?.open,null,{timeout:60000});
 await page.evaluate(async()=>{const {TransformControls}=await import('/src/editor/transform-controls.js'),previous=TransformControls.prototype.pointerHover;TransformControls.prototype.pointerHover=function(pointer){if(this.object&&this.mode==='scale')window.groupScaleControl=this;return previous.call(this,pointer);};});
 const parts=[makePart('block',{name:'Reflected thin part',position:[-4,1,0],rotation:[.2,.7,0],scale:[-3,.08,6],assemblyId:'group',assemblyName:'Scale study'}),makePart('block',{name:'Rotated part',position:[5,2,-3],rotation:[0,-.4,.1],scale:[1,2,4],assemblyId:'group',assemblyName:'Scale study'})];
 const groundOffset=bounds(parts).min.y;for(const part of parts)part.position[1]-=groundOffset;
 await page.locator('#file').setInputFiles({name:'group.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'open-building-studio',version:1,name:'Group scale',parts}))});await page.waitForFunction(()=>!document.querySelector('#scene-loading')?.open&&document.getElementById('title').value==='Group scale');
 await page.getByRole('button',{name:'Select object group Scale study',exact:true}).click();const normalized=(await saved()).parts,scale=page.locator('.toolbar [data-mode=scale]');assert.equal(await scale.isDisabled(),false);await scale.click();
 const canvas=await page.locator('#viewport>canvas').boundingBox();await page.mouse.move(canvas.x+canvas.width*.9,canvas.y+canvas.height*.7);
 const handle=await page.evaluate(()=>{const c=window.groupScaleControl;c.getHelper().updateMatrixWorld(true);const point=c.object.getWorldPosition(c.worldPosition.clone()),pivot=point.toArray(),screen=point.project(c.camera),r=c.domElement.getBoundingClientRect();return {pivot,uniform:c.uniformScale,x:r.left+(screen.x+1)*r.width/2,y:r.top+(1-screen.y)*r.height/2,axisHandles:c._gizmo.gizmo.scale.children.filter(h=>h.name!=='XYZ'&&h.visible).length};});assert.equal(handle.uniform,true);assert.equal(handle.axisHandles,0);
 close(handle.pivot[1],0);
 await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(handle.x+65,handle.y-65,{steps:12});await page.mouse.up();
 async function saved(){const pending=page.waitForEvent('download');await page.locator('#save').click();const download=await pending;return JSON.parse(await readFile(await download.path(),'utf8'));}
 const scaled=(await saved()).parts,factor=scaled[0].scale[0]/parts[0].scale[0];assert.ok(factor>1);
 close(bounds(scaled).min.y,0);close(bounds(scaled).max.y,bounds(parts).max.y*factor);
 scaled.forEach((p,index)=>{const original=parts[index];p.scale.forEach((v,i)=>close(v/original.scale[i],factor));p.position.forEach((v,i)=>close(v,handle.pivot[i]+(original.position[i]-handle.pivot[i])*factor));assert.deepEqual(p.rotation,original.rotation);assert.equal(p.assemblyId,'group');});
 await page.locator('#undo').click();assert.deepEqual((await saved()).parts,normalized);await page.locator('#redo').click();assert.deepEqual((await saved()).parts,scaled);assert.ok((await scale.getAttribute('class')).includes('active'));
 if(!await page.locator('#inspector-transform').evaluate(node=>node.open))await page.locator('#inspector-transform>summary').click();await page.getByRole('spinbutton',{name:'Scale group by',exact:true}).fill('2');await page.getByRole('spinbutton',{name:'Scale group by',exact:true}).press('Tab');const numeric=(await saved()).parts;numeric.forEach((p,index)=>p.scale.forEach((v,i)=>close(v/scaled[index].scale[i],2)));
 close(bounds(numeric).min.y,0);close(bounds(numeric).max.y,bounds(scaled).max.y*2);
 await page.getByRole('spinbutton',{name:'Scale group by',exact:true}).fill('0.5');await page.getByRole('spinbutton',{name:'Scale group by',exact:true}).press('Tab');const reduced=(await saved()).parts;close(bounds(reduced).min.y,0);close(bounds(reduced).max.y,bounds(scaled).max.y);
 await page.locator('#viewport').screenshot({path:path.join(output,'group-scale.png')});
 await page.getByRole('button',{name:'Expand Scale study',exact:true}).click();await page.locator('#scene-outline .scene-child .scene-select').first().click();await page.mouse.move(canvas.x+canvas.width*.9,canvas.y+canvas.height*.7);
 const single=await page.evaluate(()=>{const c=window.groupScaleControl;c.getHelper().updateMatrixWorld(true);return {uniform:c.uniformScale,axes:c._gizmo.gizmo.scale.children.filter(h=>h.name!=='XYZ'&&h.visible).length};});assert.equal(single.uniform,false);assert.ok(single.axes>0);assert.equal(await page.locator('#group-scale').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS group scale center drag, rotated/reflected proportions, numeric multiplier, save, undo/redo, and restored single-object axes. Screenshot: '+output);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
