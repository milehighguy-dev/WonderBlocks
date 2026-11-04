import {remapPartReferences} from '../editor/part-references.js';
import {mirrorPart,validateProject} from './model.js';
export function members(parts,id){const p=parts.find(p=>p.id===id);return p?parts.filter(q=>q.id===id||(p.assemblyId&&q.assemblyId===p.assemblyId)).map(q=>q.id):[];}
export function groupParts(parts,ids){if(ids.size<2)return;const id=crypto.randomUUID(),name='Object group '+(new Set(parts.map(p=>p.assemblyId).filter(Boolean)).size+1);for(const p of parts)if(ids.has(p.id)){p.assemblyId=id;p.assemblyName=name;}}
export function ungroupParts(parts,ids){const groups=new Set(parts.filter(p=>ids.has(p.id)).map(p=>p.assemblyId).filter(Boolean));for(const p of parts)if(groups.has(p.assemblyId)){delete p.assemblyId;delete p.assemblyName;}}
export function copyParts(parts,ids,mirror=false){
 const source=parts.filter(p=>ids.has(p.id));if(parts.length+source.length>500)throw Error('The project limit is 500 parts.');
 const offset=source.every(p=>p.position[0]<=999)?1:source.every(p=>p.position[0]>=-999)?-1:0;
 const groups=new Map();const copies=source.map(p=>{
  const q=mirror?mirrorPart(p):{...structuredClone(p),id:crypto.randomUUID(),name:(p.name+' copy').slice(0,80),position:[p.position[0]+offset,p.position[1],p.position[2]]};
  delete q.instanceFamily;delete q.instanceName;delete q.instanceCopy;
  if(p.assemblyId){if(!groups.has(p.assemblyId))groups.set(p.assemblyId,crypto.randomUUID());q.assemblyId=groups.get(p.assemblyId);}return q;
 });
 remapPartReferences(copies,new Map(source.map((p,i)=>[p.id,copies[i].id])));
 validateProject({format:'open-building-studio',version:1,name:'Copied parts',parts:[...parts,...copies]});
 return copies;
}

export function assemblyLabel(parts){const named=parts.find(p=>p.assemblyName)?.assemblyName;if(named)return named;const chunks=(parts[0]?.name||'').split(' • ');chunks.pop();while(chunks.length){const prefix=chunks.join(' • ');if(parts.every(p=>p.name.startsWith(prefix+' • ')))return prefix;chunks.pop();}return (parts[0]?.name||'Unnamed')+' object group';}
