import * as T from '../../vendor/three.module.js';
import {crc32} from './swbf2-binary.js';

export function nativeLeafClusterKey(mesh,bytes){
 const s=mesh.geometry.userData.billboard.settings,shape=['count','radius','height','minSize','maxSize','heightScale','anchor','atlas','darknessMin','darknessMax'].map(k=>s[k]??null);
 return crc32(new TextEncoder().encode(JSON.stringify([crc32(bytes),shape]))).toString(16).padStart(8,'0');
}

// Native patches sample cylinders, not arbitrary unions of authored crowns.
// Only combine overlapping clouds when the replacement adds little empty space.
// Fixed baked cards and hanging sprays keep their authored attachment frames.
export function compactLeafPatches(leaves,{maxParticles=192,target=4,maxExpansion=1.35}={}){
 const buckets=new Map();
 for(const leaf of leaves){
  const d=leaf.fields,key=[d.texture,d.heightScale.toFixed(3),d.atlas,d.facing??'camera',d.anchor??'center',Math.round(Math.log2(Math.max(.001,d.minSize))*2)].join('|');
  if(!buckets.has(key))buckets.set(key,[]);
  const q=new T.Quaternion(...leaf.rotation),c=new T.Vector3(...leaf.position),box=new T.Box3();
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])box.expandByPoint(new T.Vector3(x*d.radius,d.offset+y*d.height/2,z*d.radius).applyQuaternion(q).add(c));
  buckets.get(key).push({members:[leaf],box,count:d.count});
 }
 const result=[];let remaining=leaves.length;
 for(const groups of buckets.values()){
  while(remaining>target){
   let pair=null,best=Infinity;
   for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
    const a=groups[i],b=groups[j];if(a.count+b.count>maxParticles)continue;
    const defs=[...a.members,...b.members].map(l=>l.fields);
    if(defs.some(d=>d.count===1||d.heightScale>1.5||d.facing==='upright'||d.anchor==='top'))continue;
    if(!a.box.intersectsBox(b.box))continue;
    const union=a.box.clone().union(b.box),half=union.getSize(new T.Vector3()).multiplyScalar(.5),radius=Math.hypot(half.x,half.z),cylinder=Math.PI*radius*radius*Math.max(.002,half.y*2);
    // Use the source sampling envelopes, not their outer rectangular corners.
    const volume=[...a.members,...b.members].reduce((n,l)=>n+Math.PI*l.fields.radius**2*Math.max(.002,l.fields.height),0);
    if(cylinder>volume*maxExpansion)continue;
    const distance=a.box.getCenter(new T.Vector3()).distanceToSquared(b.box.getCenter(new T.Vector3()));
    if(distance<best){best=distance;pair=[i,j];}
   }
   if(!pair)break;
   const [i,j]=pair;groups[i]={members:[...groups[i].members,...groups[j].members],box:groups[i].box.clone().union(groups[j].box),count:groups[i].count+groups[j].count};groups.splice(j,1);remaining--;
  }
  for(const group of groups){
   if(group.members.length===1){result.push(group.members[0]);continue;}
   const center=group.box.getCenter(new T.Vector3()),half=group.box.getSize(new T.Vector3()).multiplyScalar(.5),defs=group.members.map(l=>l.fields),d=defs[0];
   result.push({position:center.toArray(),rotation:[0,0,0,1],fields:{...d,count:group.count,radius:Math.max(.001,Math.hypot(half.x,half.z)),height:half.y*2,offset:0,minSize:Math.min(...defs.map(x=>x.minSize)),maxSize:Math.max(...defs.map(x=>x.maxSize)),darknessMin:Math.min(...defs.map(x=>x.darknessMin)),darknessMax:Math.max(...defs.map(x=>x.darknessMax))}});
  }
 }
 return result;
}

// A canopy bake is tied to the actual local crown, including its texture and
// size. A stale bake must never silently replace a newly edited tree.
export function treeCanopySignature(leaves){
 const source=leaves.map(l=>({position:l.position,rotation:l.rotation,fields:l.fields}));
 const text=JSON.stringify(source,(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v);
 return crc32(new TextEncoder().encode(text)).toString(16).padStart(8,'0');
}

export function canopyZoneGroups(leaves,target=4){
 if(!Number.isInteger(target)||target<1||target>8)throw Error('Choose 1–8 canopy zones.');
 if(!leaves.length)return [];
 // Spatial splitting retains separate bough tiers and different crown regions.
 // Every original patch belongs to exactly one zone; nothing is discarded.
 const groups=[leaves.map((_,i)=>i)];
 while(groups.length<target){
  let candidate=-1,axis=0,extent=-1;
  for(const [i,group] of groups.entries())if(group.length>1){
   const box=new T.Box3().setFromPoints(group.map(j=>new T.Vector3(...leaves[j].position))),size=box.getSize(new T.Vector3()).toArray(),largest=Math.max(...size);
   if(largest>extent){extent=largest;candidate=i;axis=size.indexOf(largest);}
  }
  if(candidate<0)break;
  const sorted=[...groups[candidate]].sort((a,b)=>leaves[a].position[axis]-leaves[b].position[axis]||a-b),at=Math.ceil(sorted.length/2);
  groups.splice(candidate,1,sorted.slice(0,at),sorted.slice(at));
 }
 return groups;
}

export function applyTreeCanopy(leaves,bake,textureName){
 if(!bake||bake.sourceSignature!==treeCanopySignature(leaves))throw Error('Canopy bake no longer matches this crown. Bake it again after editing the tree or changing texture resolution.');
 if(!Array.isArray(bake.zones)||!bake.zones.length||bake.zones.length>8)throw Error('A canopy bake needs 1–8 zones.');
 const seen=new Set();
 const result=bake.zones.map(zone=>{
  if(!Array.isArray(zone.sources)||!zone.sources.length||zone.sources.some(i=>!Number.isInteger(i)||i<0||i>=leaves.length||seen.has(i)))throw Error('Invalid or repeated canopy source patch.');
  for(const i of zone.sources){if(seen.has(i))throw Error('Repeated canopy source patch.');seen.add(i);}
  if(!(zone.bytes instanceof Uint8Array)||zone.bytes.length<18||!Number.isFinite(zone.width)||!Number.isFinite(zone.height)||zone.width<=0||zone.height<=0||zone.center?.length!==3||!zone.center.every(Number.isFinite))throw Error('Invalid canopy zone image or bounds.');
  const d=leaves[zone.sources[0]].fields;
  return {position:[...zone.center],rotation:[0,0,0,1],fields:{...d,texture:textureName(zone.bytes),count:1,radius:.001,height:0,offset:0,minSize:zone.width,maxSize:zone.width,heightScale:zone.height/zone.width,darknessMin:1,darknessMax:1,atlas:2,facing:'camera',anchor:'center'}};
 });
 if(seen.size!==leaves.length)throw Error('Canopy bake is missing source patches.');
 return result;
}

export function treeSpriteSegments(bounds,material,{overhead=false,canopyHeight}={}){
 // ModelMunge flips V for native sampling. Source V=1 belongs at the canopy
 // top; atlas packing separately converts its top-down image row offsets.
 const [min,max]=[bounds.min,bounds.max],cx=(min[0]+max[0])/2,cz=(min[2]+max[2])/2,width=Math.max(max[0]-min[0],max[2]-min[2]);
 const result=[0,1].map(axis=>({material,positions:axis===0?[[cx-width/2,min[1],cz],[cx+width/2,min[1],cz],[cx+width/2,max[1],cz],[cx-width/2,max[1],cz]]:[[cx,min[1],cz-width/2],[cx,min[1],cz+width/2],[cx,max[1],cz+width/2],[cx,max[1],cz-width/2]],normals:Array.from({length:4},()=>axis===0?[0,0,1]:[1,0,0]),uvs:[[axis/2,0],[(axis+1)/2,0],[(axis+1)/2,1],[axis/2,1]],triangles:[[0,1,2],[0,2,3]]}));
 if(overhead){
  if(!Number.isFinite(canopyHeight)||canopyHeight<min[1]||canopyHeight>max[1])throw Error('Invalid overhead canopy height.');
  for(const segment of result)segment.uvs=segment.uvs.map(([u,v])=>[u/2,v]);
  result.push({material,positions:[[min[0],canopyHeight,min[2]],[max[0],canopyHeight,min[2]],[max[0],canopyHeight,max[2]],[min[0],canopyHeight,max[2]]],normals:Array.from({length:4},()=>[0,1,0]),uvs:[[.5,1],[.75,1],[.75,0],[.5,0]],triangles:[[0,2,1],[0,3,2]]});
 }
 return result;
}

export function treeAtlasUV([u,v],[x,y,width,height]){return [x+u*width,1-y-height+v*height];}
