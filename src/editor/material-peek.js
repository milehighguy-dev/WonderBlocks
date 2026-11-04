import {interiorEditHulls} from '../interiors/interior-ghost.js';
import {materialPlan} from './material-editing.js';
import {entranceFrame} from '../interiors/entrances.js';
import * as T from '../../vendor/three.module.js';
// Visibility and ghost materials are temporary view state, never project data.
export function peekMaterialInterior(part,scope,parts,meshes){
 const plan=materialPlan(part,scope),root=meshes.get(part?.id),saved=[];if(!plan||!root||!scope.peek)return ()=>{};
 const connected=scope.spaceId&&scope.spaceId!=='interior'?part.entranceInteriors?.find(s=>s.id===scope.spaceId):null;
 let virtual=part;if(connected){const matrix=entranceFrame(part,connected),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();matrix.decompose(position,rotation,scale);virtual={...part,type:'interior',interior:plan,entranceInteriors:undefined,position:position.toArray(),rotation:new T.Euler().setFromQuaternion(rotation).toArray().slice(0,3),scale:scale.toArray()};}
 const ghost=m=>{if(!m.isMesh)return;const old=m.material,wasGhost=m.userData.materialGhost;m.userData.materialGhost=true;const materials=(Array.isArray(old)?old:[old]).map(mat=>{const copy=mat.clone();copy.transparent=true;copy.opacity=.055;copy.depthWrite=false;return copy;});m.material=Array.isArray(old)?materials:materials[0];saved.push(()=>{m.material=old;m.userData.materialGhost=wasGhost;for(const mat of materials)mat.dispose();});};
 const show=m=>{const visible=m.visible;m.visible=true;saved.push(()=>m.visible=visible);};
 const hide=m=>{const visible=m.visible;m.visible=false;saved.push(()=>m.visible=visible);};
 root.traverse(m=>{if(!m.isMesh)return;const d=m.userData,isHull=connected?!d.connectedInteriorId:d.interiorStorey==='shell';if(scope.levelId==='roof'){if(d.interiorStorey==='roof'||!connected&&d.interiorCeiling&&(isHull||!plan.storeys?.length))show(m);else hide(m);return;}if(isHull){if(d.interiorCeiling)hide(m);else if(!d.interiorFloor)ghost(m);return;}if(connected&&d.connectedInteriorId!==connected.id){hide(m);return;}if(d.interiorCeiling||scope.levelId!=='all'&&(d.interiorStorey||'ground')!==scope.levelId)hide(m);});
 for(const hull of interiorEditHulls(virtual,connected?part:null,parts)){if(hull.id===part.id)continue;meshes.get(hull.id)?.traverse(ghost);}
 return ()=>{for(const restore of saved.reverse())restore();};
}

// Walk the authored building, independently of editor cutaway visibility.
export function showCompleteInteriorView(roots){
 const saved=[];for(const root of roots)root.traverse(m=>{if(!m.isMesh||!m.userData.interiorCeiling)return;const visible=m.visible;saved.push(()=>m.visible=visible);m.visible=true;});
 return ()=>{for(const restore of saved)restore();};
}
