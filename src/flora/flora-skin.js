import * as T from '../../vendor/three.module.js';
import {triTable} from '../../vendor/marching-cubes-table.js';
import {floraSurfaceDetail} from './flora-detail.js';

// Original implicit skin implementation. Bones and woody attachments contribute
// to one field, so a joint has one exterior surface instead of intersecting caps.
const key=(x,y,z)=>`${x},${y},${z}`;
const cubeEdges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const cache=new Map();
export function clearFloraSkinCache(){for(const geometry of cache.values())geometry.dispose();cache.clear();}
export function cachedFloraSkin(cacheKey){return cache.get(cacheKey)?.clone()||null;}
export function cacheFloraSkin(cacheKey,geometry){
 if(!cacheKey)return;
 cache.get(cacheKey)?.dispose();cache.delete(cacheKey);cache.set(cacheKey,geometry.clone());
 while(cache.size>8){const first=cache.keys().next().value;cache.get(first).dispose();cache.delete(first);}
}
const smoothMin=(a,b,k)=>{if(!k)return Math.min(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
function bounds(points,padding=0){const box=new T.Box3();for(const p of points)box.expandByPoint(p);return box.expandByScalar(padding);}
export function skinBone(a,b,ra,rb,owner){const delta=b.clone().sub(a),length=delta.lengthSq(),box=bounds([a,b],Math.max(ra,rb));return {owner,box,radius:Math.min(ra,rb),distance(p,minimumRadius=0){const dx=p.x-a.x,dy=p.y-a.y,dz=p.z-a.z,t=length?T.MathUtils.clamp((dx*delta.x+dy*delta.y+dz*delta.z)/length,0,1):0;return Math.hypot(dx-delta.x*t,dy-delta.y*t,dz-delta.z*t)-Math.max(minimumRadius,T.MathUtils.lerp(ra,rb,t));}};}

// A local triangle tree keeps imported roots and trunks in their original shape.
// Signed crossings keep overlapping source shells solid instead of XOR-cutting
// their overlap. A globally reversed source winding is supported too.
export function skinSolid(geometries,owner){
 const triangles=[];for(const g of geometries){const p=g.attributes.position,index=g.index;for(let i=0;i<(index?.count??p.count);i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j)),triangle=new T.Triangle(...points);if(triangle.getArea()>1e-10)triangles.push({triangle,box:bounds(points),center:triangle.getMidpoint(new T.Vector3())});}}
 if(!triangles.length)return null;
 function tree(items){const box=new T.Box3();for(const t of items)box.union(t.box);if(items.length<=12)return {box,items};const span=box.getSize(new T.Vector3()),axis=span.x>=span.y&&span.x>=span.z?'x':span.y>=span.z?'y':'z';items.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=items.length>>1;return {box,left:tree(items.slice(0,mid)),right:tree(items.slice(mid))};}
 const root=tree(triangles),closest=new T.Vector3(),hit=new T.Vector3(),ray=new T.Ray(),direction=new T.Vector3(1,.173205,.271828).normalize(),surfaceBoxes=[];
 function leaves(n){if(n.items)surfaceBoxes.push(n.box);else{leaves(n.left);leaves(n.right);}}leaves(root);
 const edgeLengths=triangles.map(({triangle:t})=>Math.max(t.a.distanceTo(t.b),t.b.distanceTo(t.c),t.c.distanceTo(t.a))).sort((a,b)=>a-b);
 const radius=Math.max(.015,Math.min(...root.box.getSize(new T.Vector3()).toArray())*.25);
 return {owner,box:root.box,radius,surfaceBoxes,featureRadius:Math.min(radius,edgeLengths[Math.floor(edgeLengths.length*.2)]*.35),distance(p){let best=Infinity;function near(n){if(n.box.distanceToPoint(p)>=best)return;if(n.items){for(const t of n.items){t.triangle.closestPointToPoint(p,closest);best=Math.min(best,p.distanceTo(closest));}}else{const a=n.left.box.distanceToPoint(p),b=n.right.box.distanceToPoint(p);if(a<b){near(n.left);near(n.right);}else{near(n.right);near(n.left);}}}near(root);ray.set(p,direction);const crossings=[];function cross(n){if(!ray.intersectsBox(n.box))return;if(n.items){for(const {triangle:t} of n.items)if(ray.intersectTriangle(t.a,t.b,t.c,false,hit))crossings.push({distance:hit.distanceTo(p),sign:Math.sign(t.getNormal(closest).dot(direction))});}else{cross(n.left);cross(n.right);}}cross(root);crossings.sort((a,b)=>a.distance-b.distance);let winding=0,last=-Infinity,sign=0;for(const x of crossings){if(x.distance-last>1e-6){winding+=Math.sign(sign);sign=x.sign;last=x.distance;}else sign+=x.sign;}winding+=Math.sign(sign);return winding!==0?-best:best;}};
}

export function floraSkinGeometry(shapes,detail='standard',cacheKey,refinement=0){
 if(cacheKey&&cache.has(cacheKey)){const g=cache.get(cacheKey);cache.delete(cacheKey);cache.set(cacheKey,g);return g.clone();}
 if(!shapes.length)return new T.BufferGeometry();
 // Authored branching fields need the complete surface before face reduction:
 // coarse sampling can erase a thin limb that edge collapse cannot recover.
 // Imported solid branches retain their existing reinforced sampling budget.
 const samplingDetail=detail==='swbf2'?(shapes.some(s=>s.bodyField)?'standard':'low'):detail;
 const primary=shapes.filter(s=>!s.reinforcement),radii=(primary.length?primary:shapes).map(s=>s.radius).sort((a,b)=>a-b),blend=Math.min(.08,radii[radii.length>>1]*.2),box=new T.Box3();for(const s of shapes)box.union(s.box);
 // Large branching crowns need more samples than small joint object groups;
 // retain the smaller editor budget for ordinary plants and single attachments.
 const broadWood=primary.some(s=>s.surfaceBoxes&&s.radius>=.5),span=box.getSize(new T.Vector3()),limit=shapes.some(s=>s.surfaceBoxes)?(samplingDetail==='low'?28000:broadWood&&primary.length>=8?225000:75000)*2**refinement:(samplingDetail==='low'?14000:32000);
 let step=Math.max(.015,Math.min(radii[radii.length>>1],...shapes.filter(s=>s.featureRadius).map(s=>s.featureRadius))/(samplingDetail==='low'?1.2:1.8),Math.max(...span.toArray())/(samplingDetail==='low'?100:180)),cells;
 step*=.65**refinement;
 // Sparse cells around occupied bones avoid sampling the empty tree canopy.
 // Coarsen uniformly to cap editor work; this never changes the saved skeleton.
 for(;;){cells=new Map();let full=false;for(const s of shapes){const occupied=s.surfaceBoxes||[s.box];for(const source of occupied){const b=source.clone().expandByScalar(blend+step*2),lo=b.min.toArray().map(x=>Math.floor(x/step)),hi=b.max.toArray().map(x=>Math.ceil(x/step));for(let z=lo[2];z<hi[2]&&!full;z++)for(let y=lo[1];y<hi[1]&&!full;y++)for(let x=lo[0];x<hi[0];x++){const k=key(x,y,z);let c=cells.get(k);if(!c)cells.set(k,c={xyz:[x,y,z],shapes:new Set()});c.shapes.add(s);if(cells.size>limit){full=true;break;}}if(full)break;}if(full)break;}if(!full)break;step*=1.3;}
 const values=new Map(),positions=[],indices=[],edges=new Map();
 function sample(x,y,z){const k=key(x,y,z);if(values.has(k))return values.get(k);const p=new T.Vector3(x*step,y*step,z*step),owners=new Map(),candidates=new Set();for(let dz=-1;dz<=0;dz++)for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++)for(const s of cells.get(key(x+dx,y+dy,z+dz))?.shapes||[])candidates.add(s);for(const s of shapes)if(s.surfaceBoxes&&s.box.containsPoint(p))candidates.add(s);for(const s of candidates){if(s.box.distanceToPoint(p)>blend+step*3)continue;owners.set(s.owner,Math.min(owners.get(s.owner)??Infinity,s.distance(p,step*.8)));}let d=step*4;for(const v of owners.values())d=smoothMin(d,v,blend);values.set(k,d);return d;}
 function vertex(a,b,va,vb){let ka=key(...a),kb=key(...b);if(ka>kb){[ka,kb]=[kb,ka];[a,b]=[b,a];[va,vb]=[vb,va];}const k=ka+':'+kb;if(edges.has(k))return edges.get(k);const t=T.MathUtils.clamp(va/(va-vb),1e-5,1-1e-5),index=positions.length/3;positions.push(...a.map((v,j)=>(v+(b[j]-v)*t)*step));edges.set(k,index);return index;}
 for(const {xyz:[x,y,z]} of cells.values()){const cube=[[x,y,z],[x+1,y,z],[x+1,y+1,z],[x,y+1,z],[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]],v=cube.map(p=>sample(...p));let mask=0;for(let i=0;i<8;i++)if(v[i]<0)mask|=1<<i;if(mask===0||mask===255)continue;for(let i=mask*16;triTable[i]!==-1;i+=3){const ids=[0,2,1].map(j=>{const [a,b]=cubeEdges[triTable[i+j]];return vertex(cube[a],cube[b],v[a],v[b]);});indices.push(...ids);}}
 // Discard sub-cell specks/cavities from baked object group seams. Keep substantial
 // components rather than hiding a genuinely disconnected large attachment.
 const parents=Array.from({length:positions.length/3},(_,i)=>i),find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
 for(let i=0;i<indices.length;i+=3){const root=find(indices[i]);parents[find(indices[i+1])]=root;parents[find(indices[i+2])]=root;}
 const counts=new Map(),components=new Map();for(const i of indices){const root=find(i);counts.set(root,(counts.get(root)||0)+1);if(!components.has(root))components.set(root,new Set());components.get(root).add(i);}const largest=Math.max(...counts.values()),filtered=[];
 // Each authored owner keeps its strongest component, even if it is smaller
 // than the old global triangle cutoff.
 const ownerBest=new Map(),componentOwners=new Map();for(const [root,vertices] of components){const box=new T.Box3();for(const i of vertices)box.expandByPoint(new T.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]));const owners=new Set(shapes.filter(shape=>shape.box.intersectsBox(box)).map(shape=>shape.owner));componentOwners.set(root,owners);for(const owner of owners)if(!ownerBest.has(owner)||counts.get(root)>counts.get(ownerBest.get(owner)))ownerBest.set(owner,root);}
 for(let i=0;i<indices.length;i+=3){const root=find(indices[i]),count=counts.get(root);if(count===largest||count>=384||[...componentOwners.get(root)].some(owner=>ownerBest.get(owner)===root))filtered.push(indices[i],indices[i+1],indices[i+2]);}
 const keptRoots=new Set(filtered.map(find));if(refinement<2&&keptRoots.size>1&&shapes.some(s=>s.surfaceBoxes&&[...keptRoots].filter(root=>componentOwners.get(root).has(s.owner)).length>1))return floraSkinGeometry(shapes,detail,cacheKey,refinement+1);
 const used=new Map(),compact=[],remapped=filtered.map(i=>{if(!used.has(i)){used.set(i,compact.length/3);compact.push(positions[i*3],positions[i*3+1],positions[i*3+2]);}return used.get(i);});
 // Ambiguous marching-cube faces can leave small planar boundary loops. Close
 // those loops with the opposite edge winding instead of exporting cracks.
 const boundaryEdges=new Map();for(let i=0;i<remapped.length;i+=3)for(let j=0;j<3;j++){const a=remapped[i+j],b=remapped[i+(j+1)%3],key=a<b?a+':'+b:b+':'+a,edge=boundaryEdges.get(key);if(edge)edge.count++;else boundaryEdges.set(key,{a,b,count:1});}
 const boundary=[...boundaryEdges.values()].filter(e=>e.count===1),outgoing=new Map();for(const edge of boundary){if(!outgoing.has(edge.a))outgoing.set(edge.a,[]);outgoing.get(edge.a).push(edge);}
 const seen=new Set();for(const first of boundary){if(seen.has(first))continue;const loop=[];let edge=first;while(edge&&!seen.has(edge)){seen.add(edge);loop.push(edge);const next=outgoing.get(edge.b);edge=next?.length===1?next[0]:null;}if(edge!==first||loop.length<3)continue;const center=new T.Vector3();for(const e of loop)center.add(new T.Vector3().fromArray(compact,e.a*3));center.divideScalar(loop.length);const index=compact.length/3;compact.push(...center.toArray());for(const e of loop)remapped.push(e.b,e.a,index);}
 // Thin-limb reinforcement keeps the sampling grid connected, but is not an
 // authored surface. Project its inflated envelope back onto the real wood so
 // a coarse shared grid cannot turn long limbs into scalloped, swollen tubes.
 const authored=shapes.filter(s=>!s.reinforcement);
 const projectReinforcement=broadWood&&shapes.length!==authored.length;
 if(projectReinforcement){
  const point=new T.Vector3(),gradient=new T.Vector3(),probe=new T.Vector3(),epsilon=step*.025;
  const distance=p=>{const owners=new Map();for(const s of authored){const d=s.box.distanceToPoint(p);if(d>step*3)continue;owners.set(s.owner,Math.min(owners.get(s.owner)??Infinity,s.distance(p)));}let result=step*4;for(const d of owners.values())result=smoothMin(result,d,blend);return result;};
  for(let i=0;i<compact.length;i+=3){point.fromArray(compact,i);for(let j=0;j<5;j++){const d=distance(point);if(Math.abs(d)<epsilon*.02)break;for(let axis=0;axis<3;axis++){probe.copy(point).setComponent(axis,point.getComponent(axis)+epsilon);const a=distance(probe);probe.setComponent(axis,point.getComponent(axis)-epsilon);gradient.setComponent(axis,(a-distance(probe))/(2*epsilon));}if(gradient.lengthSq()<.01)break;point.addScaledVector(gradient,-T.MathUtils.clamp(d/gradient.lengthSq(),-step*.4,step*.4));}point.toArray(compact,i);}
 }
 // Interpolated field gradients give smooth shading across the cube triangles.
 const gradients=new Map(),normals=[];
 function gradient(x,y,z){const k=key(x,y,z);if(!gradients.has(k))gradients.set(k,new T.Vector3(sample(x+1,y,z)-sample(x-1,y,z),sample(x,y+1,z)-sample(x,y-1,z),sample(x,y,z+1)-sample(x,y,z-1)).normalize());return gradients.get(k);}
 for(let i=0;i<compact.length;i+=3){const p=compact.slice(i,i+3).map(x=>x/step),base=p.map(Math.floor),t=p.map((x,k)=>x-base[k]),n=new T.Vector3();for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++)n.addScaledVector(gradient(base[0]+x,base[1]+y,base[2]+z),(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]));n.normalize();normals.push(...n.toArray());}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(compact,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(compact.flatMap((x,i)=>i%3===0?[x,compact[i+1]]:[]),2));g.setIndex(remapped);g.computeBoundingBox();g.computeBoundingSphere();g.userData.skinStep=step;
 const result=floraSurfaceDetail(g,detail);cacheFloraSkin(cacheKey,result);return result;
}
