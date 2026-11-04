import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {defaultFlora,addFloraAsset} from '../../src/flora/flora.js';
const {createServer}=createRequire(import.meta.url)('../../server.cjs'),server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();await context.route('**/api/material-library',async route=>{await new Promise(r=>setTimeout(r,200));await route.continue();});const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/health');
 const flora=defaultFlora(),stem=addFloraAsset(flora,flora.branches[0].id,'flora-basic-branch');addFloraAsset(flora,stem.id,'flora-forked-bough',1);
 const result=await page.evaluate(flora=>new Promise((resolve,reject)=>{
  const worker=new Worker('/src/flora/flora-weld-worker.js',{type:'module'}),received=new Map(),timer=setTimeout(()=>{worker.terminate();reject(Error('Early weld jobs were lost while worker dependencies loaded'));},10000);
  worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};
  worker.onmessage=({data})=>{received.set(data.key,data);if(received.size===2)worker.postMessage({key:'bad',flora:{}});if(data.key==='bad')worker.postMessage({key:'recovered',flora});if(received.has('recovered')){clearTimeout(timer);worker.terminate();const first=received.get('first'),second=received.get('second');resolve({keys:[...received.keys()],same:first.position.length===second.position.length&&first.position.every((n,i)=>n===second.position[i]),typed:first.position instanceof Float32Array,error:!!received.get('bad').error,recovered:received.get('recovered').position?.length>0});}};
  worker.postMessage({key:'first',flora});worker.postMessage({key:'second',flora});
 }),flora);
 assert.deepEqual(result.keys,['first','second','bad','recovered']);assert.equal(result.same,true);assert.equal(result.typed,true);assert.equal(result.error,true);assert.equal(result.recovered,true);console.log('PASS early weld jobs queue through delayed library loading and recover after an invalid job.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
