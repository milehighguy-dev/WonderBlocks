import * as T from '../../vendor/three.module.js';
import {floraNeedsWeld,floraWeldKey} from './flora.js';
import {cachedFloraSkin,cacheFloraSkin} from './flora-skin.js';
import {applySurface} from '../materials/surfaces.js';

// Keep authored meshes for fast deformation and picking. Only their visible wood
// is replaced; leaves, joints and source buffers remain independently editable.
export function createFloraWeldPreview({invalidate,workerFactory=()=>typeof Worker==='undefined'?null:new Worker(new URL('./flora-weld-worker.js',import.meta.url),{type:'module'})}){
 let worker=null,busy=null,target=null,failedKey=null;
 function clear(group){
  for(const mesh of [...group.children].filter(m=>m.userData.floraWeld)){
   group.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();
  }
  group.traverse(m=>{if(m.userData.floraWeldSource)m.visible=true;});
  group.userData.floraWeldPending=false;
  delete group.userData.floraWeldError;
 }
 function display(geometry){
  const {group,part}=target;
  clear(group);
  group.traverse(m=>{if(m.userData.floraWeldSource)m.visible=false;});
  const material=new T.MeshStandardMaterial({color:part.flora.colors.bark,roughness:.85,side:T.DoubleSide}),mesh=new T.Mesh(geometry,material);
  mesh.userData.floraComponent='bark';mesh.userData.floraWeld=true;mesh.castShadow=mesh.receiveShadow=true;
  group.add(mesh);
  target.ready=true;
  if(part.flora.finishes?.bark)applySurface(group,material,{...part,surface:part.flora.finishes.bark});
  invalidate();
 }
 function launch(){
  if(!target||target.ready||busy)return;
  if(failedKey===target.key){target.group.userData.floraWeldPending=false;return;}
  const cached=cachedFloraSkin(target.key);if(cached){display(cached);return;}
  try{
   if(!worker){
    worker=workerFactory();if(!worker){target.group.userData.floraWeldPending=false;return;}
    const current=worker;
    worker.onmessage=({data})=>{
     if(worker!==current||data.key!==busy)return;
     busy=null;
     if(data.error){failedKey=data.key;if(target?.key===data.key){target.group.userData.floraWeldPending=false;target.group.userData.floraWeldError=data.error;}}
     else{
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.BufferAttribute(data.position,3));g.setAttribute('normal',new T.BufferAttribute(data.normal,3));g.setAttribute('uv',new T.BufferAttribute(data.uv,2));g.setIndex(new T.BufferAttribute(data.index,1));
      g.userData.skinStep=data.step;g.computeBoundingBox();g.computeBoundingSphere();
      // Seed the normal renderer too: Finish, save and export use this exact skin.
      cacheFloraSkin(data.key,g);
      if(target?.key===data.key&&!target.ready)display(g);else g.dispose();
     }
     if(target&&target.key!==data.key)launch();
    };
    worker.onerror=event=>{
     if(worker!==current)return;
     failedKey=busy;busy=null;current.terminate();worker=null;
     if(target){target.group.userData.floraWeldPending=false;target.group.userData.floraWeldError=event.message||'Could not join wood.';}
     if(target&&target.key!==failedKey)launch();
    };
   }
   busy=target.key;target.group.userData.floraWeldPending=true;
   worker.postMessage({key:busy,flora:structuredClone(target.part.flora)});
  }catch(error){failedKey=target?.key;busy=null;if(target){target.group.userData.floraWeldPending=false;target.group.userData.floraWeldError=error.message;}}
 }
 return {
  show(group,part,{moving=false}={}){
   clear(group);target=null;
   if(moving||!floraNeedsWeld(part.flora))return;
   const key=floraWeldKey(part.flora);target={group,part,key};
   const cached=cachedFloraSkin(key);
   if(cached)display(cached);else{group.userData.floraWeldPending=true;launch();}
  },
  close(){target=null;busy=null;failedKey=null;worker?.terminate();worker=null;}
 };
}
