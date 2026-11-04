import test from 'node:test';
import assert from 'node:assert/strict';
import {runSWBF2Worker} from '../src/swbf2/swbf2-worker-client.js';
const fake=()=>({terminated:0,messages:[],postMessage(data){this.messages.push(data);},terminate(){this.terminated++;}});
test('worker progress leaves the operation pending, completion transfers the result and releases the worker',async()=>{
 const worker=fake(),progress=[],promise=runSWBF2Worker('export',{project:{name:'test'}},{workerFactory:()=>worker,onProgress:value=>progress.push(value)});let completed=false;promise.then(()=>completed=true);
 assert.equal(worker.messages[0].kind,'export');worker.onmessage({data:{progress:{phase:'Preparing scene objects'}}});await Promise.resolve();assert.equal(completed,false);assert.equal(progress.length,1);
 const result={zip:new Uint8Array([1,2,3])};worker.onmessage({data:{result}});assert.equal(await promise,result);assert.equal(worker.terminated,1);
});
test('cancel stops an in-flight worker immediately and ignores queued messages',async()=>{
 const worker=fake(),controller=new AbortController(),progress=[];
 const promise=runSWBF2Worker('export',{}, {workerFactory:()=>worker,signal:controller.signal,onProgress:p=>progress.push(p)});controller.abort();await assert.rejects(promise,{name:'AbortError'});assert.equal(worker.terminated,1);
 worker.onmessage({data:{progress:{phase:'stale'}}});worker.onmessage({data:{result:'stale'}});assert.deepEqual(progress,[]);assert.equal(worker.terminated,1);
 let started=false;await assert.rejects(runSWBF2Worker('export',{}, {signal:controller.signal,workerFactory:()=>{started=true;return fake();}}),{name:'AbortError'});assert.equal(started,false);
});
test('worker startup, job and progress errors reject cleanly instead of hanging the exporter',async()=>{
 await assert.rejects(runSWBF2Worker('export',{}, {workerFactory:()=>{throw Error('startup');}}),/startup/);
 for(const fail of [w=>w.onmessage({data:{error:'failed job'}}),w=>w.onerror({message:'failed module'}),w=>w.onmessageerror()]){const worker=fake(),promise=runSWBF2Worker('export',{}, {workerFactory:()=>worker});fail(worker);await assert.rejects(promise);assert.equal(worker.terminated,1);}
 const worker=fake(),promise=runSWBF2Worker('export',{}, {workerFactory:()=>worker,onProgress:()=>{throw Error('callback');}});worker.onmessage({data:{progress:{}}});await assert.rejects(promise,/callback/);assert.equal(worker.terminated,1);
});
