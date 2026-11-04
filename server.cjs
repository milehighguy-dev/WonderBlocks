const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.env.PORT||4178);
const {readTextureLibrary,DEFAULT_TEXTURE_ROOT}=require('./src/materials/read-texture-library.cjs');
function openFolder(folder){return new Promise((resolve,reject)=>{
 const command=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';
 const child=require('node:child_process').spawn(command,[folder],{windowsHide:true,detached:true,stdio:'ignore'});
 child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
});}
const types={'.svg':'image/svg+xml','.png':'image/png','.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain'};
function createServer({textureRoot,openTexturesFolder=openFolder,chooseExportFolder,openExportFolder=openFolder,folderRegistry=path.join(root,'.world-folders.json')}={}){const folders=require('./src/swbf2/local-world-folders.cjs').createWorldFolders({registryPath:folderRegistry,choose:chooseExportFolder,open:openExportFolder});return http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 if(name==='/api/world-folder'){
  if(req.method!=='POST'){res.writeHead(405);return res.end();}
  const origin=req.headers.origin,host=req.headers.host;
  if(!/^(?:127\.0\.0\.1|localhost):\d+$/.test(host||'')||origin!=='http://'+host){res.writeHead(403);return res.end();}
  const chunks=[];let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>185*1024*1024){req.destroy();return;}chunks.push(chunk);});req.on('end',async()=>{try{const result=await folders.handle(JSON.parse(Buffer.concat(chunks).toString('utf8')));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));}catch(error){res.writeHead(error.status||400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message,code:error.code}));}});return;
 }
 if(name==='/api/open-textures-folder'){
  if(req.method!=='POST'){res.writeHead(405);return res.end();}
  // Only the editor itself may launch Explorer, and only for its fixed library.
  const origin=req.headers.origin,host=req.headers.host;
  if(!/^(?:127\.0\.0\.1|localhost):\d+$/.test(host||'')||origin!=='http://'+host){res.writeHead(403);return res.end();}
  const folder=path.resolve(textureRoot||DEFAULT_TEXTURE_ROOT);
  fs.promises.stat(folder).then(stat=>{if(!stat.isDirectory())throw Error('Missing textures folder');return openTexturesFolder(folder);}).then(()=>{res.writeHead(204);res.end();}).catch(error=>{console.error(error.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Could not open the textures folder. Restart Wonderblocks and try again.'}));});return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
 if(name==='/health'){res.setHeader('Content-Type','text/plain');return res.end('open-building-studio-v1');}
 if(name==='/api/material-library'){
  res.setHeader('Cache-Control','no-cache');
  readTextureLibrary(textureRoot).then(library=>{res.setHeader('Content-Type','application/json');res.end(req.method==='HEAD'?undefined:JSON.stringify(library));}).catch(error=>{console.error(error.message);res.writeHead(500,{'Content-Type':'text/plain'});res.end(error.message);});return;
 }
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-cache');if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);});
});}
module.exports={createServer};
if(require.main===module){
const server=createServer();
server.on('error',err=>{console.error(err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Wonderblocks: http://127.0.0.1:${server.address().port}`));
}
