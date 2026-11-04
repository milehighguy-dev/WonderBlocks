import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {Writable} from 'node:stream';
import {fileURLToPath} from 'node:url';
const {createServer}=createRequire(import.meta.url)('../server.cjs');
async function request(server,{method='POST',origin='http://127.0.0.1:4178',host='127.0.0.1:4178'}={}){
 const chunks=[],res=new Writable({write(chunk,encoding,done){chunks.push(chunk);done();}});let status=200;
 res.setHeader=()=>{};res.writeHead=value=>{status=value;};
 const finished=new Promise((resolve,reject)=>{res.on('finish',resolve);res.on('error',reject);});
 server.emit('request',{url:'/api/open-textures-folder',method,headers:{origin,host}},res);await finished;
 return {status,text:Buffer.concat(chunks).toString('utf8')};
}
test('the editor opens only its texture library; browsing and requests from other websites cannot launch Explorer',async()=>{
 const opened=[],server=createServer({openTexturesFolder:async folder=>opened.push(folder)});
 assert.equal((await request(server,{method:'GET'})).status,405);
 for(const origin of ['https://example.com','null',undefined])assert.equal((await request(server,{origin:origin??''})).status,403);
 assert.equal((await request(server,{host:'example.com:4178',origin:'http://example.com:4178'})).status,403);
 assert.deepEqual(opened,[]);
 assert.equal((await request(server)).status,204);
 assert.deepEqual(opened,[fileURLToPath(new URL('../textures',import.meta.url))]);
});
