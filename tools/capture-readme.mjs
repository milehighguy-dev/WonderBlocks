import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';
import {makePart,validateProject} from '../src/core/model.js';

const {createServer}=createRequire(import.meta.url)('../server.cjs');
const output=fileURLToPath(new URL('../docs/screenshots/',import.meta.url));
await mkdir(output,{recursive:true});
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,errors=[];
const basic={format:'open-building-studio',version:1,name:'Basic objects',parts:[]};
const add=(type,name,position,scale,color,extra={})=>basic.parts.push(makePart(type,{name,position,scale,color,...extra}));
add('slab','Foundation',[0,0,0],[22,1,15],'#b5b5a9');
add('block','Raised platform',[-5,.3,-1],[6,1.5,8],'#c1ac8c');
add('block','Block',[-5,1.8,-2.5],[5,3.5,4],'#e0cfb0');
add('roof','Hip roof',[-5,5.3,-2.5],[5.8,2,4.7],'#a76d59');
add('round','Round tower',[5,.3,-2],[4,5.5,4],'#c9c1a4');
add('dome','Dome',[5,5.8,-2],[4.4,4.4,4.4],'#5d8989');
add('archbody','Archway',[0,.3,1.2],[2.5,2.5,2.5],'#c4b58e');
add('pillar','Column',[-7,1.8,1.6],[.7,2.4,.7],'#dfcfaa');
add('pillar','Column',[-3,1.8,1.6],[.7,2.4,.7],'#dfcfaa');
add('stair-route','Stairs',[-5,.3,6],[1,1,1],'#c1ac8c',{rotation:[0,Math.PI,0],route:{width:3.75,thickness:.18,gap:.15,segments:[{kind:'stairs',run:3,rise:1.5,steps:8,turn:'straight'}]}});
validateProject(basic);
const shots=[
 {name:'basic-objects',project:basic,eye:[21,17,26],target:[0,2,0],select:'Block'},
 {name:'yavin-rainwell',demo:'yavin-rainwell',eye:[110,90,125],target:[0,14,-8]},
 {name:'levantine',demo:'levantine',eye:[.45,1.9,-15.3],target:[-.2,2.3,5.5]}
];
let browser;
try{
 browser=await chromium.launch({headless:true,channel:existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1760,height:1050},deviceScaleFactor:1});
 const requested=new Set(process.argv.slice(2));
 for(const shot of shots.filter(shot=>!requested.size||requested.has(shot.name))){
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(shot.name+': '+e.message));
  await page.goto(origin+'/index.html'+(shot.demo?'?demo='+shot.demo:''));
  await page.waitForFunction(()=>!document.querySelector('#scene-loading')?.open,null,{timeout:120000});
  if(shot.project){await page.locator('#file').setInputFiles({name:'basic-objects.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(shot.project))});await page.waitForFunction(()=>document.querySelector('#title')?.value==='Basic objects'&&!document.querySelector('#scene-loading')?.open);}
  await page.evaluate(async()=>{
   await document.fonts.ready;
   const T=await import('/vendor/three.module.js'),before=T.Mesh.prototype.onBeforeRender;
   T.Mesh.prototype.onBeforeRender=function(renderer,scene,camera,...rest){
    if(renderer.domElement.parentElement?.id==='viewport')window.readmeView={renderer,scene,camera};
    return before.call(this,renderer,scene,camera,...rest);
   };
  });
  await page.mouse.move(8,8);await page.waitForFunction(()=>window.readmeView);
  if(shot.select)await page.locator('#scene-outline').getByRole('button',{name:shot.select,exact:true}).click();
  await page.evaluate(pose=>{const {renderer,scene,camera}=window.readmeView,render=renderer.render;renderer.render=function(s,c){c.position.fromArray(pose.eye);c.lookAt(...pose.target);c.updateMatrixWorld(true);return render.call(this,s,c);};renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);},{eye:shot.eye,target:shot.target});
  await page.mouse.move(8,8);await page.waitForTimeout(1300);
  await page.waitForFunction(()=>!document.querySelector('#toast')?.classList.contains('show'));
  await page.screenshot({path:path.join(output,shot.name+'.png'),animations:'disabled'});
  console.log('Captured '+shot.name);await page.close();
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Screenshots saved to '+output);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
