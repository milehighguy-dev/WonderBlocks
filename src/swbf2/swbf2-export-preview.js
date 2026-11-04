import * as T from '../../vendor/three.module.js';
import {OrbitControls} from '../../vendor/OrbitControls.js';
import {buildPart,disposePart} from '../core/geometry.js';
import {resolveRouteLinks} from '../routes/route-links.js';
import {prepareInteriorCuts} from '../interiors/interior-hull-cuts.js';
import {staticFoliageMesh} from './swbf2-static-foliage.js';
import {collisionDefinition} from '../collision/collision-service.js';

export function createExportPreview(container,{roots=()=>new Map()}={}){
 const scene=new T.Scene();scene.background=new T.Color('#182c35');
 scene.add(new T.HemisphereLight(0xffffff,0x647178,2.6));const light=new T.DirectionalLight(0xffffff,3);light.position.set(3,7,5);scene.add(light);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.domElement.setAttribute('aria-label','Export selection preview');container.append(renderer.domElement);
 const camera=new T.PerspectiveCamera(40,1,.01,10000),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=false;orbit.minDistance=.05;orbit.maxDistance=10000;
 const chosen=new T.Group(),context=new T.Group();scene.add(chosen,context);
 let ownedRoots=[],ownedGeometry=[],ownedMaterials=new Set(),selectedBounds=new T.Box3(),sceneBounds=new T.Box3(),suppressDraw=false,width=0,height=0;
 function draw(){if(suppressDraw||!container.clientWidth||!container.clientHeight)return;if(width!==container.clientWidth||height!==container.clientHeight){width=container.clientWidth;height=container.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}renderer.render(scene,camera);}
 const observer=new ResizeObserver(draw);observer.observe(container);orbit.addEventListener('change',draw);
 // Most preview meshes borrow the live scene's geometry and textures. Never
 // dispose those resources or copy the large collision payload in userData.
 function clear(){chosen.clear();context.clear();ownedRoots.forEach(disposePart);ownedGeometry.forEach(g=>g.dispose());for(const m of ownedMaterials)m.dispose();ownedRoots=[];ownedGeometry=[];ownedMaterials=new Set();}
 function frame(all=false){
  const box=all?sceneBounds:selectedBounds;if(box.isEmpty())return;
  const center=box.getCenter(new T.Vector3()),axis=new T.Vector3(1,.65,1.2).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),axis).normalize(),up=new T.Vector3().crossVectors(axis,right).normalize(),tanV=Math.tan(T.MathUtils.degToRad(camera.fov)/2),tanH=tanV*(container.clientWidth||1)/(container.clientHeight||1);let distance=.1;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).sub(center),depth=p.dot(axis);distance=Math.max(distance,depth+Math.abs(p.dot(right))/tanH,depth+Math.abs(p.dot(up))/tanV);}
  orbit.target.copy(center);camera.position.copy(center).addScaledVector(axis,distance*1.12);camera.lookAt(center);suppressDraw=true;orbit.update();suppressDraw=false;draw();
 }
 function set(project,{output='scene'}={}){
  clear();const parts=resolveRouteLinks(project.parts),ids=new Set(parts.map(p=>p.id)),available=roots(),materials=new Map();let cuts=null,reused=0,built=0;
  const material=(original,selected,billboard)=>{
   const cacheKey=original.uuid+'|'+selected+'|'+billboard;if(materials.has(cacheKey))return materials.get(cacheKey);
   const value=new T.MeshBasicMaterial({color:selected?(original.color??new T.Color('white')).clone().lerp(new T.Color('#ffdc66'),.45):new T.Color('#7e9aa4'),map:original.map,alphaMap:original.alphaMap,alphaTest:original.alphaTest,side:original.side,vertexColors:original.vertexColors,transparent:!selected||original.transparent,opacity:selected?original.opacity:.12,depthWrite:selected&&original.depthWrite,toneMapped:false});
   if(billboard){value.onBeforeCompile=original.onBeforeCompile;value.customProgramCacheKey=()=> 'export-preview-billboard-v1';}ownedMaterials.add(value);materials.set(cacheKey,value);return value;
  };
  const copy=(root,target,selected)=>{
   root.updateWorldMatrix(true,true);root.traverse(source=>{
    if(!source.isMesh||source.userData.materialGhost||source.userData.referenceOnly)return;
    for(let p=source;p&&p!==root;p=p.parent)if(!p.visible)return;
    const baked=source.userData.floraBillboard&&(!selected||output!=='scene')?staticFoliageMesh(source,{renderMaterial:true}):null,geometry=baked?.geometry??source.geometry,original=baked?.material??source.material;
    const mesh=new T.Mesh(geometry,Array.isArray(original)?original.map(m=>material(m,selected,false)):material(original,selected,!!source.userData.floraBillboard&&!baked));mesh.matrixAutoUpdate=false;mesh.matrix.copy(baked?.matrixWorld??source.matrixWorld);
    if(source.userData.floraBillboard&&!baked)mesh.onBeforeRender=(...args)=>source.onBeforeRender(...args);
    target.add(mesh);if(baked){ownedGeometry.push(geometry);baked.material.dispose();}
   });
  };
  try{
   for(const part of parts){
    let root=available.get(part.id);if(!root||root.userData.collision?.definition!==collisionDefinition(part)){cuts??=prepareInteriorCuts(parts);root=buildPart(part,{parts,openingCuts:cuts,batch:true,collision:false});ownedRoots.push(root);built++;}else reused++;
    copy(root,chosen,true);
   }
   chosen.updateMatrixWorld(true);selectedBounds=new T.Box3().setFromObject(chosen,true);sceneBounds=selectedBounds.clone();
   for(const [id,root] of available){
    if(ids.has(id)||root.userData.referenceOnly)continue;
    copy(root,context,false);
   }
   sceneBounds.union(new T.Box3().setFromObject(context));
   container.dataset.partIds=JSON.stringify([...ids]);container.dataset.objectCount=String(parts.length);container.dataset.reusedObjects=String(reused);container.dataset.builtObjects=String(built);frame();
   return {dimensions:selectedBounds.getSize(new T.Vector3()).toArray()};
  }catch(error){clear();throw error;}
 }
 return {set,frame,showContext(value){if(context.visible!==value){context.visible=value;draw();}},clear,draw,dispose(){clear();observer.disconnect();orbit.dispose();renderer.dispose();renderer.domElement.remove();}};
}
