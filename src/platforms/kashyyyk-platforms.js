import * as T from '../../vendor/three.module.js';
import {KASHYYYK_PLATFORMS} from './data/kashyyyk-platform-source.js';
import {platformTexture} from '../materials/kashyyyk-platform-textures.js';
import {applySurface} from '../materials/surfaces.js';
import {offsetPlatformLoop} from '../routes/bespin-platform.js';
import {platformSupportAnchor} from './platform-supports.js';
import {platformShadowVolume} from './platform-shadow.js';
const strips=new Map();
function platformStrip(texture,kind){
 const key=texture+':'+kind;if(strips.has(key))return strips.get(key);
 const src=platformTexture(texture).image,width=256,height=kind==='floor'?128:32,data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const fx=x/(width-1),fy=y/(height-1),angle=kind==='floor'?.04+(1-Math.abs(2*fx-1))*.13:.015+fx*(Math.PI/2-.03),radius=kind==='trim'?.87+(fy-.5)*.033:kind==='floor'?.76+(1-Math.abs(2*fy-1))*.055:.87+fy*.16;
  const u=.993407-radius*Math.cos(angle),v=.005551+radius*Math.sin(angle),sx=Math.max(0,Math.min(src.width-1,Math.round(u*(src.width-1)))),sy=Math.max(0,Math.min(src.height-1,Math.round((1-v)*(src.height-1)))),from=(sy*src.width+sx)*4,to=(y*width+x)*4;
  data.set(src.data.subarray(from,from+4),to);if(kind!=='fringe')data[to+3]=255;
 }
 const map=new T.DataTexture(data,width,height,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;map.wrapT=kind==='floor'?T.RepeatWrapping:T.ClampToEdgeWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.flipY=false;map.needsUpdate=true;strips.set(key,map);return map;
}

export const KASHYYYK_PLATFORM_STYLES=['kashyyyk-timber','kashyyyk-thatched'];
export function kashyyykPlatformDefaults(style,width=12){
 const ref=KASHYYYK_PLATFORMS[style],k=width/(2*ref.radius);
 return {style,railing:'none',thickness:T.MathUtils.clamp(ref.bodyDepth*k,.1,30),supports:false};
}
export function platformCircleSegments(platform){return platform.style==='bespin'?30:KASHYYYK_PLATFORM_STYLES.includes(platform.style)?12:48;}
export function platformCircleOffset(platform){return KASHYYYK_PLATFORM_STYLES.includes(platform.style)?Math.PI/12:0;}

// One circular landing retains every visible authored triangle and atlas UV.
// Other outlines use a single union skin so extending a deck cannot leave
// overlapping floor faces or internal seams between platform sections.
export function buildKashyyykPlatform(group,part,loops){
 const platform=part.platform,ref=KASHYYYK_PLATFORMS[platform.style];if(!ref)return false;
 const materials=new Map(),source=ref.meshes[0],floor=source.materials.find(m=>m.cutout);
 function material(def,fringe=false,component='native'){
  const key=def.texture+':'+def.cutout+':'+fringe+':'+component;
  if(!materials.has(key)){
   const mat=new T.MeshStandardMaterial({color:part.color,map:platformTexture(def.texture),roughness:.86,metalness:0,alphaTest:def.cutout?.5:0,side:def.cutout?T.DoubleSide:T.FrontSide});
   if(fringe)mat.userData.walkCollision=false;
   materials.set(key,mat);
  }return materials.get(key);
 }
 function add(positions,uvs,def,component,fringe=false){
  if(!positions.length)return;
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.platformProfile=platform.style;g.userData.platformPart=component;
  const mesh=new T.Mesh(g,material(def,fringe,component));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 const depth=platform.thickness,shadowMeshes=[];let supportAnchors,nativeCircle=false;
 const elevation=h=>h*depth/ref.bodyDepth;
 if(platform.sections.length===1&&platform.sections[0].kind==='circle'){
  nativeCircle=true;
  const s=platform.sections[0],c=Math.cos(s.rotation),n=Math.sin(s.rotation),buckets=new Map();
  for(const item of ref.meshes)for(let i=0;i<item.triangles.length;i++){
   const ids=item.triangles[i],points=ids.map(j=>new T.Vector3(...item.positions[j])),normal=T.Triangle.getNormal(...points,new T.Vector3()),def=item.materials[item.materialIndices[i]],top=normal.z>.9&&points.every(p=>p.z>=-.061),fringe=def.cutout&&!top;
   const component=top?'deck':item.name==='pole'||points.every(p=>p.z<=-ref.bodyDepth+.001)?'supports':fringe?'fringe':'body';
   if(component==='supports')continue;
   const key=item.name+':'+item.materialIndices[i]+':'+component;
   if(!buckets.has(key))buckets.set(key,{positions:[],uvs:[],def,component,fringe,shadow:item===source&&component==='body'});const bucket=buckets.get(key);
   // Blender Z-up -> editor Y-up reverses triangle winding.
   for(const j of [0,2,1]){const p=points[j],x=p.x*s.width/(2*ref.radius),z=p.y*s.depth/(2*ref.radius);bucket.positions.push(s.x+x*c+z*n,top?0:elevation(p.z),s.z-x*n+z*c);bucket.uvs.push(...item.uvs[i][j]);}
  }
  for(const b of buckets.values()){const mesh=add(b.positions,b.uvs,b.def,b.component,b.fringe);if(b.shadow&&mesh)shadowMeshes.push(mesh);}
  // Removing the authored pole exposes an open bottom ring; close it.
  const rim=source.positions.filter(p=>Math.abs(p[2]+ref.bodyDepth)<.002).sort((a,b)=>Math.atan2(a[1],a[0])-Math.atan2(b[1],b[0])),capPositions=[],capUvs=[];
  for(let i=1;i<rim.length-1;i++)for(const p of [rim[0],rim[i],rim[i+1]]){const x=p[0]*s.width/(2*ref.radius),z=p[1]*s.depth/(2*ref.radius);capPositions.push(s.x+x*c+z*n,-depth,s.z-x*n+z*c);capUvs.push(.5,.5);}
  add(capPositions,capUvs,source.materials.find(m=>!m.cutout),'body');group.children.at(-1).geometry.userData.platformBottomCap=true;
  supportAnchors=[{section:s,point:{x:s.x,z:s.z}}];
 }else{
  const area=l=>l.reduce((sum,a,i)=>sum+a.x*l[(i+1)%l.length].z-l[(i+1)%l.length].x*a.z,0)/2;
  const outer=loops.filter(l=>area(l)>0),holes=loops.filter(l=>area(l)<0),body=source.materials.find(m=>!m.cutout),positions=[],uvs=[],deckPositions=[],deckUvs=[];
  const tri=(out,uv,a,b,c)=>{out.push(...a,...b,...c);uv.push(0,0,1,0,1,1);};
  function cap(rings,y,up,out,uv){for(const loop of rings.filter(l=>area(l)>0)){const box=new T.Box2().setFromPoints(loop.map(p=>new T.Vector2(p.x,p.z))),hs=rings.filter(l=>area(l)<0&&box.containsPoint(new T.Vector2(l[0].x,l[0].z))),all=[loop,...hs].flat(),faces=T.ShapeUtils.triangulateShape(loop.map(p=>new T.Vector2(p.x,p.z)),hs.map(h=>h.map(p=>new T.Vector2(p.x,p.z))));for(const f of faces){const points=f.map(i=>[all[i].x,y,all[i].z]);if(up)points.reverse();tri(out,uv,...points);}}}
  cap([...outer,...holes],0,true,deckPositions,deckUvs);
  const ratios=platform.style==='kashyyyk-timber'?[[1,0],[.645,-.190],[.398,-.509],[.247,-.873],[.128,-1]]:[[1,0],[.544,-.188],[.512,-.203],[.247,-.488],[.235,-.514],[.124,-1]];
  // Shrink a standalone footprint about its interior center. Miter offsets of
  // a semicircle can cross the straight cut edge and create underside spikes.
  // A composed footprint retains its concavities using bounded edge offsets.
  const single=platform.sections.length===1;
  const center=loop=>loop.reduce((c,p)=>({x:c.x+p.x/loop.length,z:c.z+p.z/loop.length}),{x:0,z:0});
  function inside(p,loop){let yes=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
  function safeInset(loop,wanted){
   let lo=0,hi=wanted;
   const valid=ring=>Math.sign(area(ring))===Math.sign(area(loop))&&Math.abs(area(ring))>Math.abs(area(loop))*.02&&ring.every((p,i)=>inside(p,loop)&&inside({x:(p.x+ring[(i+1)%ring.length].x)/2,z:(p.z+ring[(i+1)%ring.length].z)/2},loop))&&ring.every((a,i)=>ring.every((c,j)=>{if(i===j||(i+1)%ring.length===j||(j+1)%ring.length===i)return true;const b=ring[(i+1)%ring.length],d=ring[(j+1)%ring.length],cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);return !(cross(a,b,c)*cross(a,b,d)<-1e-10&&cross(c,d,a)*cross(c,d,b)<-1e-10);}));
   for(let k=0;k<12;k++){const mid=(lo+hi)/2;if(valid(offsetPlatformLoop(loop,-mid)))lo=mid;else hi=mid;}return lo;
  }
  const inset=loop=>{const xs=loop.map(p=>p.x),zs=loop.map(p=>p.z);return Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2;};
  const profiles=loops.map(loop=>({loop,center:center(loop),limit:single?0:safeInset(loop,inset(loop)*.872)}));
  const ringAt=(profile,r)=>single?profile.loop.map(p=>({x:profile.center.x+(p.x-profile.center.x)*r,z:profile.center.z+(p.z-profile.center.z)*r})):offsetPlatformLoop(profile.loop,-profile.limit*(1-r)/.872);
  const ringSets=profiles.map(p=>ratios.map(([r])=>ringAt(p,r)));
  for(const rings of ringSets)for(let level=1;level<rings.length;level++)for(let i=0;i<rings[level].length;i++){const j=(i+1)%rings[level].length,a=rings[level-1][i],b=rings[level-1][j],c=rings[level][j],d=rings[level][i],ya=ratios[level-1][1]*depth,yb=ratios[level][1]*depth;tri(positions,uvs,[a.x,ya,a.z],[b.x,ya,b.z],[c.x,yb,c.z]);tri(positions,uvs,[a.x,ya,a.z],[c.x,yb,c.z],[d.x,yb,d.z]);}
  cap(ringSets.map(r=>r.at(-1)),-depth,false,positions,uvs);add(deckPositions,deckUvs,{...floor,cutout:false},'deck');
  const deckMesh=group.children.at(-1);
  shadowMeshes.push(deckMesh);
  // Quarter-circle ornament atlases belong to the native round landing. A
  // composed footprint uses continuous planks/reeds instead of stretched arcs.
  applySurface(group,deckMesh.material,{...part,surface:{preset:'forest-timber',scale:.25}});
  deckMesh.material.map=deckMesh.material.bumpMap=platformStrip(floor.texture,'floor');
  const bodyMesh=add(positions,uvs,body,'body');shadowMeshes.push(bodyMesh);const bodyMaterial=bodyMesh.material;applySurface(group,bodyMaterial,{...part,surface:{preset:'forest-timber',scale:1}});if(part.color==='#ffffff')bodyMaterial.color.set('#a78652');
  // Translate the source's concentric metal straps into contour straps.
  // Sampling the original quarter-disk atlas into a straight strip preserves
  // its weathering and blue fasteners without painting circular arcs on a square.
  const trimPositions=[],trimUvs=[],fringePositions=[],fringeUvs=[];
  function ribbon(a,b,ya,yb,out,uv){let station=0;for(let i=0;i<a.length;i++){const j=(i+1)%a.length,next=station+Math.hypot(a[j].x-a[i].x,a[j].z-a[i].z),A=[a[i].x,ya,a[i].z],B=[a[j].x,ya,a[j].z],C=[b[j].x,yb,b[j].z],D=[b[i].x,yb,b[i].z];out.push(...A,...C,...B,...A,...D,...C);uv.push(station/6,0,next/6,1,next/6,0,station/6,0,station/6,1,next/6,1);station=next;}}
  for(const profile of profiles){
   for(const r of [.87,.71,.40])ribbon(ringAt(profile,r+.013),ringAt(profile,r-.013),.012,.012,trimPositions,trimUvs);
   if(platform.style==='kashyyyk-thatched')ribbon(profile.loop,profile.loop,0,-Math.min(.65,inset(profile.loop)*.1),fringePositions,fringeUvs);
  }
  add(trimPositions,trimUvs,floor,'trim');const trim=group.children.at(-1);trim.material.map=platformStrip(floor.texture,'trim');trim.material.alphaTest=0;trim.material.color.set(part.color);trim.material.roughness=.85;
  if(fringePositions.length){add(fringePositions,fringeUvs,floor,'fringe',true);group.children.at(-1).material.map=platformStrip(floor.texture,'fringe');}
  supportAnchors=platform.sections.map(s=>({section:s,point:single?profiles[0].center:{x:s.x,z:s.z}}));
 }
 if(platform.supports){
  const supportSources=ref.meshes.map(item=>({...item,faces:item.triangles.map((ids,i)=>({ids,i})).filter(({ids})=>item.name==='pole'||ids.every(j=>item.positions[j][2]<=-ref.bodyDepth+.001))})).filter(item=>item.faces.length);
  const heights=supportSources.flatMap(item=>item.faces.flatMap(({ids})=>ids.map(j=>item.positions[j][2]))),bottom=Math.min(...heights),top=Math.max(...heights);
  for(const {section:s,point} of supportAnchors){
   const anchor=platformSupportAnchor(group,part,point);if(!anchor)continue;
   const buckets=new Map(),c=Math.cos(s.rotation),n=Math.sin(s.rotation),scale=Math.min(s.width,s.depth)/(2*ref.radius);
   for(const item of supportSources)for(const {ids,i} of item.faces){
    const def=item.materials[item.materialIndices[i]];if(!buckets.has(def.texture))buckets.set(def.texture,{positions:[],uvs:[],def});const b=buckets.get(def.texture);
    for(const j of [0,2,1]){
     const [x,z,h]=item.positions[ids[j]],offset=new T.Vector3((x*c+z*n)*scale,0,(-x*n+z*c)*scale).applyMatrix3(new T.Matrix3().setFromMatrix4(anchor.matrix));
     const world=anchor.top.clone().add(offset);world.y=anchor.top.y*T.MathUtils.clamp((h-bottom)/(top-bottom),0,1);world.applyMatrix4(anchor.inverse);
     b.positions.push(...world.toArray());b.uvs.push(...item.uvs[i][j]);
    }
   }
   for(const b of buckets.values())add(b.positions,b.uvs,b.def,'supports');
  }
 }
 for(const mat of materials.values())if(part.surface&&part.surface.preset!=='plain')applySurface(group,mat,part);
 const shadow=platformShadowVolume(shadowMeshes,{closeEnds:nativeCircle});if(shadow)shadowMeshes[0].userData.shadowVolume=shadow;
 return true;
}
