import {copyParts} from './assemblies.js';
import {canonicalFloraNodes} from '../flora/flora-node-identity.js';

// Poses and editor labels belong to a placement. Scale is baked into exported
// static meshes, so changing scale is a resource edit and makes a copy unique.
export function instanceDefinition(part){
 const value=structuredClone(part);for(const key of ['id','name','position','rotation','assemblyId','assemblyName','instanceFamily','instanceName','instanceCopy'])delete value[key];
 if(value.flora)Object.assign(value.flora,canonicalFloraNodes(value.flora.branches,value.flora.organs));
 const sorted=input=>Array.isArray(input)?input.map(sorted):input&&typeof input==='object'?Object.fromEntries(Object.keys(input).sort().map(key=>[key,sorted(input[key])])):input;
 return JSON.stringify(sorted(value));
}
export function createInstanceCopies(parts,ids){
 const originals=parts.filter(part=>ids.has(part.id)),copies=copyParts(parts,ids);
 for(const [i,original] of originals.entries()){original.instanceFamily??=crypto.randomUUID();original.instanceName??=original.name;copies[i].instanceFamily=original.instanceFamily;copies[i].instanceName=original.instanceName;copies[i].instanceCopy=true;}
 return copies;
}
export function detachEditedInstances(parts,previousParts){
 const before=new Map(previousParts.map(part=>[part.id,part])),detached=[];
 for(const part of parts){const old=before.get(part.id);if(part.instanceFamily&&old?.instanceFamily===part.instanceFamily&&instanceDefinition(part)!==instanceDefinition(old)){delete part.instanceFamily;delete part.instanceName;delete part.instanceCopy;detached.push(part.id);}}
 return detached;
}
