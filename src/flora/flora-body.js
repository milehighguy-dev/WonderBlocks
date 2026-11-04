import * as T from '../../vendor/three.module.js';
import {triTable} from '../../vendor/marching-cubes-table.js';
import {floraAsset} from './flora-palette.js';
import {FLORA_BODY_FIELDS,FLORA_BODY_EXTRAS} from './procedural-flora.js';
import {alignFloraBoneRotation,floraSkeletonPose,floraBoneFrameRotation} from './flora-skeleton.js';

const fields=new WeakMap(),meshes=new WeakMap(),v=a=>new T.Vector3(...a);
const extraTriangles=new Map();
export function floraBodyExtraTriangle(asset,mesh,triangle){if(!extraTriangles.has(asset)){const lookup=new Map();for(const extra of FLORA_BODY_EXTRAS[asset]||[])for(const face of extra.triangles)lookup.set(extra.mesh+':'+face,extra);extraTriangles.set(asset,lookup);}return extraTriangles.get(asset).get(mesh+':'+triangle)||null;}
export const floraBodyJointIds=id=>new Set((FLORA_BODY_FIELDS[id]||[]).flatMap(e=>[e.start,e.end]));
export function floraAssemblySurfaceParts(asset){const parts=new Map();for(const extra of FLORA_BODY_EXTRAS[asset]||[]){if(!parts.has(extra.asset))parts.set(extra.asset,new Set());parts.get(extra.asset).add(extra.block);}return [...parts].map(([asset,blocks])=>({asset,count:blocks.size}));}
export function floraBodyJointRadius(asset,joint){const radii=(FLORA_BODY_FIELDS[asset]||[]).flatMap(e=>[e.start===joint?e.radii?.[0]:0,e.end===joint?e.radii?.[1]:0]).filter(Number.isFinite);return Math.max(...radii,floraAsset(asset)?.skeleton?.find(n=>n.id===joint)?.radius*2||.015);}
export function floraBodyExtraMatrix(o,extra){
 const {start,end,t}=extra.binding,skeleton=floraAsset(o.asset).skeleton,a=skeleton.find(n=>n.id===start),b=skeleton.find(n=>n.id===end),ca=o.controls?.[start],cb=o.controls?.[end];
 const restA=v(a.point),restB=v(b.point),movedA=restA.clone().add(v(ca?.offset||[0,0,0])),movedB=restB.clone().add(v(cb?.offset||[0,0,0]));
 const center=restA.clone().lerp(restB,t),point=movedA.clone().lerp(movedB,t),scale=v(ca?.scale||[1,1,1]).lerp(v(cb?.scale||[1,1,1]),t),rotation=floraBoneFrameRotation(a,b,o.controls,t);
 // Joint scaling offsets a surface part from the bone; it does not
 // resize that part. Keep each original leaf rigid around its attachment.
 const pivot=v(extra.binding.point),moved=pivot.clone().sub(center).multiply(scale).applyQuaternion(rotation).add(point);
 return new T.Matrix4().compose(moved,rotation,new T.Vector3(1,1,1)).multiply(new T.Matrix4().makeTranslation(...pivot.negate().toArray()));
}
const nativeTriangleUvs=new WeakMap();
function partTriangleUvs(asset){
 if(!nativeTriangleUvs.has(asset))nativeTriangleUvs.set(asset,asset.meshes.flatMap(m=>m.indices.flatMap(i=>m.uv.slice(i*2,i*2+2))));
 return nativeTriangleUvs.get(asset);
}
export function floraBodyExtras(o){return (FLORA_BODY_EXTRAS[o.asset]||[]).map((extra,i)=>{
 const source=floraAsset(o.asset).meshes[extra.mesh],nativeUv=partTriangleUvs(floraAsset(extra.asset)),map=new Map(),positions=[],uv=[],indices=[];
 for(const [corner,old] of extra.indices.entries()){
  // Compound bodies store their decorations alongside the wood. Retain each
  // decoration's own material and UVs in its source triangle order.
  const at=extra.sourceTriangles[Math.floor(corner/3)]*6+(corner%3)*2,key=old+':'+nativeUv[at]+':'+nativeUv[at+1];
  if(!map.has(key)){map.set(key,positions.length/3);positions.push(...source.positions.slice(old*3,old*3+3));uv.push(nativeUv[at],nativeUv[at+1]);}
  indices.push(map.get(key));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.applyMatrix4(floraBodyExtraMatrix(o,extra));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.floraBodyExtra=i;g.userData.floraAsset=extra.asset;g.userData.floraAssemblyBlock=extra.block;g.userData.floraBodyExtraPin={mesh:extra.mesh,triangles:extra.triangles};return g;
});}
export function floraBodyExtraPin(o,pin){const extra=floraBodyExtraTriangle(o.asset,pin.mesh,pin.triangle);if(!extra)return null;const source=floraAsset(o.asset).meshes[pin.mesh],matrix=floraBodyExtraMatrix(o,extra),points=source.indices.slice(pin.triangle*3,pin.triangle*3+3).map(i=>new T.Vector3().fromArray(source.positions,i*3).applyMatrix4(matrix)),point=new T.Vector3();for(let i=0;i<3;i++)point.addScaledVector(points[i],pin.bary[i]);return {point,normal:points[1].sub(points[0]).cross(points[2].sub(points[0])).normalize()};}
export function floraBodyPinSurface(o,pin,joins=[]){const extra=floraBodyExtraPin(o,pin);if(extra)return extra;const asset=floraAsset(o.asset),source=asset.meshes[pin.mesh],point=new T.Vector3();for(let i=0;i<3;i++)point.addScaledVector(new T.Vector3().fromArray(source.positions,source.indices[pin.triangle*3+i]*3),pin.bary[i]);return floraBodySurface(o,floraSkeletonPose(asset.skeleton,o.controls,point.toArray()).point,joins);}
const smoothMin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
export function floraBodyField(o,joins=[]){
 const asset=floraAsset(o.asset),key=JSON.stringify([o.asset,o.controls,o.morphs,joins]);if(fields.get(o)?.key===key)return fields.get(o);
 if(!asset?.skeleton||!FLORA_BODY_FIELDS[o.asset])return null;
 const poses=new Map(asset.skeleton.map(n=>{const c=o.controls?.[n.id];return [n.id,{rest:v(n.point),point:v(n.point).add(v(c?.offset||[0,0,0])),radius:n.radius*2,scale:Math.cbrt((c?.scale||[1,1,1]).reduce((a,b)=>a*b,1)),rotation:new T.Quaternion().setFromEuler(new T.Euler(...(c?.rotation||[0,0,0])))}];}));
 const groups=[],box=new T.Box3(),radiusFloor=Math.max(1e-6,.015*Math.min(1,...[...poses.values()].map(n=>n.scale)));let minRadius=Infinity;
 for(const edge of FLORA_BODY_FIELDS[o.asset]){
  const a=poses.get(edge.start),b=poses.get(edge.end),rest=b.rest.clone().sub(a.rest),delta=b.point.clone().sub(a.point),rotation=alignFloraBoneRotation(a.rotation.clone().slerp(b.rotation,.5),rest,delta),radii=edge.radii||[a.radius,b.radius],caps=[],bounds=new T.Box3();
  for(const samples of edge.groups){let prior=null;
   for(const sample of samples){const t=T.MathUtils.clamp(sample.t,0,1),girth=T.MathUtils.lerp(radii[0]*a.scale,radii[1]*b.scale,t),r=Math.max(radiusFloor,girth*sample.radius),p=a.point.clone().lerp(b.point,sample.t).add(v(sample.offset).multiplyScalar(girth/.1).applyQuaternion(rotation));
    minRadius=Math.min(minRadius,r);bounds.expandByPoint(p.clone().addScalar(r));bounds.expandByPoint(p.clone().addScalar(-r));
    if(prior){const d=p.clone().sub(prior.p);caps.push({x:prior.p.x,y:prior.p.y,z:prior.p.z,dx:d.x,dy:d.y,dz:d.z,length:d.lengthSq(),r:prior.r,dr:r-prior.r});}prior={p,r};
   }
  }
  // Explicit end nodes keep even a folded muscle connected to both joints.
  for(const [i,n] of [a,b].entries()){const r=Math.max(radiusFloor,radii[i]*n.scale);caps.push({x:n.point.x,y:n.point.y,z:n.point.z,dx:0,dy:0,dz:0,length:0,r,dr:0});bounds.expandByPoint(n.point.clone().addScalar(r));bounds.expandByPoint(n.point.clone().addScalar(-r));}
  groups.push({caps,box:bounds});box.union(bounds);
 }
 const blend=Math.max(radiusFloor*5/3,Math.min(.22,...[...poses.values()].map(n=>n.radius*n.scale))*.6);
 for(const group of groups){group.box.expandByScalar(blend*2);for(const c of group.caps){const pad=Math.max(c.r,c.r+c.dr)+blend*2;Object.assign(c,{minX:Math.min(c.x,c.x+c.dx)-pad,maxX:Math.max(c.x,c.x+c.dx)+pad,minY:Math.min(c.y,c.y+c.dy)-pad,maxY:Math.max(c.y,c.y+c.dy)+pad,minZ:Math.min(c.z,c.z+c.dz)-pad,maxZ:Math.max(c.z,c.z+c.dz)+pad});}}box.expandByScalar(blend*2);
 function distance(x,y,z,cull=true){let d=1e4;for(const group of groups){const b=group.box;if(cull&&(x<b.min.x||x>b.max.x||y<b.min.y||y>b.max.y||z<b.min.z||z>b.max.z))continue;let local=1e4;for(const c of group.caps){if(cull&&(x<c.minX||x>c.maxX||y<c.minY||y>c.maxY||z<c.minZ||z>c.maxZ))continue;const dx=x-c.x,dy=y-c.y,dz=z-c.z,t=c.length?Math.max(0,Math.min(1,(dx*c.dx+dy*c.dy+dz*c.dz)/c.length)):0;const px=dx-c.dx*t,py=dy-c.dy*t,pz=dz-c.dz*t;local=Math.min(local,Math.sqrt(px*px+py*py+pz*pz)-(c.r+c.dr*t));}d=smoothMin(d,local,blend);}return d;}
 // A continued endpoint is an internal section, not a closed hemispherical tip.
 // Restrict each cut to the joint neighbourhood so other folded limbs survive.
 const sections=joins.map(join=>{const pose=poses.get(join.joint);return {point:pose.point,normal:v(join.normal).multiplyScalar(join.start?-1:1),extent:floraBodyJointRadius(o.asset,join.joint)*pose.scale*3};});
 const joinedDistance=(x,y,z,cull=true)=>{let d=distance(x,y,z,cull);for(const s of sections){const dx=x-s.point.x,dy=y-s.point.y,dz=z-s.point.z,plane=dx*s.normal.x+dy*s.normal.y+dz*s.normal.z;d=Math.max(d,Math.min(plane,s.extent-Math.hypot(dx,dy,dz)));}return d;};
 const field={key,box,minRadius,groups,distance:sections.length?joinedDistance:distance};fields.set(o,field);return field;
}

// Dense typed grids are small for an individual part and avoid map/string work
// in the pointer loop. The same volume and resolution are used while dragging.
export function floraBodyGeometry(o,detail='standard',joins=[]){
 const field=floraBodyField(o,joins);if(!field)return null;const old=meshes.get(o);if(old?.key===field.key&&old.detail===detail)return old.geometry.clone();
 const box=field.box,span=box.getSize(new T.Vector3());let step=Math.max(.018,field.minRadius/(detail==='low'?1.6:2.5),Math.max(...span.toArray())/100),size;
 do{size=span.toArray().map(n=>Math.ceil(n/step)+3);if(size.reduce((a,b)=>a*b,1)<=(detail==='low'?28000:65000))break;step*=1.15;}while(true);
 const [nx,ny,nz]=size,xy=nx*ny,origin=box.min.clone().addScalar(-step),values=new Float32Array(nx*ny*nz),edgeCache=new Int32Array(values.length*3).fill(-1),positions=[],indices=[];
 let index=0;for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[index++]=field.distance(origin.x+x*step,origin.y+y*step,origin.z+z*step);
 const offsets=[0,1,1+nx,nx,xy,1+xy,1+nx+xy,nx+xy],edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],edgeDirection=[0,1,0,1,0,1,0,1,2,2,2,2];
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const base=x+y*nx+z*xy;let mask=0;for(let i=0;i<8;i++)if(values[base+offsets[i]]<0)mask|=1<<i;if(mask===0||mask===255)continue;
  for(let i=mask*16;triTable[i]!==-1;i+=3)for(const j of [0,2,1]){const edge=triTable[i+j],ids=edges[edge],a=base+offsets[ids[0]],b=base+offsets[ids[1]],lo=Math.min(a,b),hi=Math.max(a,b),key=lo*3+edgeDirection[edge];let vertex=edgeCache[key];
   if(vertex<0){const t=T.MathUtils.clamp(values[lo]/(values[lo]-values[hi]),1e-5,1-1e-5),iz=Math.floor(lo/xy),iy=Math.floor((lo-iz*xy)/nx),ix=lo%nx,dir=edgeDirection[edge];vertex=positions.length/3;edgeCache[key]=vertex;positions.push(origin.x+(ix+(dir===0?t:0))*step,origin.y+(iy+(dir===1?t:0))*step,origin.z+(iz+(dir===2?t:0))*step);}indices.push(vertex);
  }
 }
 const uv=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i],positions[i+1]);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.floraBodyVolume=true;g.userData.skinStep=step;
 old?.geometry.dispose();meshes.set(o,{key:field.key,detail,geometry:g.clone()});return g;
}

export function floraBodySurface(o,point,joins=[]){
 const field=floraBodyField(o,joins),p=point.clone(),n=new T.Vector3(),eps=.002;
 if(!field)return {point:p,normal:new T.Vector3(0,1,0)};
 // Source triangle pins remain stable in files; project their deformed target
 // onto the newly generated skin instead of leaving decorations inside it.
 const distance=(x,y,z)=>field.distance(x,y,z,false);
 for(let i=0;i<32;i++){const d=distance(p.x,p.y,p.z);n.set(distance(p.x+eps,p.y,p.z)-distance(p.x-eps,p.y,p.z),distance(p.x,p.y+eps,p.z)-distance(p.x,p.y-eps,p.z),distance(p.x,p.y,p.z+eps)-distance(p.x,p.y,p.z-eps)).normalize();if(!n.lengthSq())n.set(0,1,0);p.addScaledVector(n,-d);if(Math.abs(d)<.0001)break;}
 return {point:p,normal:n};
}
