import {instanceDefinition} from '../core/instances.js';
import {SWBF2_MAX_STATIC_BONES} from './swbf2-binary.js';
const canonical=value=>JSON.stringify(value,(_,item)=>typeof item==='number'?Math.round(item*1e6)/1e6:item);
export function splitLeafAttachments(assets){
 const max=SWBF2_MAX_STATIC_BONES-1;
 return assets.flatMap(asset=>{
  if(asset.leaves.length<=max)return [asset];
  const result=[{...asset,leaves:asset.leaves.slice(0,max)}];
  for(let at=max;at<asset.leaves.length;at+=max)result.push({...asset,key:asset.key+'|foliage:'+at,label:asset.label+' foliage '+Math.floor(at/max),role:'foliage',segments:[],bodies:[],primitives:[],fallback:[],structural:[],shadowShells:[],leaves:asset.leaves.slice(at,at+max)});
  return result;
 });
}
function resourceSignature(asset){
 const groups=new Map(),group=value=>{if(!groups.has(value))groups.set(value,groups.size);return groups.get(value);};
 return canonical({role:asset.role,classLabel:asset.classLabel,segments:asset.segments,leaves:asset.leaves,structural:asset.structural,shadows:asset.shadowShells,bodies:asset.bodies.map(body=>({surface:body.surface,primitive:body.primitive?{shape:body.primitive.shape,dimensions:body.primitive.dimensions,position:body.primitive.position,rotation:body.primitive.rotation}:null,mask:body.mask,source:body.source,preserveFaces:body.preserveFaces,collisionGroup:group(body.collisionGroup),contactPartition:body.contactPartition}))});
}
// Authored instance families opt ordinary objects into sharing. Flora also
// shares identical plants automatically, independently of editor object groups.
// Compare actual local geometry/materials/collision as well as the definition:
// contextual cuts or world-anchored route geometry must never be reused wrongly.
export function shareInstanceAssets(assets,parts){
 const byId=new Map(parts.map(part=>[part.id,part])),buckets=new Map(),result=[];
 for(const asset of assets){
  const owners=asset.partIds.map(id=>byId.get(id)),flora=owners.length===1&&owners[0]?.type==='flora';
  if(!flora&&!owners.every(part=>part?.instanceFamily)){result.push(asset);continue;}
  const key=flora?'flora|'+instanceDefinition(owners[0]):owners.map(part=>part.instanceFamily).sort().join('|'),bucket=buckets.get(key)||[],signature=resourceSignature(asset),same=bucket.find(entry=>entry.signature===signature),placement={position:asset.pivot,rotation:asset.rotation,partIds:[...asset.partIds]};
  if(same){same.asset.instances.push(placement);same.asset.partIds.push(...asset.partIds.filter(id=>!same.asset.partIds.includes(id)));}
  else{if(owners.every(part=>part.instanceFamily)){asset.key='instance:'+owners.map(part=>part.instanceFamily).sort().join('|')+'|'+asset.role;if(owners.length===1)asset.label=owners[0].instanceName||asset.label;}asset.instances=[placement];bucket.push({signature,asset});buckets.set(key,bucket);result.push(asset);}
 }
 return result;
}
