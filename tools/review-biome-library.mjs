import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const {createServer}=createRequire(import.meta.url)('../server.cjs');
const output=path.resolve(process.argv[2]||'biome-review');fs.mkdirSync(output,{recursive:true});
const ids=process.argv.slice(3);if(!ids.length)ids.push('oak','pine','cotton-sedge','banana','vined-mangrove','pandanus','willow','prickly-pear','sea-oats','waterlily');
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,channel:fs.existsSync(chromium.executablePath())?'chromium':'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/health');
 await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{makePart}=await import('/src/core/model.js'),{buildPart,disposePart}=await import('/src/core/geometry.js'),{instantiateFloraTreePreset}=await import('/src/flora/flora-tree-presets.js');
  document.body.innerHTML='<div id="labels"></div>';document.body.style='margin:0;background:#d7dedb;font:18px sans-serif';
  const labels=document.querySelector('#labels');labels.style='position:absolute;left:24px;top:20px;right:24px;display:flex;justify-content:space-between;z-index:2';
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,900);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setScissorTest(true);document.body.append(renderer.domElement);
  window.reviewPlant=(id)=>{
   labels.innerHTML='<span>'+id+' · full detail</span><span>same construction · distant detail</span>';
   const roots=[false,true].map(lowDetail=>buildPart(makePart('flora',instantiateFloraTreePreset('biome-'+id)),{collision:false,lowDetail}));
   const box=new T.Box3().setFromObject(roots[0]),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),extent=Math.max(size.y,size.x,size.z,.5);
   for(const [i,root] of roots.entries()){
    const scene=new T.Scene();scene.background=new T.Color('#d7dedb');scene.add(root);
    scene.add(new T.HemisphereLight('#f2f7ff','#757e60',2.2));const sun=new T.DirectionalLight('#fff0d8',2.8);sun.position.set(-4,7,5);scene.add(sun);
    const floor=new T.Mesh(new T.PlaneGeometry(extent*5,extent*5),new T.MeshLambertMaterial({color:'#777e69',side:T.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.position.set(center.x,box.min.y-.015,center.z);scene.add(floor);
    const camera=new T.PerspectiveCamera(34,720/900,.01,extent*20);camera.position.copy(center).add(new T.Vector3(extent*1.35,extent*.56,extent*2.35));camera.lookAt(center);
    renderer.setViewport(i*720,0,720,900);renderer.setScissor(i*720,0,720,900);renderer.render(scene,camera);
    disposePart(root);floor.geometry.dispose();floor.material.dispose();
   }
  };
 });
 for(const id of ids){await page.evaluate(id=>window.reviewPlant(id),id);await page.screenshot({path:path.join(output,id+'.png')});console.log(id);}
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
