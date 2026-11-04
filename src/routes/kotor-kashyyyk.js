import * as T from '../../vendor/three.module.js';
import {KOTOR_KASHYYYK_SOURCE as source} from './data/kotor-kashyyyk-source.js';
import {kotorTexture} from '../materials/kotor-kashyyyk-textures.js';
import {landingRailEdges} from './railings.js';
import {weldSurface,assertClosedSurface} from '../collision/collision-geometry.js';

export const KOTOR_KASHYYYK_STYLE='kotor-kashyyyk';
export const kotorRailingDefaults=()=>({style:KOTOR_KASHYYYK_STYLE,sides:'both',height:1.2,spacing:2.8,postWidth:.185,railWidth:.15,railHeight:.15,color:'#ffffff',surface:{preset:'plain',scale:1}});
export const kotorPlatformDefaults=()=>({style:KOTOR_KASHYYYK_STYLE,railing:KOTOR_KASHYYYK_STYLE,railHeight:1.2,thickness:.5,supports:false});
const material=(texture,color='#ffffff')=>new T.MeshStandardMaterial({color,map:kotorTexture(texture),roughness:.9,metalness:0});

export const KOTOR_LIP={height:.1,width:.42};
const pointKey=p=>p.toArray().map(v=>v.toFixed(4)).join(',');
const variation=(p,salt)=>{let hash=2166136261;for(const c of pointKey(p)+':'+salt)hash=Math.imul(hash^c.charCodeAt(0),16777619);hash=Math.imul(hash^(hash>>>16),0x85ebca6b);hash=Math.imul(hash^(hash>>>13),0xc2b2ae35);return ((hash^(hash>>>16))>>>0)/4294967295;};

// Sample the whole perimeter rather than planting a post on every circle
// tessellation edge. Corners and open ends stay anchored; each bay is unequal.
export function kotorRailLayout(spans,spacing=2.8){
 const remaining=spans.map(([a,b])=>[a.clone(),b.clone()]),runs=[];
 while(remaining.length){
  const degree=p=>remaining.reduce((n,e)=>n+e.filter(q=>q.distanceTo(p)<1e-5).length,0),first=remaining.findIndex(e=>e.some(p=>degree(p)===1)),edge=remaining.splice(first<0?0:first,1)[0];
  if(first>=0&&remaining.some(e=>e.some(p=>p.distanceTo(edge[0])<1e-5)))edge.reverse();
  const chain=[edge];for(;;){const end=chain.at(-1)[1],i=remaining.findIndex(e=>e.some(p=>p.distanceTo(end)<1e-5));if(i<0)break;const next=remaining.splice(i,1)[0];if(next[1].distanceTo(end)<1e-5)next.reverse();chain.push(next);}
  const distances=[0];for(const [a,b] of chain)distances.push(distances.at(-1)+Math.hypot(b.x-a.x,b.z-a.z));
  const total=distances.at(-1);if(total<1e-5)continue;
  const at=d=>{let i=distances.findIndex((v,k)=>k>0&&v>=d-1e-7)-1;if(i<0)i=chain.length-1;return chain[i][0].clone().lerp(chain[i][1],T.MathUtils.clamp((d-distances[i])/(distances[i+1]-distances[i]),0,1));};
  const pinned=[0];for(let i=1;i<chain.length;i++)if(chain[i-1][1].clone().sub(chain[i-1][0]).normalize().dot(chain[i][1].clone().sub(chain[i][0]).normalize())<Math.cos(Math.PI/6))pinned.push(distances[i]);pinned.push(total);
  const stations=[0];for(let i=1;i<pinned.length;i++){const lo=pinned[i-1],length=pinned[i]-lo,count=Math.max(1,Math.ceil(length/spacing)),weights=Array.from({length:count},(_,j)=>.65+variation(at(lo),'gap'+j)*.7),sum=weights.reduce((a,b)=>a+b,0);let d=lo;for(const w of weights){d+=length*w/sum;stations.push(d);}}
  const nodes=stations.map(d=>{const point=at(d);return {point,d,height:.82+.36*variation(point,'height'),rail:.57+.18*variation(point,'rail'),width:.9+.2*variation(point,'width')};});
  const bays=[];for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],cuts=[a.d,...distances.filter(d=>d>a.d+1e-6&&d<b.d-1e-6),b.d];for(let j=1;j<cuts.length;j++)bays.push({a:at(cuts[j-1]),b:at(cuts[j]),from:a,to:b,t0:(cuts[j-1]-a.d)/(b.d-a.d),t1:(cuts[j]-a.d)/(b.d-a.d),capStart:i===1&&j===1,capEnd:i===nodes.length-1&&j===cuts.length-1});}
  runs.push({nodes,bays,closed:chain[0][0].distanceTo(chain.at(-1)[1])<1e-5});
 }
 return runs;
}

// Posts stand on a raised, inset wooden curb, including at curved corners.
// Miter the inner boundary so neighbouring lip faces meet without overlap.
export function buildKotorRails(group,spans,options={}){
 const r={...kotorRailingDefaults(),...options},materials=new Map(),seen=new Set(),lip=KOTOR_LIP;
 const add=(g,texture,kind)=>{const key=texture+kind;if(!materials.has(key)){const mat=material(texture,kind==='deck'?'#ffffff':r.color);mat.userData.railing=kind!=='deck';materials.set(key,mat);}g.userData.bridgePart=kind;const m=new T.Mesh(g,materials.get(key));m.userData.railing=kind!=='deck';m.userData.routePost=kind==='posts';m.userData.routeSegment=options.segment;if(kind==='deck'){m.userData.kotorLip=true;g.userData.platformPart=options.platform?'deck':undefined;}m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 function profile(part,transform,kind,{face=()=>true,uvTransform=(u,v)=>[u,v],reverseWinding=false}={}){const g=new T.BufferGeometry(),positions=[],uv=[];for(let i=0;i<part.positions.length;i+=9){if(!face(i))continue;for(const j of reverseWinding?[0,2,1]:[0,1,2]){const k=i+j*3;positions.push(...transform(new T.Vector3(...part.positions.slice(k,k+3))).toArray());uv.push(...uvTransform(part.uv[k/3*2],part.uv[k/3*2+1],part.positions[k+2]));}}if(!positions.length){g.dispose();return;}g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return add(g,part.texture,kind);}
 const edges=spans.filter(([a,b])=>a.distanceTo(b)>1e-5).map(span=>({a:span[0],b:span[1],inward:span.inward?.clone()??new T.Vector3(-(span[1].z-span[0].z),0,span[1].x-span[0].x).normalize()}));
 const offset=(edge,p)=>{const other=edges.find(e=>e!==edge&&(e.a.distanceTo(p)<1e-5||e.b.distanceTo(p)<1e-5)),n=edge.inward;if(!other)return n.clone().multiplyScalar(lip.width);return n.clone().add(other.inward).multiplyScalar(lip.width/Math.max(.5,1+n.dot(other.inward)));};
 const centers=[];for(const edge of edges){const ia=edge.a.clone().add(offset(edge,edge.a)),ib=edge.b.clone().add(offset(edge,edge.b)),vertices=[edge.a,edge.b,ib,ia].map(p=>p.clone()),bottom=vertices.map(p=>p.clone()),top=vertices.map(p=>p.clone().add(new T.Vector3(0,lip.height,0))),all=[...bottom,...top],center=all.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(1/8),positions=[],uv=[];
  for(const face of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]){const points=face.map(i=>all[i]),normal=T.Triangle.getNormal(...points.slice(0,3),new T.Vector3()),mid=points.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(.25);if(normal.dot(mid.sub(center))<0)face.reverse();const horizontal=points.find(p=>Math.hypot(p.x-points[0].x,p.z-points[0].z)>1e-5).clone().sub(points[0]).setY(0).normalize(),low=Math.min(...points.map(p=>p.y));for(const i of [0,1,2,0,2,3]){const k=face[i],p=all[k],along=k%4===1||k%4===2?edge.a.distanceTo(edge.b):0;positions.push(...p.toArray());uv.push(...(Math.abs(normal.y)>.5?[along/1.6,k%4>=2?.235:0]:[p.clone().sub(points[0]).dot(horizontal)/1.6,(p.y-low)/.6]));}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();add(g,'lka_wall06','deck');centers.push([edge.a.clone().lerp(ia,.5),edge.b.clone().lerp(ib,.5)]);
 }
 // Native post caps have tiny seam offsets and no underside. Close only these
 // known rail profiles for export helpers; visible geometry and UVs stay intact.
 const volume=(parts,transform,reverseShell=false)=>{const points=[],triangles=[];for(const [index,part] of parts.entries())for(let i=0;i<part.positions.length;i+=9){const face=[];for(let j=0;j<3;j++){const p=new T.Vector3(...part.positions.slice(i+j*3,i+j*3+3));let at=points.findIndex(q=>q.distanceTo(p)<.0001);if(at<0){at=points.length;points.push(p);}face.push(at);}triangles.push(reverseShell&&index===0?[face[0],face[2],face[1]]:face);}
  const edges=new Map();for(const t of triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],key=Math.min(a,b)+','+Math.max(a,b);if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}const boundary=[...edges.values()];while(boundary.length){const first=boundary.pop(),loop=[first[0],first[1]];while(loop.at(-1)!==loop[0]){const at=boundary.findIndex(e=>e[0]===loop.at(-1));if(at<0)break;loop.push(boundary.splice(at,1)[0][1]);}if(loop.at(-1)!==loop[0])continue;loop.pop();const center=points.length;points.push(loop.reduce((p,i)=>p.add(points[i]),new T.Vector3()).multiplyScalar(1/loop.length));for(let i=0;i<loop.length;i++)triangles.push([center,loop[(i+1)%loop.length],loop[i]]);}
  return {positions:points.map(p=>transform(p.clone()).toArray()),triangles};};
 const shell=source.rail[0],average=end=>{const uv=[0,0];let count=0;for(let i=0;i<shell.positions.length;i+=3)if(shell.positions[i+2]===end){uv[0]+=shell.uv[i/3*2];uv[1]+=shell.uv[i/3*2+1];count++;}return uv.map(v=>v/count);},u0=average(0),u1=average(1);
 for(const run of kotorRailLayout(centers,r.spacing)){
  for(const node of run.nodes){const p=node.point,key=pointKey(p);if(seen.has(key))continue;seen.add(key);const base=(options.groundAt?.(p)??p.y)+lip.height,origin=p.clone().setY(base),height=r.height*node.height+p.y+lip.height-base;const transform=v=>v.set(v.x*r.postWidth*node.width/source.postWidth,v.y*height,v.z*r.postWidth*node.width/source.postWidth).add(origin),solid=volume(source.post,transform);for(const part of source.post){const m=profile(part,transform,'posts');m.userData.kotorPost={base:origin.toArray(),height};m.userData.structuralVolume=solid;}}
  // One handrail joins each pair of irregular posts. Each bay follows its
  // neighbours' attachment heights instead of creating two level fence bars.
  for(const bay of run.bays){const a=bay.a.clone(),b=bay.b.clone(),h0=r.height*bay.from.rail,h1=r.height*bay.to.rail;a.y+=lip.height+T.MathUtils.lerp(h0,h1,bay.t0);b.y+=lip.height+T.MathUtils.lerp(h0,h1,bay.t1);const d=b.clone().sub(a),length=Math.hypot(d.x,d.z),normal=new T.Vector3(d.z,0,-d.x).normalize(),repeat=length/source.railLength;
   // The imported side shell is wound inward; caps and posts are already outward.
   // Reverse triangle vertices together with their UVs before computing normals.
   const transform=v=>a.clone().addScaledVector(d,v.z).addScaledVector(normal,v.x*r.railWidth/.15).add(new T.Vector3(0,v.y*r.railHeight/.15,0)),solid=volume(source.rail,transform,true);for(const [index,part] of source.rail.entries()){const m=profile(part,transform,'rails',{reverseWinding:index===0,face:i=>!index||!run.closed&&(part.positions[i+2]===0?bay.capStart:bay.capEnd),uvTransform:(u,v,z)=>index?[u,v]:[u+(repeat-1)*z*(u1[0]-u0[0]),v+(repeat-1)*z*(u1[1]-u0[1])]});if(m)m.userData.structuralVolume=solid;}
  }
 }
}

// One closed floor shell, split into finishable deck and fascia / underside.
// Avoid layering an imported floor over the existing walkable route surface.
export function applyKotorDeck(group,accept,{platform=false}={}){
 for(const mesh of [...group.children]){
  if(!mesh.isMesh||!accept(mesh))continue;
  const old=mesh.geometry,g=old.index?old.toNonIndexed():old,pos=g.attributes.position,buckets={deck:[],underbody:[]};
  // Retain the complete construction shell across the two material meshes.
  // Neither the top nor the underside is a closed shadow caster on its own.
  let volume=weldSurface([{positions:Array.from({length:pos.count},(_,i)=>[pos.getX(i),pos.getY(i),pos.getZ(i)]),triangles:Array.from({length:pos.count/3},(_,i)=>[i*3,i*3+1,i*3+2])}]);
  try{assertClosedSurface(volume);}catch{volume=null;} // Stairs use their closed movement ramp at export.
  for(let i=0;i<pos.count;i+=3){const a=new T.Vector3().fromBufferAttribute(pos,i),b=new T.Vector3().fromBufferAttribute(pos,i+1),c=new T.Vector3().fromBufferAttribute(pos,i+2),key=T.Triangle.getNormal(a,b,c,new T.Vector3()).y>.5?'deck':'underbody';buckets[key].push(i,i+1,i+2);}
  for(const [key,ids] of Object.entries(buckets)){
   if(!ids.length)continue;const geometry=new T.BufferGeometry();geometry.userData={...old.userData};
   for(const [name,attr] of Object.entries(g.attributes)){const values=[];for(const i of ids)for(let j=0;j<attr.itemSize;j++)values.push(attr.array[i*attr.itemSize+j]);geometry.setAttribute(name,new T.Float32BufferAttribute(values,attr.itemSize));}
   const p=geometry.attributes.position,n=geometry.attributes.normal,uv=[];
   // Four-metre woven mats; the fascia repeats longitudinally instead of
   // stretching one texture across the entire walkway or platform perimeter.
   for(let i=0;i<p.count;i++){if(key==='deck')uv.push(p.getX(i)/4,p.getZ(i)/4);else if(Math.abs(n?.getY(i)??0)>.5)uv.push(p.getX(i)/2,p.getZ(i)/2);else {const side=Math.abs(n?.getX(i)??0)>.5;uv.push((side?p.getZ(i):p.getX(i))/2,p.getY(i));}}
   geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
   if(old.userData.groundVertices)geometry.userData.groundVertices=ids.map(i=>old.userData.groundVertices[i]);
   if(old.userData.groundSources)geometry.userData.groundSources=ids.map(i=>old.userData.groundSources[i]);
   geometry.userData.bridgePart=key;if(platform)geometry.userData.platformPart=key==='deck'?'deck':'body';
   const copy=mesh.clone(false);copy.geometry=geometry;if(volume)copy.userData.structuralVolume=volume;copy.material=material(key==='deck'?'lka_wall01':'lka_wall06',mesh.material.color.getHexString()==='ffffff'?'#ffffff':'#'+mesh.material.color.getHexString());copy.material.userData.kotorPart=key;group.add(copy);
  }
  group.remove(mesh);old.dispose();if(g!==old)g.dispose();
 }
}

export function buildKotorPlatformBands(group,loops){
 const all=loops.flat(),lo=Math.min(...all.map(p=>p.z)),hi=Math.max(...all.map(p=>p.z));
 for(let z=Math.ceil((lo+.2)/4)*4;z<hi-.2;z+=4){
  const cuts=[];for(const loop of loops)for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];if((a.z>z)!==(b.z>z))cuts.push(a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z));}
  cuts.sort((a,b)=>a-b);
  for(let i=0;i+1<cuts.length;i+=2){const width=cuts[i+1]-cuts[i]-.16;if(width<=.1)continue;const g=new T.BoxGeometry(width,.022,.14);g.translate((cuts[i]+cuts[i+1])/2,.011,z);g.userData.platformPart='deck';const m=new T.Mesh(g,material('lka_hrdwd02'));m.castShadow=m.receiveShadow=true;group.add(m);}
 }
}

export function buildKotorWalkways(group,part,layout){
 const indices=new Set(layout.filter(l=>!l.segment.hallway&&l.segment.railing?.style===KOTOR_KASHYYYK_STYLE).map(l=>l.index));
 if(!indices.size)return;
 applyKotorDeck(group,m=>m.userData.routeFloor&&indices.has(m.userData.routeSegment));
 for(const l of layout){if(!indices.has(l.index))continue;const s=l.segment,r={...kotorRailingDefaults(),...s.railing},height=z=>s.kind==='landing'?0:s.kind==='stairs'?Math.min(s.steps,Math.max(0,Math.floor(z/s.run*s.steps)+(s.rise<0?0:1)))*s.rise/s.steps:s.rise*z/s.run;
  const world=(x,y,z)=>new T.Vector3(l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1]+y,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z),spans=[];
  const line=z=>s.kind==='landing'?0:s.rise*z/s.run;
  for(const e of landingRailEdges(part.route,l,l.index))if(r.sides==='both'||e.side===r.sides){const span=[world(e.a[0],line(e.a[1]),e.a[1]),world(e.b[0],line(e.b[1]),e.b[1])],out=e.out??(e.a[0]===e.b[0]?[e.side==='left'?1:-1,0]:[0,e.a[1]===0?-1:1]);span.inward=world(-out[0],0,-out[1]).sub(world(0,0,0)).normalize();spans.push(span);}
  buildKotorRails(group,spans,{...r,segment:l.index,groundAt:s.kind==='stairs'?p=>l.start[1]+height((p.x-l.start[0])*Math.sin(l.heading)+(p.z-l.start[2])*Math.cos(l.heading)):null});
  // Original dark transverse timber dividers, slightly proud of the mat.
  // The outer edge defines the fascia; there are no exposed spikes below it.
  if(s.kind==='landing'&&s.turn==='straight')for(let z=4;z<s.run-.2;z+=4){const g=new T.BoxGeometry(l.width,.022,.14);g.translate(0,.011,z);g.rotateY(l.heading);g.translate(...l.start);g.userData.bridgePart='deck';const m=new T.Mesh(g,material('lka_hrdwd02'));m.userData.routeSegment=l.index;m.castShadow=m.receiveShadow=true;group.add(m);}
 }
}
