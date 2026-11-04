// Copies own their connections. References outside a copied selection are detached.
export function remapPartReferences(parts,ids){
 const remap=ref=>ids.has(ref?.partId)?{...ref,partId:ids.get(ref.partId)}:null;
 for(const part of parts){
  if(!part.route)continue;
  for(const segment of part.route.segments){const fit=segment.hallway?.entranceFit;if(fit){if(ids.has(fit.partId))fit.partId=ids.get(fit.partId);else delete segment.hallway.entranceFit;}}
  if(part.route.links)for(const end of ['start','end']){
   const ref=remap(part.route.links[end]);
   if(ref)part.route.links[end]=ref;else delete part.route.links[end];
  }
  if(part.route.attachments)part.route.attachments=part.route.attachments.flatMap(a=>{
   const ref=remap(a.ref);return ref?[{...a,ref}]:[];
  });
  delete part.route.externalOpenings;
 }
 return parts;
}

export function detachDeletedPartReferences(parts,ids){
 for(const part of parts){
  if(!part.route)continue;
  for(const end of ['start','end'])if(ids.has(part.route.links?.[end]?.partId))delete part.route.links[end];
  if(part.route.attachments)part.route.attachments=part.route.attachments.filter(a=>!ids.has(a.ref.partId));
  for(const segment of part.route.segments)if(ids.has(segment.hallway?.entranceFit?.partId))delete segment.hallway.entranceFit;
  delete part.route.externalOpenings;
 }
 return parts;
}

// Later landing references must be accounted for before changing section indices.
export function assertRouteInsertion(parts,partId,insert){
 for(const p of parts){if(p.id===partId||!p.route)continue;const refs=[...Object.values(p.route.links||{}),...(p.route.attachments||[]).map(a=>a.ref)];if(refs.some(ref=>ref?.partId===partId&&ref.segment>=insert))throw Error('A later landing is connected to another route. Detach that connection before inserting sections ahead of it.');}
}
