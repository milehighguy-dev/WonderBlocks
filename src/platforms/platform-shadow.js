import * as T from '../../vendor/three.module.js';
import {weldSurface,cleanCollisionSurface,assertClosedSurface} from '../collision/collision-geometry.js';

// Keep the load-bearing platform shell independent of open metal straps and
// alpha fringe. This is a rendering hint; it never becomes object collision.
export function platformShadowVolume(meshes,{closeEnds=false}={}){
 if(!meshes.length)return null;
 const segments=meshes.map(mesh=>{mesh.updateMatrix();const a=mesh.geometry.attributes.position,index=mesh.geometry.index;return {positions:Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrix).toArray()),triangles:Array.from({length:(index?.count??a.count)/3},(_,i)=>[0,1,2].map(j=>index?index.getX(i*3+j):i*3+j))};});
 const surface=cleanCollisionSurface(weldSurface(segments),.0001);
 if(closeEnds){
  // The native circular underbody ends at two known horizontal rings: the
  // underside of the deck and the removed support pole. Cap only those ends.
  const edges=new Map();for(const t of surface.triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],key=a+','+b;if(edges.has(key))return null;edges.set(key,[a,b]);}
  const boundary=[...edges.values()].filter(([a,b])=>!edges.has(b+','+a)),byStart=new Map();for(const e of boundary){if(byStart.has(e[0]))return null;byStart.set(e[0],e);}
  const ys=surface.positions.map(p=>p[1]),low=Math.min(...ys),high=Math.max(...ys),seen=new Set();let ends=0;
  for(const first of boundary){if(seen.has(first[0]))continue;const loop=[];let edge=first;while(edge&&!seen.has(edge[0])){seen.add(edge[0]);loop.push(edge[0]);edge=byStart.get(edge[1]);}if(edge!==first||loop.length<3||++ends>2)return null;
   if(![low,high].some(y=>loop.every(i=>Math.abs(surface.positions[i][1]-y)<.0001)))return null;
   const center=surface.positions.length;surface.positions.push(loop.reduce((p,i)=>p.map((v,k)=>v+surface.positions[i][k]/loop.length),[0,0,0]));for(let i=0;i<loop.length;i++)surface.triangles.push([center,loop[(i+1)%loop.length],loop[i]]);
  }
 }
 try{assertClosedSurface(surface);}catch{return null;}
 return {...surface,matrix:meshes[0].matrix.clone().invert().toArray()};
}
