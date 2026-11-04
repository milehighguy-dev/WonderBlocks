import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {Readable,Writable} from 'node:stream';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {createServer}=createRequire(import.meta.url)('../server.cjs');
async function request(server,body,{origin='http://127.0.0.1:4178',method='POST'}={}){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.url='/api/world-folder';req.method=method;req.headers={origin,host:'127.0.0.1:4178'};const chunks=[],res=new Writable({write(chunk,encoding,done){chunks.push(chunk);done();}});let status=200;res.setHeader=()=>{};res.writeHead=value=>status=value;const done=new Promise(resolve=>res.once('finish',resolve));server.emit('request',req,res);await done;return {status,text:Buffer.concat(chunks).toString()};
}
test('world folder API requires the local editor origin and a user-chosen folder capability',async t=>{
 const base=await mkdtemp(path.join(tmpdir(),'wb-folder-api-'));t.after(()=>rm(base,{recursive:true,force:true}));const world=path.join(base,'WON');await mkdir(world);for(const name of ['msh','odf','world1'])await mkdir(path.join(world,name));await writeFile(path.join(world,'world1/WON.wld'),'authored world');let picks=0;const opened=[],server=createServer({folderRegistry:path.join(base,'registry.json'),chooseExportFolder:async()=>{picks++;return world;},openExportFolder:async folder=>opened.push(folder)});
 assert.equal((await request(server,{action:'choose'},{method:'GET'})).status,405);for(const origin of ['https://example.com','null',''])assert.equal((await request(server,{action:'choose'},{origin})).status,403);assert.equal(picks,0);
 assert.equal((await request(server,{action:'open',id:'unknown'})).status,404);const chosen=await request(server,{action:'choose'});assert.equal(chosen.status,200);const {id}=JSON.parse(chosen.text);assert.equal(picks,1);assert.equal((await request(server,{action:'open',id})).status,200);assert.deepEqual(opened,[world]);assert.equal((await request(server,{action:'write',id,path:'../escape',base64:''})).status,400);
});
