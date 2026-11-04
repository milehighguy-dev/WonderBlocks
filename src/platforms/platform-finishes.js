import * as T from '../../vendor/three.module.js';
import {SURFACES,applySurface} from '../materials/surfaces.js';

export const PLATFORM_MATERIAL_PARTS={top:'Top / deck',base:'Base / underside',pillars:'Support pillars',railings:'Railings / rim'};
export const platformMaterialPart=mesh=>mesh.userData.platformComponent||mesh.material?.userData?.platformComponent;
export function readPlatformFinish(part,key){
 const f=part.platform.componentFinishes?.[key],nativeCircle=part.platform.sections.length===1&&part.platform.sections[0].kind==='circle';
 const color=key==='railings'&&!['bespin','kotor-kashyyyk'].includes(part.platform.railing)?'#85734f':key==='base'&&!nativeCircle&&part.platform.style?.startsWith('kashyyyk-')&&part.color==='#ffffff'?'#a78652':part.color;
 const surface=key==='railings'&&!['bespin','kotor-kashyyyk'].includes(part.platform.railing)?{preset:'plain',scale:1}:key==='base'&&!nativeCircle&&part.platform.style?.startsWith('kashyyyk-')&&(!part.surface||part.surface.preset==='plain')?{preset:'forest-timber',scale:1}:part.surface;
 return {color:f?.color??color,preset:f?.surface?.preset??surface?.preset??'plain',scale:f?.surface?.scale??surface?.scale??1};
}
export function editPlatformFinish(part,key,patch){
 for(const target of key==='all'?Object.keys(PLATFORM_MATERIAL_PARTS):[key]){
  const current=readPlatformFinish(part,target),next={...part.platform.componentFinishes?.[target]};
  if(patch.color!==undefined)next.color=patch.color;
  // A tint alone preserves imported textures and their authored UVs.
  if(patch.preset!==undefined||patch.scale!==undefined)next.surface={preset:patch.preset??current.preset,scale:patch.scale??current.scale};
  part.platform.componentFinishes??={};part.platform.componentFinishes[target]=next;
 }return true;
}
export function validatePlatformFinishes(platform){
 const values=platform.componentFinishes;if(values===undefined)return;
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Invalid platform finishes.');
 for(const [key,f] of Object.entries(values))if(!Object.hasOwn(PLATFORM_MATERIAL_PARTS,key)||!f||typeof f!=='object'||Array.isArray(f)||f.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(f.color)||f.surface!==undefined&&(!SURFACES.some(s=>s.id===f.surface?.preset)||!Number.isFinite(f.surface?.scale)||f.surface.scale<.1||f.surface.scale>8))throw Error('Invalid platform finish.');
}

export function applyPlatformFinishes(group,part){
 const meshes=[];group.traverse(m=>{if(m.isMesh)meshes.push(m);});
 const originals=new Set(meshes.map(m=>m.material)),materials=new Map();
 for(const mesh of meshes){
  const tag=mesh.geometry.userData.platformPart,known=({deck:'top',trim:'top',fringe:'top',body:'base',supports:'pillars'})[tag]||(mesh.userData.railing||mesh.material.userData.railing?'railings':null);
  if(known){mesh.userData.platformComponent=known;continue;}
  // Standard and Bespin profiles initially share one skin. Separate just the
  // floor at y=0; sloped shoulders and recessed underside faces belong to base.
  const source=mesh.geometry,geometry=source.index?source.toNonIndexed():source,positions=geometry.attributes.position,buckets={top:[],base:[]};mesh.updateMatrix();
  for(let i=0;i<positions.count;i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(positions,i+j).applyMatrix4(mesh.matrix)),normal=T.Triangle.getNormal(...points,new T.Vector3()),key=normal.y>.9&&points.every(p=>Math.abs(p.y)<1e-5)?'top':'base';buckets[key].push(i,i+1,i+2);}
  for(const [key,indices] of Object.entries(buckets)){
   if(!indices.length)continue;
   const g=new T.BufferGeometry();g.userData={...source.userData};
   for(const [name,a] of Object.entries(geometry.attributes)){const values=new a.array.constructor(indices.length*a.itemSize);indices.forEach((index,i)=>{for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=a.array[index*a.itemSize+k];});g.setAttribute(name,new T.BufferAttribute(values,a.itemSize,a.normalized));}
   g.computeBoundingBox();g.computeBoundingSphere();const copy=mesh.clone(false);copy.geometry=g;copy.userData={...mesh.userData,platformComponent:key};mesh.parent.add(copy);
  }
  mesh.parent.remove(mesh);source.dispose();if(geometry!==source)geometry.dispose();
 }
 group.traverse(mesh=>{
  if(!mesh.isMesh)return;const key=mesh.userData.platformComponent,cacheKey=mesh.material.uuid+':'+key;
  if(!materials.has(cacheKey)){const material=mesh.material.clone(),finish=part.platform.componentFinishes?.[key];material.userData.platformComponent=key;if(finish?.color)material.color.set(finish.color);materials.set(cacheKey,{material,finish});}
  mesh.material=materials.get(cacheKey).material;
 });
 for(const original of originals)original.dispose();
 for(const {material,finish} of materials.values())if(finish?.surface)applySurface(group,material,{...part,surface:finish.surface});
}
