import {remapPartReferences} from '../editor/part-references.js';
import * as THREE from '../../vendor/three.module.js';
import {validateProject,mirrorPart} from './model.js';
import {buildPart,disposePart} from './geometry.js';

const asProject=parts=>({format:'open-building-studio',version:1,name:'Library object group',parts});
export function captureAssembly(name,parts){
 if(!parts.length)throw Error('Select at least one part.');
 const detached=remapPartReferences(structuredClone(parts),new Map(parts.map(p=>[p.id,p.id])));
 const clean=validateProject(asProject(detached)).parts,group=new THREE.Group();
 try{
  for(const p of clean)group.add(buildPart(p));
  const box=new THREE.Box3().setFromObject(group),origin=box.getCenter(new THREE.Vector3());origin.y=box.min.y;
  for(const p of clean){p.position=p.position.map((v,i)=>v-origin.getComponent(i));delete p.assemblyId;delete p.assemblyName;}
  validateProject(asProject(clean));
  return {id:crypto.randomUUID(),name:name.trim().slice(0,80)||'Saved object group',parts:clean};
 }finally{disposePart(group);}
}
export function instantiateAssembly(entry,position=[0,0,0],angle=0,mirror=false){
 const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),assemblyId=crypto.randomUUID();
 const parts=entry.parts.map(original=>{
  const p=structuredClone(original),v=new THREE.Vector3(...p.position).applyQuaternion(rotation).add(new THREE.Vector3(...position));
  const e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation)).premultiply(rotation));
  Object.assign(p,{id:crypto.randomUUID(),assemblyId,assemblyName:entry.name,position:v.toArray(),rotation:!p.rotation[0]&&!p.rotation[2]?[0,p.rotation[1]+angle,0]:[e.x,e.y,e.z]});return p;
 });
 remapPartReferences(parts,new Map(entry.parts.map((p,i)=>[p.id,parts[i].id])));
 const copies=mirror?parts.map(mirrorPart):[];if(copies.length){const id=crypto.randomUUID();for(const p of copies)p.assemblyId=id;remapPartReferences(copies,new Map(parts.map((p,i)=>[p.id,copies[i].id])));}
 return validateProject(asProject([...parts,...copies])).parts;
}
export function validateLibrary(data){
 if(data?.format!=='wonderblocks-library'||data.version!==1||!Array.isArray(data.entries)||data.entries.length>100)throw Error('Invalid object group library (maximum 100 entries).');
 const ids=new Set();let count=0;
 const entries=data.entries.map(e=>{
  if(!e||typeof e.id!=='string'||!e.id||e.id.length>100||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||e.name.length>80)throw Error('Invalid library entry.');
  ids.add(e.id);const parts=validateProject(asProject(e.parts)).parts;
  if(!parts.length||(count+=parts.length)>5000)throw Error('Library must contain nonempty object groups and at most 5,000 parts.');
  return {id:e.id,name:e.name,parts};
 });
 return {format:'wonderblocks-library',version:1,entries};
}
export const emptyLibrary=()=>({format:'wonderblocks-library',version:1,entries:[]});
