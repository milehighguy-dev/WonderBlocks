import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {Writable} from 'node:stream';

const root=fileURLToPath(new URL('../',import.meta.url));
function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(folder,entry.name)):[path.join(folder,entry.name)]);}

test('local module imports and module-owned assets resolve in the organized layout',()=>{
 for(const folder of ['src','examples/generators','previews','tools','tests','assets'])for(const file of files(path.join(root,folder)).filter(f=>/\.(?:js|mjs|html)$/.test(f))){
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|new URL\(\s*)(['"])(\.{1,2}\/[^'"\n]+)\1/g)){
   const target=path.resolve(path.dirname(file),match[2].split('?')[0]);
   const prefixExists=!path.extname(target)&&fs.existsSync(path.dirname(target))&&fs.readdirSync(path.dirname(target)).some(name=>name.startsWith(path.basename(target)));
   // Only the user-supplied character is optional; walk mode has a built-in fallback.
   const optionalReference=file===path.join(root,'src/walk/character.js')&&['../../assets/character/character.json','../../assets/character/character.png'].includes(match[2]);
   assert.ok(fs.existsSync(target)||prefixExists||optionalReference,`${path.relative(root,file)}: ${match[2]}`);
  }
  if(file.endsWith('.html')){
   for(const match of text.matchAll(/\b(?:src|href)=["']((?:\.{1,2}\/)?[^'":#]+\.(?:js|css|html|json)(?:\?[^'"]*)?)["']/g))assert.ok(fs.existsSync(path.resolve(path.dirname(file),match[1].split('?')[0])),`${path.relative(root,file)}: ${match[1]}`);
   for(const match of text.matchAll(/<script type="importmap">([^<]+)<\/script>/g))for(const value of Object.values(JSON.parse(match[1]).imports))if(value.startsWith('.'))assert.ok(fs.existsSync(path.resolve(path.dirname(file),value)),`${path.relative(root,file)}: ${value}`);
  }
 }
 const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const match of entry.matchAll(/\b(?:src|href)="(\.[^"]+)"/g))assert.ok(fs.existsSync(path.resolve(root,match[1])),match[1]);
});

test('server serves canonical paths and rejects retired aliases',async()=>{
 const {createServer}=createRequire(import.meta.url)('../server.cjs');
 const server=createServer();
 const request=async(url,method='GET')=>{
  const chunks=[],headers={},res=new Writable({write(chunk,encoding,done){chunks.push(chunk);done();}});
  let status=200;res.setHeader=(name,value)=>{headers[name.toLowerCase()]=value;};
  res.writeHead=(value,fields={})=>{status=value;for(const [name,v] of Object.entries(fields))res.setHeader(name,v);};
  const finished=new Promise((resolve,reject)=>{res.on('finish',resolve);res.on('error',reject);});
  server.emit('request',{url,method},res);await finished;
  return {status,headers,text:Buffer.concat(chunks).toString('utf8')};
 };
 for(const url of ['/previews/asterfall-preview.html','/src/app.js','/examples/projects/asterfall.building.json','/src/flora/procedural-flora.js'])assert.equal((await request(url)).status,200);
 for(const url of ['/previews/wroshyr-preview.html','/examples/projects/wroshyr.building.json','/wroshyr-preview.html?view=interior','/app.js','/wroshyr.building.json','/assets/archived-flora/catalogue.js'])assert.equal((await request(url)).status,404);
 for(const name of ['entrance','highway','interior','interior-stairs','kamino-walkway','parking-garage','flora-style'])assert.equal((await request('/previews/'+name+'-preview.html')).status,404,name);
 const home=await request('/');assert.equal(home.status,200);assert.match(home.text,/src\/app\.js/);
 assert.equal((await request('/__proto__')).status,404);
 assert.equal((await request('/health')).text,'open-building-studio-v1');
 assert.equal((await request('/','POST')).status,405);
});
