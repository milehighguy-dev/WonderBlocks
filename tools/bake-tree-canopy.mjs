// Offline prototype: bake whole crown regions, not one entity per leaf spray.
// Usage: node tools/bake-tree-canopy.mjs PRESET_OR_PROJECT NEW_FOLDER [--zones=4]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {writeTGA} from '../src/swbf2/swbf2-binary.js';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';

const [source,destination]=process.argv.slice(2),zoneCount=Number(process.argv.find(a=>a.startsWith('--zones='))?.slice(8)??4);
if(!source||!destination)throw Error('Supply a tree preset/project and a new output folder.');
if(fs.existsSync(destination))throw Error('Output folder already exists.');
const project=fs.existsSync(source)?JSON.parse(fs.readFileSync(source,'utf8')):{format:'open-building-studio',version:1,name:source,parts:[makePart('flora',instantiateFloraTreePreset(source))]};
if(project.parts?.length!==1||project.parts[0].type!=='flora')throw Error('Bake one standalone plant at a time.');
const {createServer}=createRequire(import.meta.url)('../server.cjs'),server=createServer();
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,channel:fs.existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage();await page.route('**/__canopy_bake',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/__canopy_bake');
 const result=await page.evaluate(async ({project,zoneCount})=>{
  const T=await import('/vendor/three.module.js'),{buildPart,disposePart}=await import('/src/core/geometry.js'),{planSWBF2}=await import('/src/swbf2/export-swbf2.js'),{treeCanopySignature,canopyZoneGroups}=await import('/src/swbf2/swbf2-tree-performance.js');
  const plan=planSWBF2(project,{output:'object',includeCollision:false,shadows:false,aiNavigation:false,compactTrees:false,lowDetail:false,maxTextureSize:256}),leaves=plan.assets.flatMap(a=>a.leaves);
  if(!leaves.length)throw Error('This plant has no native billboard crown to bake. Modeled palm fronds stay modeled.');
  const root=buildPart(project.parts[0],{collision:false}),sources=[];root.updateMatrixWorld(true);
  root.traverse(m=>{if(m.isMesh&&m.userData.floraBillboard)sources.push(m);});
  if(sources.length!==leaves.length)throw Error('Canopy source ordering does not match export.');
  const inverse=plan.assets[0].inverse,groups=canopyZoneGroups(leaves,zoneCount),renderer=new T.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(512,512);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);renderer.setScissorTest(true);
  const zones=[];
  try{for(const indices of groups){
   const data=indices.map(i=>{const source=sources[i],matrix=inverse.clone().multiply(source.matrixWorld),scale=source.getWorldScale(new T.Vector3()),g=source.geometry;return {source,matrix,scale,cards:g.userData.billboard.cards};});
   const bounds=new T.Box3();
   for(const d of data)for(const card of d.cards){const c=new T.Vector3(...card.center).applyMatrix4(d.matrix),w=card.width*Math.abs(d.scale.x)/2,h=card.height*Math.abs(d.scale.y)/2;bounds.expandByPoint(c.clone().add(new T.Vector3(-w,-h,-w)));bounds.expandByPoint(c.clone().add(new T.Vector3(w,h,w)));}
   const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),width=Math.max(size.x,size.z)*1.04,height=size.y*1.04,scene=new T.Scene(),camera=new T.OrthographicCamera(-width/2,width/2,height/2,-height/2,.01,Math.max(width,height)*8);
   for(let view=0;view<4;view++){
    const angle=view*Math.PI/2,direction=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),right=new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),draw=[];
    for(const d of data){
     const g=d.source.geometry.clone(),pos=g.attributes.position;
     for(const [i,card] of d.cards.entries())for(const [j,[x,y]] of [[-1,-1],[1,-1],[1,1],[-1,1]].entries()){
      const p=new T.Vector3(...card.center).applyMatrix4(d.matrix).addScaledVector(right,x*card.width*Math.abs(d.scale.x)/2);p.y+=y*card.height*Math.abs(d.scale.y)/2;pos.setXYZ(i*4+j,p.x,p.y,p.z);
     }
     g.computeBoundingSphere();const original=d.source.material,material=new T.MeshBasicMaterial({map:original.map,alphaMap:original.alphaMap,color:original.color,vertexColors:true,alphaTest:.4,side:T.DoubleSide,depthWrite:true,toneMapped:false}),mesh=new T.Mesh(g,material);scene.add(mesh);draw.push(mesh);
    }
    camera.position.copy(center).addScaledVector(direction,Math.max(width,height)*3);camera.lookAt(center);camera.updateMatrixWorld();renderer.setViewport(view%2*256,Math.floor(view/2)*256,256,256);renderer.setScissor(view%2*256,Math.floor(view/2)*256,256,256);renderer.render(scene,camera);
    for(const mesh of draw){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
   }
   const raw=new Uint8Array(512*512*4),gl=renderer.getContext();gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,raw);const top=new Uint8Array(raw.length);
   for(let y=0;y<512;y++)top.set(raw.subarray((511-y)*512*4,(512-y)*512*4),y*512*4);
   let binary='';for(let i=0;i<top.length;i+=32768)binary+=String.fromCharCode(...top.subarray(i,i+32768));
   zones.push({sources:indices,center:center.toArray(),width,height,rgba:btoa(binary),png:renderer.domElement.toDataURL('image/png')});
  }}finally{renderer.dispose();disposePart(root);}
  return {sourceSignature:treeCanopySignature(leaves),sourcePatches:leaves.length,sourceParticles:leaves.reduce((n,l)=>n+l.fields.count,0),textureSize:256,zones};
 },{project,zoneCount});
 fs.mkdirSync(destination,{recursive:true});
 for(const [i,zone] of result.zones.entries()){
  zone.texture='canopy-zone-'+i+'.tga';fs.writeFileSync(path.join(destination,zone.texture),writeTGA(512,512,new Uint8Array(Buffer.from(zone.rgba,'base64'))));
  fs.writeFileSync(path.join(destination,'canopy-zone-'+i+'.png'),Buffer.from(zone.png.split(',')[1],'base64'));delete zone.rgba;delete zone.png;
 }
 fs.writeFileSync(path.join(destination,'canopy.json'),JSON.stringify({...result,runtimeVerified:false},null,2));
 fs.writeFileSync(path.join(destination,'source.building.json'),JSON.stringify(project,null,2));
 console.log(`${result.sourcePatches} leaf objects / ${result.sourceParticles} source cards -> ${result.zones.length} camera-facing canopy zones. Native performance and appearance still require a game test.`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
