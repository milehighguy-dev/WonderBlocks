import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {chromium} from 'playwright';import {writeTGA} from '../src/swbf2/swbf2-binary.js';
const [libraryPath,destination]=process.argv.slice(2);if(!libraryPath||!destination)throw Error('Supply native library and cluster destination.');fs.mkdirSync(destination,{recursive:true});
const indexPath=path.join(destination,'index.json'),index=fs.existsSync(indexPath)?JSON.parse(fs.readFileSync(indexPath)):{clusters:{},plants:{}},only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const {createServer}=createRequire(import.meta.url)('../server.cjs'),server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,channel:fs.existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage();await page.route('**/__leaf_bake',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await page.goto('http://127.0.0.1:'+server.address().port+'/__leaf_bake');
 for(const plant of JSON.parse(fs.readFileSync(libraryPath)).plants.filter(p=>p.collision&&(!only||only.includes(p.id.replace('biome-',''))))){
  if(index.plants[plant.id])continue;
  const result=await page.evaluate(async ({id,known})=>{
   const T=await import('/vendor/three.module.js'),{buildPart,disposePart}=await import('/src/core/geometry.js'),{makePart}=await import('/src/core/model.js'),{instantiateFloraTreePreset}=await import('/src/flora/flora-tree-presets.js'),{exportMaterial,nativeLeafTexture}=await import('/src/swbf2/swbf2-textures.js'),{nativeLeafClusterKey}=await import('/src/swbf2/swbf2-tree-performance.js');
   const root=buildPart(makePart('flora',instantiateFloraTreePreset(id)),{collision:false}),sources=[];root.traverse(m=>{if(m.isMesh&&m.userData.floraBillboard&&m.geometry.userData.billboard.settings.count>1)sources.push(m);});
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(512,512);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);renderer.setScissorTest(true);
   const fresh=[],used=[],seen=new Set(known);
   for(const source of sources){
    const settings=source.geometry.userData.billboard.settings,m=exportMaterial(source.material,{maxTextureSize:256}),native=nativeLeafTexture(m,settings.atlas,256),key=nativeLeafClusterKey(source,native.bytes);used.push(key);if(seen.has(key))continue;seen.add(key);
    const original=source.geometry,centers=original.attributes.billboardCenter,corners=original.attributes.billboardCorner,bounds=new T.Box3();
    for(let i=0;i<centers.count;i++){const p=new T.Vector3().fromBufferAttribute(centers,i);for(const side of [-1,1]){bounds.expandByPoint(p.clone().add(new T.Vector3(corners.getX(i)*side,corners.getY(i),0)));bounds.expandByPoint(p.clone().add(new T.Vector3(0,corners.getY(i),corners.getX(i)*side)));}}
    const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),width=Math.max(size.x,size.z)*1.04,height=size.y*1.04,scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0x706b58,1.8));const sun=new T.DirectionalLight(0xfff6df,2);sun.position.set(-10,20,15);scene.add(sun);
    const camera=new T.OrthographicCamera(-width/2,width/2,height/2,-height/2,.01,Math.max(width,height)*8);
    for(let view=0;view<4;view++){
     const angle=view*Math.PI/2,direction=new T.Vector3(Math.sin(angle),0,Math.cos(angle)),right=new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),g=original.clone(),pos=g.attributes.position;
     for(let i=0;i<pos.count;i++){const p=new T.Vector3().fromBufferAttribute(centers,i).addScaledVector(right,corners.getX(i));p.y+=corners.getY(i);pos.setXYZ(i,p.x,p.y,p.z);g.attributes.normal?.setXYZ(i,direction.x,0,direction.z);}g.computeBoundingBox();g.computeBoundingSphere();
     const mat=source.material.clone();mat.onBeforeCompile=()=>{};mat.customProgramCacheKey=()=> 'leaf-cluster-bake';mat.transparent=false;mat.alphaTest=.4;mat.depthWrite=true;const mesh=new T.Mesh(g,mat);scene.add(mesh);camera.position.copy(center).addScaledVector(direction,Math.max(width,height)*3);camera.lookAt(center);camera.updateMatrixWorld();renderer.setViewport(view%2*256,Math.floor(view/2)*256,256,256);renderer.setScissor(view%2*256,Math.floor(view/2)*256,256,256);renderer.render(scene,camera);scene.remove(mesh);g.dispose();mat.dispose();
    }
    const raw=new Uint8Array(512*512*4),gl=renderer.getContext();gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,raw);const top=new Uint8Array(raw.length);for(let y=0;y<512;y++)top.set(raw.subarray((511-y)*512*4,(512-y)*512*4),y*512*4);let binary='';for(let at=0;at<top.length;at+=32768)binary+=String.fromCharCode(...top.subarray(at,at+32768));fresh.push({key,width,height,center:center.toArray(),sourceParticles:settings.count,rgba:btoa(binary),png:renderer.domElement.toDataURL('image/png')});
   }
   renderer.dispose();disposePart(root);return {fresh,used:[...new Set(used)]};
  },{id:plant.id,known:Object.keys(index.clusters)});
  for(const c of result.fresh){fs.writeFileSync(path.join(destination,c.key+'.tga'),writeTGA(512,512,new Uint8Array(Buffer.from(c.rgba,'base64'))));fs.writeFileSync(path.join(destination,c.key+'.png'),Buffer.from(c.png.split(',')[1],'base64'));delete c.rgba;delete c.png;index.clusters[c.key]=c;}
  index.plants[plant.id]=result.used;fs.writeFileSync(indexPath,JSON.stringify(index,null,2));console.log(plant.id+': '+result.used.length+' crown textures · '+result.fresh.length+' newly baked');
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
