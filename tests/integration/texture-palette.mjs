import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';

const {createServer}=createRequire(import.meta.url)('../../server.cjs');
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,artifacts=await mkdtemp(path.join(tmpdir(),'wb-textures-'));
let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/?demo=classical-temple');await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open,null,{timeout:60000});
 await page.locator('#scene-outline .scene-select').first().click();await page.locator('[data-workspace-mode=material]').click();
 const panel=page.locator('.material-workspace');await panel.locator('.texture-category-grid').waitFor({state:'visible'});
 assert.equal(await page.locator('#surface-theme,[data-material-theme]').count(),0);
 await panel.screenshot({path:path.join(artifacts,'texture-categories.png')});
 await panel.getByRole('button',{name:'Rhen Var textures',exact:true}).click();
 const ids=await panel.locator('.texture-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.surface));assert.ok(ids.includes('bf1-rhenvar-masonry')&&ids.includes('swbf-rhen-wall'));assert.ok(!ids.includes('mos-stucco'));
 await panel.getByRole('button',{name:'Apply Rhen Var · cold masonry',exact:true}).click();await panel.locator('[data-surface=bf1-rhenvar-masonry][aria-pressed=true]').waitFor();
 const pending=page.waitForEvent('download');await page.locator('#save').click();const download=await pending,project=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.ok(project.parts.some(p=>p.surface?.preset==='bf1-rhenvar-masonry'||p.interior?.finishes?.wall?.preset==='bf1-rhenvar-masonry'));
 await panel.screenshot({path:path.join(artifacts,'rhen-var-textures.png')});
 await panel.getByRole('button',{name:'← Categories',exact:true}).click();await panel.getByRole('button',{name:'Tatooine textures',exact:true}).click();
 assert.ok(await panel.locator('[data-surface=mos-stucco]').count());assert.equal(await panel.locator('[data-surface=bf1-rhenvar-masonry]').count(),0);
 await panel.getByRole('searchbox',{name:'Find a texture'}).fill('Kashyyyk mossy');assert.equal(await panel.locator('.texture-card').count(),1);assert.equal(await panel.locator('.texture-card').getAttribute('data-surface'),'kotor-kashyyyk-mossy-bark');
 await panel.getByRole('button',{name:'← Categories',exact:true}).click();await panel.getByRole('button',{name:'White / tintable textures',exact:true}).click();assert.equal(await panel.locator('.texture-card').count(),10);
 await panel.getByRole('button',{name:'Apply White · brickwork',exact:true}).click();await panel.locator('[data-material-color]').evaluate(el=>{el.value='#287ed4';el.dispatchEvent(new Event('change',{bubbles:true}));});
 const saved=page.waitForEvent('download');await page.locator('#save').click();const whiteProject=JSON.parse(await readFile(await(await saved).path(),'utf8'));assert.ok(JSON.stringify(whiteProject).includes('white-bf1-naboo-brick'));assert.ok(JSON.stringify(whiteProject).includes('#287ed4'));
 await page.locator('#file').setInputFiles({name:'white-textures.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(whiteProject))});await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open);await page.locator('#scene-outline .scene-select').first().click();await page.locator('[data-workspace-mode=material]').click();
 assert.equal(await panel.locator('[data-material-color]').inputValue(),'#287ed4');await panel.screenshot({path:path.join(artifacts,'white-texture-picker.png')});
 // Review the source, white repeat, and two baked export tints side by side.
 await page.evaluate(async()=>{
  const {WHITE_TILING_TEXTURES}=await import('/src/materials/white-tiling-textures.js'),{surfacePixels,surfaceTexture}=await import('/src/materials/surfaces.js'),{exportMaterial}=await import('/src/swbf2/swbf2-textures.js'),T=await import('/vendor/three.module.js');
  const canvas=document.createElement('canvas');canvas.id='white-texture-review';canvas.width=1040;canvas.height=120+WHITE_TILING_TEXTURES.length*218;const ctx=canvas.getContext('2d');ctx.fillStyle='#252729';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f2f2f0';ctx.font='24px sans-serif';ctx.fillText('White / tintable — imported tile variants',20,35);ctx.font='15px sans-serif';['Original','White, repeated 2 × 2','Blue export tint','Warm export tint'].forEach((s,i)=>ctx.fillText(s,20+i*256,83));
  const tile=bytes=>{const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),128,128),0,0);return c;};
  const bake=(s,color)=>{const m=new T.MeshStandardMaterial({color,map:surfaceTexture(s.id)}),b=exportMaterial(m).bytes,channels=b[16]/8,pixels=new Uint8Array(128*128*4);for(let i=0;i<128*128;i++)pixels.set([b[18+i*channels+2],b[18+i*channels+1],b[18+i*channels],255],i*4);m.dispose();return pixels;};
  WHITE_TILING_TEXTURES.forEach((s,index)=>{const y=100+index*218;[surfacePixels(s.sourceId),surfacePixels(s.id),bake(s,'#287ed4'),bake(s,'#bc6848')].forEach((pixels,col)=>{const c=tile(pixels);for(let ty=0;ty<2;ty++)for(let tx=0;tx<2;tx++)ctx.drawImage(c,20+col*256+tx*96,y+ty*96,96,96);});ctx.fillStyle='#f2f2f0';ctx.font='14px sans-serif';ctx.fillText(s.name+' · '+s.sourceGame,20,y+210);});
  document.body.replaceChildren(canvas);document.body.style.cssText='display:block;margin:0;width:1040px;height:auto;overflow:visible';canvas.style.cssText='display:block;max-width:none';
 });
 await page.locator('#white-texture-review').screenshot({path:path.join(artifacts,'white-texture-review.png')});
 assert.deepEqual(errors,[]);console.log('PASS texture category navigation, cross-category search, painting and project save. Screenshots: '+artifacts);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
