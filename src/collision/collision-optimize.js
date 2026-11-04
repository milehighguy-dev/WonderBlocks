import * as T from '../../vendor/three.module.js';

const epsilon=1e-6;
const volume=p=>p.dimensions.reduce((n,v)=>n*v,8);
const frame=p=>new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.rotation),new T.Vector3(1,1,1));
function contained(inner,outer){
 const matrix=frame(outer).invert().multiply(frame(inner)),d=inner.dimensions,target=outer.dimensions;
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const point=new T.Vector3(x*d[0],y*d[1],z*d[2]).applyMatrix4(matrix);if(point.toArray().some((v,i)=>Math.abs(v)>target[i]+epsilon))return false;}
 return true;
}
const ownership=b=>[b.role,b.routePath,b.routeSegment,b.interiorStair,!!b.assemblySolid].join('|');
function merge(a,b){
 if(a.mask!==b.mask||ownership(a)!==ownership(b)||(a.source==='railing barrier')!==(b.source==='railing barrier'))return null;
 const x=a.primitive,y=b.primitive,q=new T.Quaternion(...x.rotation);if(Math.abs(q.dot(new T.Quaternion(...y.rotation)))<1-1e-10)return null;
 const delta=new T.Vector3(...y.position).sub(new T.Vector3(...x.position)).applyQuaternion(q.clone().invert()).toArray();
 for(let axis=0;axis<3;axis++){
  if([0,1,2].some(i=>i!==axis&&(Math.abs(delta[i])>epsilon||Math.abs(x.dimensions[i]-y.dimensions[i])>epsilon)))continue;
  const min=Math.min(-x.dimensions[axis],delta[axis]-y.dimensions[axis]),max=Math.max(x.dimensions[axis],delta[axis]+y.dimensions[axis]);
  if(Math.abs(delta[axis])>x.dimensions[axis]+y.dimensions[axis]+epsilon)continue;
  const dimensions=[...x.dimensions];dimensions[axis]=(max-min)/2;const shift=new T.Vector3().setComponent(axis,(min+max)/2).applyQuaternion(q),position=new T.Vector3(...x.position).add(shift).toArray();
  return {...a,primitive:{...x,position,dimensions},mergedBodyIds:[...(a.mergedBodyIds??[a.id]),...(b.mergedBodyIds??[b.id])]};
 }
 return null;
}
// Remove covered category bits, then join only exact rectangular unions. A gap,
// doorway, change of height or incompatible orientation cannot be filled.
export function optimizeCollisionBodies(source){
 const bodies=source.map(b=>({...b})),original=bodies.filter(b=>b.primitive).length,boxes=bodies.filter(b=>b.primitive?.shape===4).sort((a,b)=>volume(b.primitive)-volume(a.primitive));
 let removed=0,merged=0;
 for(const outer of boxes){if(!outer.mask)continue;for(const inner of bodies){if(inner===outer||!inner.mask||!inner.primitive||!(inner.mask&outer.mask))continue;if(volume(inner.primitive)>volume(outer.primitive)+epsilon)continue;
   // Equal volumes keep the earlier stable identity instead of deleting both.
   if(Math.abs(volume(inner.primitive)-volume(outer.primitive))<epsilon&&inner.id<outer.id)continue;
   if(contained(inner.primitive,outer.primitive)){inner.mask&=~outer.mask;if(!inner.mask)removed++;}
  }}
 let active=bodies.filter(b=>b.mask);
 for(let i=0;i<active.length;i++){if(active[i].primitive?.shape!==4)continue;for(let j=i+1;j<active.length;j++){if(active[j].primitive?.shape!==4)continue;const joined=merge(active[i],active[j]);if(joined){active[i]=joined;active.splice(j,1);merged++;j=i;}}}
 return {bodies:active,stats:{originalPrimitives:original,removedPrimitives:removed,mergedPrimitives:merged}};
}
