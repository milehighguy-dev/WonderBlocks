import {SURFACES,applySurface} from '../materials/surfaces.js';
export const HIGHWAY_MATERIAL_PARTS={road:'Road surface',underside:'Bottom / sides',barriers:'Barriers / railings',supports:'Support pillars'};
export const highwayMaterialPart=mesh=>mesh.userData.highwayComponent||mesh.material?.userData?.highwayComponent;
export function readHighwayFinish(part,key){const f=part.highway.componentFinishes?.[key];return {color:f?.color||part.color,preset:f?.surface?.preset||part.surface?.preset||'plain',scale:f?.surface?.scale??part.surface?.scale??1};}
export function editHighwayFinish(part,key,patch){for(const target of key==='all'?Object.keys(HIGHWAY_MATERIAL_PARTS):[key]){const next={...readHighwayFinish(part,target),...patch};part.highway.componentFinishes??={};part.highway.componentFinishes[target]={color:next.color,surface:{preset:next.preset,scale:next.scale}};}return true;}
export function validateHighwayFinishes(part){const values=part.highway?.componentFinishes;if(values===undefined)return;if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Invalid highway finishes.');for(const [key,f] of Object.entries(values))if(!Object.hasOwn(HIGHWAY_MATERIAL_PARTS,key)||!f||!/^#[0-9a-f]{6}$/i.test(f.color)||!SURFACES.some(s=>s.id===f.surface?.preset)||!Number.isFinite(f.surface?.scale)||f.surface.scale<.1||f.surface.scale>8)throw Error('Invalid highway finish.');}
export function applyHighwayFinishes(group,part){
 const materials=new Map(),originals=new Set(group.children.filter(m=>m.isMesh).map(m=>m.material));
 for(const mesh of [...group.children]){
  if(!mesh.isMesh)continue;
  const source=mesh.geometry;
  if(mesh.userData.highwayDeck){
   const geometry=source.index?source.toNonIndexed():source,normal=geometry.attributes.normal,buckets={road:[],underside:[]};
   for(let i=0;i<normal.count;i+=3)buckets[normal.getY(i)>1e-6?'road':'underside'].push(i,i+1,i+2);
   for(const [key,indices] of Object.entries(buckets)){if(!indices.length)continue;const g=geometry.clone();for(const [name,attr] of Object.entries(geometry.attributes)){const values=new attr.array.constructor(indices.length*attr.itemSize);indices.forEach((index,i)=>{for(let k=0;k<attr.itemSize;k++)values[i*attr.itemSize+k]=attr.array[index*attr.itemSize+k];});g.setAttribute(name,new attr.constructor(values,attr.itemSize,attr.normalized));}
    if(key==='road'){const uv=g.attributes.highwayUV,roadUV=new Float32Array(uv.count*2);for(let i=0;i<uv.count;i++){roadUV[i*2]=uv.getX(i)/mesh.userData.highwayWidth+.5;roadUV[i*2+1]=uv.getY(i);}g.setAttribute('highwayRoadUV',new geometry.attributes.uv.constructor(roadUV,2));}
    const copy=mesh.clone(false);copy.geometry=g;copy.userData={...mesh.userData,highwayComponent:key};group.add(copy);
   }
   group.remove(mesh);source.dispose();if(geometry!==source)geometry.dispose();
  }else mesh.userData.highwayComponent=mesh.userData.highwaySupport?'supports':'barriers';
 }
 for(const mesh of group.children){if(!mesh.isMesh)continue;const key=mesh.userData.highwayComponent;if(!materials.has(key)){const material=mesh.material.clone(),finish=readHighwayFinish(part,key);material.userData.highwayComponent=key;material.color.set(finish.color);materials.set(key,{material,finish});}mesh.material=materials.get(key).material;}
 group.children.sort((a,b)=>Object.keys(HIGHWAY_MATERIAL_PARTS).indexOf(a.userData.highwayComponent)-Object.keys(HIGHWAY_MATERIAL_PARTS).indexOf(b.userData.highwayComponent));
 for(const material of originals)material.dispose();
 for(const {material,finish} of materials.values())applySurface(group,material,{...part,surface:{preset:finish.preset,scale:finish.scale}});
}
