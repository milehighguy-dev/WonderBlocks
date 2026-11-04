const MIN_SCALE=.05,MAX_SCALE=1000,MAX_POSITION=1000;

// Keep the selection's lowest point at its existing elevation while scaling.
export function groupScalePivot(bounds){
 return [(bounds.min.x+bounds.max.x)/2,bounds.min.y,(bounds.min.z+bounds.max.z)/2];
}

// One shared multiplier preserves rotations, reflected parts, and every join.
// Nonuniform world scaling would introduce shear into differently rotated parts.
export function groupScaleLimits(parts,pivot){
 if(!parts.length||pivot.length!==3||pivot.some(n=>!Number.isFinite(n)))throw Error('Invalid group scale.');
 if(parts.some(p=>p.type==='character-reference'))throw Error('Character references stay at their original size.');
 let lower=0,upper=Infinity;
 for(const part of parts)for(let i=0;i<3;i++){
  const magnitude=Math.abs(part.scale[i]),offset=part.position[i]-pivot[i];
  if(!Number.isFinite(magnitude)||magnitude<MIN_SCALE||magnitude>MAX_SCALE||!Number.isFinite(offset))throw Error('Invalid group transform.');
  lower=Math.max(lower,MIN_SCALE/magnitude);upper=Math.min(upper,MAX_SCALE/magnitude);
  if(offset){
   const a=(-MAX_POSITION-pivot[i])/offset,b=(MAX_POSITION-pivot[i])/offset;
   lower=Math.max(lower,Math.min(a,b));upper=Math.min(upper,Math.max(a,b));
  }
 }
 return [lower,upper];
}
export function scaleObjectGroup(parts,pivot,requested){
 if(!Number.isFinite(requested)||requested<=0)throw Error('Use a positive group scale multiplier.');
 const [lower,upper]=groupScaleLimits(parts,pivot),factor=Math.max(lower,Math.min(upper,requested));
 return {factor,parts:parts.map(part=>({...structuredClone(part),
  position:part.position.map((n,i)=>Math.max(-MAX_POSITION,Math.min(MAX_POSITION,pivot[i]+(n-pivot[i])*factor))),
  scale:part.scale.map(n=>Math.sign(n)*Math.max(MIN_SCALE,Math.min(MAX_SCALE,Math.abs(n)*factor)))
 }))};
}
