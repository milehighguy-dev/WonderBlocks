import * as T from '../../vendor/three.module.js';
import {instanceDefinition} from '../core/instances.js';

const round=n=>Math.round(n*1e6)/1e6;
function signatureId(value){
 let a=2166136261,b=3335557771;
 for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b^value.charCodeAt(i),2246822519);}
 return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
function groupEntries(parts){
 const origin=new T.Vector3(...parts[0].position),inverse=new T.Quaternion().setFromEuler(new T.Euler(...parts[0].rotation)).invert();
 return parts.map(part=>{
  const position=new T.Vector3(...part.position).sub(origin).applyQuaternion(inverse).toArray().map(round),rotation=new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)).premultiply(inverse);
  let quaternion=rotation.toArray().map(round);
  // At 180 degrees q and -q both round to w=0. Choose a stable hemisphere
  // after rounding so equivalent +180/-180 placements remain copies.
  if(quaternion[3]<0||quaternion[3]===0&&quaternion.slice(0,3).find(n=>n!==0)<0)quaternion=quaternion.map(n=>-n);
  return {part,key:JSON.stringify([instanceDefinition(part),position,quaternion])};
 }).sort((a,b)=>a.key.localeCompare(b.key));
}
// Scene authors keep real component groups. Only whole matching groups or
// identical standalone objects receive copy badges; reused components do not
// make an otherwise different building claim to be a copy.
export function prepareExampleCopies(project,prefix){
 const groups=new Map(),objects=[];
 for(const part of project.parts){
  delete part.instanceFamily;delete part.instanceName;delete part.instanceCopy;
  if(part.type==='character-reference')continue;
  if(part.assemblyId){if(!groups.has(part.assemblyId))groups.set(part.assemblyId,[]);groups.get(part.assemblyId).push(part);}else objects.push([part]);
 }
 const originals=new Map();
 for(const parts of [...groups.values(),...objects]){
  const entries=groupEntries(parts),key=JSON.stringify(entries.map(e=>e.key)),original=originals.get(key);
  if(!original){originals.set(key,entries);continue;}
  const family=prefix+'-'+signatureId(key);
  for(let i=0;i<entries.length;i++){
   const source=original[i].part,copy=entries[i].part;
   source.instanceFamily=copy.instanceFamily=family+'-'+i;
   source.instanceName??=source.name;copy.instanceName=source.instanceName;copy.instanceCopy=true;
  }
 }
 return project;
}
