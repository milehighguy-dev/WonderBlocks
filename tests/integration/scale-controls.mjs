import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';

const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,artifacts=await mkdtemp(path.join(tmpdir(),'wb-scale-'));
let browser,page;const errors=[];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} versus ${b}`);
async function drag(start,dx,dy){await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+dx,start.y+dy,{steps:12});await page.mouse.up();}
async function save(){const pending=page.waitForEvent('download');await page.locator('#save').click();const download=await pending;return JSON.parse(await readFile(await download.path(),'utf8'));}
try{
 browser=await chromium.launch({headless:true,channel:process.env.WONDERBLOCKS_BROWSER_CHANNEL||(existsSync(chromium.executablePath())?'chromium':'chrome'),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1000,height:800},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/tests/integration/fixtures/scale-controls.html');await page.waitForFunction(()=>window.scaleFixture);
 const start=[8,.08,12],results=[];
 for(const distance of [15,1500,150000]){
  const center=await page.evaluate(options=>window.scaleFixture.configure(options),{scale:start,position:[700,200,-650],distance,rotation:[.2,.5,-.1]});
  await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>window.scaleFixture.value()),start,'clicking the exact center must not change dimensions');
  await drag(center,80,-80);assert.equal(await page.evaluate(()=>window.lastScaleAxis),'XYZ');
  const scale=await page.evaluate(()=>window.scaleFixture.value());scale.forEach((v,i)=>close(v/start[i],scale[0]/start[0]));results.push(scale);
 }
 for(const scale of results)scale.forEach((v,i)=>close(v,results[0][i]));
 const center=await page.evaluate(()=>window.scaleFixture.configure({scale:[-8,.08,12],distance:40}));
 await page.keyboard.down('Shift');await drag(center,80,-80);await page.keyboard.up('Shift');
 const fine=await page.evaluate(()=>window.scaleFixture.value());assert.ok(fine[0]<-8&&Math.abs(fine[0])<results[0][0]);fine.forEach((v,i)=>close(v/[-8,.08,12][i],fine[0]/-8));
 await page.evaluate(()=>window.scaleFixture.configure({scale:[8,2,12],distance:40,rotation:[.2,.5,-.1]}));
 const axis=await page.evaluate(()=>window.scaleFixture.handle('X'));
 const originPoint=await page.evaluate(()=>window.scaleFixture.configure({scale:[8,2,12],distance:40,rotation:[.2,.5,-.1]}));
 const dx=axis.x-originPoint.x,dy=axis.y-originPoint.y,length=Math.hypot(dx,dy);await drag(axis,dx/length*80,dy/length*80);
 assert.equal(await page.evaluate(()=>window.lastScaleAxis),'X');const single=await page.evaluate(()=>window.scaleFixture.value());assert.ok(single[0]>8);close(single[1],2);close(single[2],12);
 const reach=async()=>page.evaluate(()=>{const c=window.scaleFixture.configure({scale:[8,2,12],distance:40}),h=window.scaleFixture.handle('X');return Math.hypot(c.x-h.x,c.y-h.y);});
 const tall=await reach();await page.setViewportSize({width:1000,height:500});await page.waitForFunction(()=>document.querySelector('canvas').getBoundingClientRect().height===500);const short=await reach();assert.ok(Math.abs(tall-short)/tall<.05,'scale handles retain approximately the same pixel size across viewport heights');await page.setViewportSize({width:1000,height:800});await page.waitForFunction(()=>document.querySelector('canvas').getBoundingClientRect().height===800);
 const delegated=await page.evaluate(()=>{const f=window.scaleFixture,c=f.controls;f.configure({scale:[4,2,8],distance:40});c.setMode('translate');c.axis='X';c.pointerDown({x:.1,y:.1,button:0});c.pointerMove({x:.2,y:.1,button:-1});c.pointerUp({button:0});const moved=f.object.position.length();c.setMode('rotate');c.axis='Z';c.pointerDown({x:.1,y:.1,button:0});c.pointerMove({x:-.1,y:.1,button:-1});c.pointerUp({button:0});return {moved,rotation:f.object.rotation.z,scale:f.value()};});
 assert.ok(delegated.moved>0);assert.ok(Math.abs(delegated.rotation)>.01);assert.deepEqual(delegated.scale,[4,2,8]);
 console.log('PASS scale: center targeting, proportional snap, rotated axes, reflected objects, fine control and distance-independent sensitivity');

 await page.goto(origin+'/index.html');await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open,null,{timeout:90000});
 await page.evaluate(async()=>{const {TransformControls}=await import('/src/editor/transform-controls.js'),hover=TransformControls.prototype.pointerHover;TransformControls.prototype.pointerHover=function(pointer){if(this.object&&this.mode==='scale')window.scaleControl=this;return hover.call(this,pointer);};});
 for(const initial of [[8,.08,12],[800,.08,500]]){
  const project={format:'open-building-studio',version:1,name:'Scale regression',parts:[{id:'scale-target',type:'block',name:'Scale target',color:'#c4c1b1',position:[0,0,0],rotation:[0,.35,0],scale:initial}]};
  await page.locator('#file').setInputFiles({name:'scale.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await page.waitForFunction(()=>!document.getElementById('scene-loading').open&&document.getElementById('title').value==='Scale regression');
  await page.locator('.scene-select').filter({hasText:'Scale target'}).click();await page.locator('.toolbar [data-mode="scale"]').click();
  const canvas=await page.locator('#viewport > canvas').boundingBox();await page.mouse.move(canvas.x+canvas.width*.9,canvas.y+canvas.height*.7);
  const handle=await page.evaluate(()=>{const c=window.scaleControl;c.getHelper().updateMatrixWorld(true);const p=c.object.getWorldPosition(c.worldPosition.clone()).project(c.camera),rect=c.domElement.getBoundingClientRect();return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};});
  await drag(handle,65,-65);
  const scaled=(await save()).parts[0].scale,factor=scaled[0]/initial[0];assert.ok(factor>1);scaled.forEach((v,i)=>close(v/initial[i],factor));assert.ok(scaled.every(v=>v>=.05&&v<=1000));
  await page.locator('#undo').click();assert.deepEqual((await save()).parts[0].scale,initial);
  await page.locator('#redo').click();assert.deepEqual((await save()).parts[0].scale,scaled);
 }
 await page.locator('#viewport').screenshot({path:path.join(artifacts,'large-object-scale.png')});
 assert.deepEqual(errors,[]);console.log('PASS scale: actual editor drags preserve thin/large proportions through save, Undo and Redo');
 console.log('Scale artifacts: '+artifacts);
}catch(error){if(page)await page.screenshot({path:path.join(artifacts,'failure.png')}).catch(()=>{});console.error('Scale artifacts: '+artifacts);throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
