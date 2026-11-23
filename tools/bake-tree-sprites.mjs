import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {writeTGA} from '../src/swbf2/swbf2-binary.js';
const [libraryPath,destination]=process.argv.slice(2);if(!libraryPath||!destination)throw Error('Supply library manifest and new sprite folder.');
fs.mkdirSync(destination,{recursive:true});const library=JSON.parse(fs.readFileSync(libraryPath)),only=process.argv.find(x=>x.startsWith('--only='))?.slice(7).split(',');
const {createServer}=createRequire(import.meta.url)('../server.cjs'),server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const overhead=process.argv.includes('--overhead');let browser;
try{
 browser=await chromium.launch({headless:true,channel:fs.existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage();await page.route('**/__tree_bake',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await page.goto(origin+'/__tree_bake');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const plant of library.plants.filter(p=>p.collision&&(!only||only.includes(p.id.replace('biome-',''))))){
  const short=plant.id.replace('biome-','');
  if(fs.existsSync(path.join(destination,short+'.json'))&&fs.existsSync(path.join(destination,short+'.tga')))continue;
  const result=await page.evaluate(async ({id,overhead})=>{
   const T=await import('/vendor/three.module.js'),{buildPart,disposePart}=await import('/src/core/geometry.js'),{makePart}=await import('/src/core/model.js'),{instantiateFloraTreePreset}=await import('/src/flora/flora-tree-presets.js');
   const root=buildPart(makePart('flora',instantiateFloraTreePreset(id)),{collision:false}),scene=new T.Scene();root.updateMatrixWorld(true);
   const bounds=new T.Box3().setFromObject(root),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z)*1.06;
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});renderer.setSize(overhead?1024:512,256);renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
   scene.add(new T.HemisphereLight(0xffffff,0x706b58,1.8));const sun=new T.DirectionalLight(0xfff6df,2);sun.position.set(-10,20,15);scene.add(sun);
   const camera=new T.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,span*8),billboards=[];scene.add(root);
   root.traverse(m=>{if(m.isMesh&&m.userData.floraBillboard)billboards.push(m);});
   renderer.setScissorTest(true);
   for(let view=0;view<(overhead?3:2);view++){
    const direction=view===0?new T.Vector3(0,0,1):view===1?new T.Vector3(1,0,0):new T.Vector3(0,1,0),right=view===1?new T.Vector3(0,0,-1):new T.Vector3(1,0,0),up=view===2?new T.Vector3(0,0,-1):new T.Vector3(0,1,0),temporary=[];
    for(const source of billboards){
     const g=source.geometry.clone(),pos=g.attributes.position,centers=g.attributes.billboardCenter,corners=g.attributes.billboardCorner,scale=source.getWorldScale(new T.Vector3());
     for(let i=0;i<pos.count;i++){const p=new T.Vector3().fromBufferAttribute(centers,i).applyMatrix4(source.matrixWorld).addScaledVector(right,corners.getX(i)*Math.abs(scale.x));p.addScaledVector(up,corners.getY(i)*Math.abs(scale.y));pos.setXYZ(i,p.x,p.y,p.z);if(g.attributes.normal)g.attributes.normal.setXYZ(i,direction.x,direction.y,direction.z);}
     const material=source.material.clone();material.onBeforeCompile=()=>{};material.customProgramCacheKey=()=> 'tree-sprite-bake';material.transparent=false;material.alphaTest=.4;material.depthWrite=true;
     const mesh=new T.Mesh(g,material);scene.add(mesh);temporary.push(mesh);source.visible=false;
    }
    camera.up.copy(up);camera.position.copy(center).addScaledVector(direction,span*3);camera.lookAt(center);camera.updateMatrixWorld();renderer.setViewport(view*256,0,256,256);renderer.setScissor(view*256,0,256,256);renderer.render(scene,camera);
    for(const mesh of temporary){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}for(const source of billboards)source.visible=true;
   }
   const imageWidth=overhead?1024:512,gl=renderer.getContext(),raw=new Uint8Array(imageWidth*256*4);gl.readPixels(0,0,imageWidth,256,gl.RGBA,gl.UNSIGNED_BYTE,raw);const top=new Uint8Array(raw.length);for(let y=0;y<256;y++)top.set(raw.subarray((255-y)*imageWidth*4,(256-y)*imageWidth*4),y*imageWidth*4);
   const png=renderer.domElement.toDataURL('image/png'),boundsOut={min:[center.x-span/2,center.y-span/2,center.z-span/2],max:[center.x+span/2,center.y+span/2,center.z+span/2]};
   let binary='';for(let at=0;at<top.length;at+=32768)binary+=String.fromCharCode(...top.subarray(at,at+32768));const rgba=btoa(binary);renderer.dispose();disposePart(root);return {rgba,png,bounds:boundsOut,width:imageWidth,height:256,overhead,canopyHeight:bounds.max.y-size.y*.18};
  },{id:plant.id,overhead});
  if(errors.length)throw Error(errors.join('\n'));
  const rgba=new Uint8Array(Buffer.from(result.rgba,'base64'));fs.writeFileSync(path.join(destination,short+'.tga'),writeTGA(result.width,256,rgba));fs.writeFileSync(path.join(destination,short+'.png'),Buffer.from(result.png.split(',')[1],'base64'));
  delete result.rgba;delete result.png;fs.writeFileSync(path.join(destination,short+'.json'),JSON.stringify(result,null,2));console.log('Baked '+short+' · two 256px views');
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
