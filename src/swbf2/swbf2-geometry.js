import {weldSurface,surfaceSegment,boxSurface,fitBox,structuralSegments,fitSphere,fitDetailBox,collisionNeedsPreservation} from '../collision/collision-geometry.js';
export {weldSurface,surfaceSegment,boxSurface,fitBox,structuralSegments,fitSphere,fitDetailBox,collisionNeedsPreservation} from '../collision/collision-geometry.js';
import * as T from '../../vendor/three.module.js';
import {exportUV} from './swbf2-textures.js';
import {closedShadow} from './swbf2-binary.js';
const key=v=>v.map(x=>Math.round(x*1e6)).join(',');
function modelBounds(models){const bounds=new T.Box3();for(const m of models){const q=new T.Quaternion(...(m.rotation??[0,0,0,1])),offset=new T.Vector3(...(m.position??[0,0,0]));for(const s of m.segments??[])for(const p of s.positions)bounds.expandByPoint(new T.Vector3(...p).applyQuaternion(q).add(offset));if(m.primitive){const d=m.primitive.dimensions;for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])bounds.expandByPoint(new T.Vector3(x*d[0],y*d[1],z*d[2]).applyQuaternion(q).add(offset));}}return bounds;}
export function needsCollisionCarrier(models){const visible=models.filter(m=>!m.hidden&&!m.shadow&&m.segments?.length),physical=models.filter(m=>m.primitive||m.name.startsWith('collision'));if(!visible.length)return true;if(!physical.length)return false;return !modelBounds(visible).expandByScalar(.00001).containsBox(modelBounds(physical));}
// EntityProp requires a compiled render model even for a collision-only asset.
// This fully cutout quad supplies that model and preserves the collider bounds.
export function collisionCarrier(models,material){
 const bounds=modelBounds(models);
 if(bounds.isEmpty())bounds.set(new T.Vector3(-.01,-.01,-.01),new T.Vector3(.01,.01,.01));
 for(const axis of ['x','y','z'])if(bounds.max[axis]-bounds.min[axis]<.002){bounds.min[axis]-=.001;bounds.max[axis]+=.001;}
 const a=bounds.min,b=bounds.max,positions=[[a.x,a.y,a.z],[b.x,a.y,b.z],[b.x,b.y,b.z],[a.x,b.y,a.z]],normal=new T.Vector3().subVectors(new T.Vector3(...positions[1]),new T.Vector3(...positions[0])).cross(new T.Vector3().subVectors(new T.Vector3(...positions[2]),new T.Vector3(...positions[0]))).normalize().toArray();
 return {name:'invisible_carrier',parent:'root',segments:[{material,positions,normals:positions.map(()=>[...normal]),uvs:[[0,0],[1,0],[1,1],[0,1]],triangles:[[0,1,2],[0,2,3]]}]};
}
export function meshSegments(mesh,frameInverse,materialIndex,{uvTransform=exportUV}={}){
 const geometry=mesh.geometry,position=geometry.attributes.position;if(!position)return [];
 const matrix=frameInverse.clone().multiply(mesh.matrixWorld),normalMatrix=new T.Matrix3().getNormalMatrix(matrix),materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],index=geometry.index,total=index?.count??position.count,groups=Array.isArray(mesh.material)&&geometry.groups.length?geometry.groups:[{start:0,count:total,materialIndex:0}],out=[];
 for(const group of groups){const material=materials[group.materialIndex];if(!material||!material.visible)continue;let segment=null,map=null;
  const begin=()=>{segment={material:materialIndex(material),positions:[],normals:[],uvs:[],triangles:[],...(material.vertexColors&&geometry.attributes.color?{colors:[]}:{})};map=new Map();out.push(segment);};begin();
  const reversed=(matrix.determinant()<0)!==(material.side===T.BackSide),normalSign=material.side===T.BackSide?-1:1;
  for(let i=group.start;i<Math.min(total,group.start+group.count);i+=3){if(i+2>=total)break;if(segment.positions.length+3>32760)begin();const source=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(reversed)[source[1],source[2]]=[source[2],source[1]];
   const points=source.map(v=>new T.Vector3().fromBufferAttribute(position,v).applyMatrix4(matrix)),face=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(face.lengthSq()<1e-18)continue;face.normalize();const triangle=[];
   for(let j=0;j<3;j++){const v=source[j],p=points[j].toArray(),n=geometry.attributes.normal?new T.Vector3().fromBufferAttribute(geometry.attributes.normal,v).applyMatrix3(normalMatrix).multiplyScalar(normalSign).normalize().toArray():face.toArray(),uv=geometry.attributes.uv?uvTransform(material,geometry.attributes.uv.getX(v),geometry.attributes.uv.getY(v)):[0,0],c=segment.colors?new T.Color().fromBufferAttribute(geometry.attributes.color,v):null,color=c?((255<<24)|(Math.round(Math.max(0,Math.min(1,c.r))*255)<<16)|(Math.round(Math.max(0,Math.min(1,c.g))*255)<<8)|Math.round(Math.max(0,Math.min(1,c.b))*255))>>>0:null,vertexKey=[...p,...n,...uv,color??''].join(',');
    let at=map.get(vertexKey);if(at===undefined){at=segment.positions.length;map.set(vertexKey,at);segment.positions.push(p);segment.normals.push(n);segment.uvs.push(uv);if(segment.colors)segment.colors.push(color);}triangle.push(at);
   }segment.triangles.push(triangle);
  }
 }return out.filter(s=>s.triangles.length);
}
export function partitionSegment(source){if(source.positions.length<=32760)return [source];const out=[];let target,map;const begin=()=>{target={material:source.material,positions:[],normals:[],uvs:[],triangles:[],...(source.colors?{colors:[]}:{})};map=new Map();out.push(target);};begin();for(const triangle of source.triangles){if(target.positions.length+triangle.filter(v=>!map.has(v)).length>32760)begin();target.triangles.push(triangle.map(v=>{if(!map.has(v)){map.set(v,target.positions.length);target.positions.push(source.positions[v]);target.normals.push(source.normals[v]);target.uvs.push(source.uvs[v]);if(source.colors)target.colors.push(source.colors[v]);}return map.get(v);}));}return out;}
export function mergeSegments(segments){const out=[];for(const source of segments.flatMap(partitionSegment)){let target=out.find(s=>s.material===source.material&&!!s.colors===!!source.colors&&s.positions.length+source.positions.length<=32760);if(!target){out.push({material:source.material,positions:[...source.positions],normals:[...source.normals],uvs:[...source.uvs],triangles:source.triangles.map(t=>[...t]),...(source.colors?{colors:[...source.colors]}:{})});continue;}const offset=target.positions.length;target.positions.push(...source.positions);target.normals.push(...source.normals);target.uvs.push(...source.uvs);target.triangles.push(...source.triangles.map(t=>t.map(v=>v+offset)));if(target.colors)target.colors.push(...source.colors);}return out;}
export function shadowFromPrimitives(primitives){const positions=[],triangles=[];for(const p of primitives){const s=boxSurface(p,{shrink:.985});const offset=positions.length;positions.push(...s.positions);triangles.push(...s.triangles.map(t=>t.map(v=>v+offset)));}return positions.length?closedShadow(positions,triangles):null;}
// A curved or tapered trunk cannot safely use its nominal circular radius.
// Check the actual skin: one inside point plus no surface crossing guarantees
// that an entire connected box is inside, including its edges and faces.
export function boxContainment(surface){
 const triangles=surface.triangles.map(t=>{const triangle=new T.Triangle(...t.map(i=>new T.Vector3(...surface.positions[i])));return {triangle,box:new T.Box3().setFromPoints([triangle.a,triangle.b,triangle.c]),center:triangle.getMidpoint(new T.Vector3())};}).filter(t=>t.triangle.getArea()>1e-12);
 if(!triangles.length)return ()=>false;
 function tree(items){const box=new T.Box3();for(const item of items)box.union(item.box);if(items.length<=12)return {box,items};const span=box.getSize(new T.Vector3()),axis=span.x>=span.y&&span.x>=span.z?'x':span.y>=span.z?'y':'z';items.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=items.length>>1;return {box,left:tree(items.slice(0,mid)),right:tree(items.slice(mid))};}
 const root=tree(triangles),direction=new T.Vector3(1,.173205,.271828).normalize(),ray=new T.Ray(),hit=new T.Vector3(),normal=new T.Vector3();
 return primitive=>{
  const center=new T.Vector3(...primitive.position);if(!root.box.containsPoint(center))return false;ray.set(center,direction);const crossings=[];
  function cross(node){if(!ray.intersectsBox(node.box))return;if(node.items){for(const {triangle:t} of node.items)if(ray.intersectTriangle(t.a,t.b,t.c,false,hit))crossings.push({distance:hit.distanceTo(center),sign:Math.sign(t.getNormal(normal).dot(direction))});}else{cross(node.left);cross(node.right);}}cross(root);crossings.sort((a,b)=>a.distance-b.distance);let winding=0,last=-Infinity,sign=0;for(const c of crossings){if(c.distance-last>1e-6){winding+=Math.sign(sign);sign=c.sign;last=c.distance;}else sign+=c.sign;}winding+=Math.sign(sign);if(!winding)return false;
  const matrix=new T.Matrix4().compose(center,new T.Quaternion(...primitive.rotation),new T.Vector3(1,1,1)),inverse=matrix.clone().invert(),epsilon=Math.max(...primitive.dimensions)*1e-6+1e-6,d=new T.Vector3(...primitive.dimensions).addScalar(epsilon),box=new T.Box3(d.clone().negate(),d),bounds=box.clone().applyMatrix4(matrix),triangle=new T.Triangle();
  function intersects(node){if(!bounds.intersectsBox(node.box))return false;if(node.items){for(const item of node.items){if(!bounds.intersectsBox(item.box))continue;triangle.a.copy(item.triangle.a).applyMatrix4(inverse);triangle.b.copy(item.triangle.b).applyMatrix4(inverse);triangle.c.copy(item.triangle.c).applyMatrix4(inverse);if(box.intersectsTriangle(triangle))return true;}return false;}return intersects(node.left)||intersects(node.right);}
  return !intersects(root);
 };
}
export function insetSurface(surface){const neighbours=surface.positions.map(()=>new Set()),normals=surface.positions.map(()=>new T.Vector3());for(const t of surface.triangles){const [a,b,c]=t.map(v=>new T.Vector3(...surface.positions[v])),normal=b.sub(a).cross(c.sub(a));for(const v of t){normals[v].add(normal);for(const n of t)if(v!==n)neighbours[v].add(n);}}const positions=surface.positions.map(p=>[...p]),seen=new Set();for(let i=0;i<positions.length;i++){if(seen.has(i))continue;const component=[],pending=[i],bounds=new T.Box3();seen.add(i);while(pending.length){const v=pending.pop();component.push(v);bounds.expandByPoint(new T.Vector3(...positions[v]));for(const n of neighbours[v])if(!seen.has(n)){seen.add(n);pending.push(n);}}const span=bounds.getSize(new T.Vector3()),amount=Math.min(span.length()*.001,Math.min(...span.toArray().filter(v=>v>1e-8))*.01);for(const v of component){const point=new T.Vector3(...surface.positions[v]),local=Math.min(amount,...[...neighbours[v]].map(n=>point.distanceTo(new T.Vector3(...surface.positions[n]))*.02));positions[v]=point.addScaledVector(normals[v].normalize(),-local).toArray();}}return {...surface,positions};}
// Decimation can place a vertex beyond a concave shell. Project those vertices
// back into the original solid; keep topology intact or reject the silhouette.
export function insetShadow(surface,original){
 // Test the coordinates that the MSH will store, including float rounding.
 const stored=p=>new T.Vector3(...p.map(Math.fround)),triangles=original.triangles.map(t=>{const triangle=new T.Triangle(...t.map(i=>stored(original.positions[i])));return {triangle,box:new T.Box3().setFromPoints([triangle.a,triangle.b,triangle.c]),center:triangle.getMidpoint(new T.Vector3())};}).filter(t=>t.triangle.getArea()>1e-12);if(!triangles.length)return null;
 function tree(items){const box=new T.Box3();for(const item of items)box.union(item.box);if(items.length<=12)return {box,items};const span=box.getSize(new T.Vector3()),axis=span.x>=span.y&&span.x>=span.z?'x':span.y>=span.z?'y':'z';items.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=items.length>>1;return {box,left:tree(items.slice(0,mid)),right:tree(items.slice(mid))};}
 const root=tree(triangles),direction=new T.Vector3(1,.173205,.271828).normalize(),ray=new T.Ray(),hit=new T.Vector3(),normal=new T.Vector3(),closest=new T.Vector3(),epsilon=Math.max(1e-7,root.box.getSize(new T.Vector3()).length()*1e-8);
 function inside(point){ray.set(point,direction);const crossings=[];function cross(node){if(!ray.intersectsBox(node.box))return;if(node.items){for(const {triangle:t} of node.items)if(ray.intersectTriangle(t.a,t.b,t.c,false,hit))crossings.push({distance:hit.distanceTo(point),sign:Math.sign(t.getNormal(normal).dot(direction))});}else{cross(node.left);cross(node.right);}}cross(root);crossings.sort((a,b)=>a.distance-b.distance);let winding=0,last=-Infinity,sign=0;for(const c of crossings){if(c.distance-last>epsilon){winding+=Math.sign(sign);sign=c.sign;last=c.distance;}else sign+=c.sign;}return winding+Math.sign(sign)!==0;}
 function nearest(point){let distance=Infinity,selected=null,position=new T.Vector3();function visit(node){if(node.box.distanceToPoint(point)>=distance)return;if(node.items){for(const item of node.items){item.triangle.closestPointToPoint(point,closest);const d=closest.distanceTo(point);if(d<distance){distance=d;selected=item;position.copy(closest);}}}else{const a=node.left.box.distanceToPoint(point),b=node.right.box.distanceToPoint(point);if(a<b){visit(node.left);visit(node.right);}else{visit(node.right);visit(node.left);}}}visit(root);return {selected,position};}
 const inset=insetSurface(surface);
 // Thin triangles can turn inside out under the usual offset. Retry smaller
 // offsets, retaining the same float-precision containment and winding checks.
 attempts:for(const fraction of [1,.25,.0625,.015625]){const positions=[];
 for(const [i,p] of inset.positions.entries()){const point=stored(p.map((v,k)=>surface.positions[i][k]+(v-surface.positions[i][k])*fraction));if(inside(point)){positions.push(point.toArray());continue;}const {selected,position}=nearest(point);if(!selected)return null;const t=selected.triangle,n=t.getNormal(new T.Vector3()),step=Math.max(epsilon*8,Math.min(root.box.getSize(new T.Vector3()).length()*1e-5,t.a.distanceTo(t.b)*.005,t.b.distanceTo(t.c)*.005,t.c.distanceTo(t.a)*.005));let candidate=null;
  search:for(const blend of [.0001,.01,1]){const center=position.clone().lerp(selected.center,blend);for(const scale of [1,.1,.01])for(const sign of [-1,1]){const q=stored(center.clone().addScaledVector(n,step*scale*sign).toArray());if(inside(q)){candidate=q;break search;}}}
  if(!candidate)continue attempts;positions.push(candidate.toArray());
 }
 for(const triangle of surface.triangles){const [a,b,c]=triangle.map(v=>new T.Vector3(...positions[v])),next=b.sub(a).cross(c.sub(a)),[x,y,z]=triangle.map(v=>new T.Vector3(...surface.positions[v])),before=y.sub(x).cross(z.sub(x));if(next.lengthSq()<1e-18||before.dot(next)<=0)continue attempts;}
 return {...inset,positions};
 }
 return null;
}
// Fit only genuine boxes/rectangles. Testing all vertices prevents bounding boxes
// from silently sealing an arch, doorway, circular platform or hollow building.
// A rail/post may have an octagonal profile or a sloping cap. Fit a box entirely
// inside all outward face planes. A twisted profile still admits a safe box
// if its center lies in the kernel. Never use this for a walkable floor.
// ModelMunge may merge coplanar triangles into a polygon spanning a concavity
// or opening. Retain triangles for such faces; convex planar faces can optimize.
// WorldMunge converts world coordinates with Z reflected and maps its source
// rotation to Fz * R * Fx. MSH local coordinates therefore need Fx, so a model
// instance becomes Fz * (R * vertex + position), consistently for every object.
export function modelToSWBF(model){
 const point=p=>[-p[0],p[1],p[2]],rotation=q=>[q[0],-q[1],-q[2],q[3]],result={...model};
 if(model.position)result.position=point(model.position);if(model.rotation)result.rotation=rotation(model.rotation);
 if(model.segments)result.segments=model.segments.map(s=>({...s,positions:s.positions.map(point),normals:s.normals.map(point),triangles:s.triangles.map(t=>[t[0],t[2],t[1]])}));
 if(model.primitive)result.primitive={...model.primitive,position:point(model.primitive.position),rotation:rotation(model.primitive.rotation)};
 if(model.shadow){const positions=model.shadow.positions.map(point),triangles=[];for(let i=0;i<model.shadow.edges.length;i+=3)triangles.push([model.shadow.edges[i][0],model.shadow.edges[i+2][0],model.shadow.edges[i+1][0]]);result.shadow=closedShadow(positions,triangles);}
 return result;
}
