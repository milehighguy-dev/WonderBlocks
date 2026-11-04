// Large-scene I/O regression. Generation and package transfer are outside the timer.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {yavinRainwell} from '../../examples/generators/yavin-rainwell-demo.js';
import {createSWBF2Package} from '../../src/swbf2/export-swbf2.js';
let result;
if(process.argv[2]){
 const cached=path.resolve(process.argv[2]),prefix='_wonderblocks/exports/large-folder-performance/',manifest=JSON.parse(await fs.readFile(path.join(cached,prefix,'export-report.json'),'utf8')),files=new Map();
 for(const relative of manifest.files){if(/^world1\/.*\.(req|ldx)$/i.test(relative))continue;const name=relative.startsWith(prefix)?relative.slice(prefix.length):relative,data=await fs.readFile(path.join(cached,relative));files.set(name,/\.(msh|tga)$/i.test(name)?new Uint8Array(data):data.toString('utf8'));}
 manifest.sourceProject=manifest.sourceProject.slice(prefix.length);result={manifest,files,filename:'yavin_temple_of_the_rainwell.swbf2.zip'};
}else{const project=yavinRainwell();project.swbf2Exports={active:'scene:scene',profiles:{'scene:scene':{id:'large-folder-performance',values:{output:'scene'}}}};result=createSWBF2Package(project,{aiNavigation:false},{packZip:false});}
const payload=JSON.stringify({manifest:result.manifest,filename:result.filename,files:[...result.files].map(([name,value])=>[name,typeof value==='string'?{text:value}:{base64:Buffer.from(value).toString('base64')}])});console.log('Rainwell package ready: '+result.files.size+' files.');
const output=await fs.mkdtemp(path.join(tmpdir(),'wb-local-io-')),world=path.join(output,'WON');await fs.mkdir(world);for(const name of ['msh','odf','world1'])await fs.mkdir(path.join(world,name));for(const [name,text] of [['WON.wld','Version(3);\nNextSequence(100);\n'],['WON.ldx','Version(1);\nNextID(1);\nLayer("[Base]",0,0)\n{\nDescription("");\n}\nGameMode("Common")\n{\nLayer(0);\n}\n'],['WON.req','ucft { REQN { "world" "WON" } }']])await fs.writeFile(path.join(world,'world1',name),text);
const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer({folderRegistry:path.join(output,'folders.json'),chooseExportFolder:async()=>world});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();await page.route('**/performance-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'}));await page.route('**/performance-package',route=>route.fulfill({contentType:'application/json',body:payload}));await page.goto('http://127.0.0.1:'+server.address().port+'/performance-test');
 const metrics=await page.evaluate(async()=>{
  const {chooseLocalWorldFolder}=await import('/src/swbf2/local-world-folder.js'),{writeWorldFolder}=await import('/src/swbf2/swbf2-world-folder.js'),data=await(await fetch('/performance-package')).json();data.files=new Map(data.files.map(([name,value])=>[name,value.text??Uint8Array.from(atob(value.base64),char=>char.charCodeAt(0))]));
  const folder=await chooseLocalWorldFolder(),times={},tasks=[];let ticks=0;const timer=setInterval(()=>ticks++,20),observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});
  try{for(const stage of ['first','repeat']){const start=performance.now(),saved=await writeWorldFolder(folder,data,{worldName:'WON'});times[stage]={milliseconds:Math.round(performance.now()-start),...saved};}await new Promise(resolve=>setTimeout(resolve,0));return {...times,ticks,longestTask:Math.round(Math.max(0,...tasks))};}finally{clearInterval(timer);observer.disconnect();}
 });
 assert.ok(metrics.first.updated>900);assert.equal(metrics.repeat.updated,0);assert.ok(metrics.ticks>10);assert.ok(metrics.longestTask<1000,'file I/O must not freeze the browser for a second');await fs.writeFile(path.join(output,'measurements.json'),JSON.stringify(metrics,null,2));console.log('PASS native folder Rainwell I/O: '+JSON.stringify(metrics)+' Artifacts: '+output);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
