import * as T from '../../vendor/three.module.js';
import {FLORA_DESIGNS} from './data/procedural-flora-definitions.js';
import {BF2_FLORA_FORMS} from './data/bf2-flora-forms.js';
import {BF2_FLORA_MATERIALS} from './data/bf2-flora-materials.js';
import {BF2_FLORA_LEAVES} from './data/bf2-flora-leaves.js';
import {SWBF_FOLIAGE_SOURCE} from './data/swbf-foliage-source.js';
import {BARK_BRANCH_PARTS} from './bark-branches.js';
import {MODELED_LEAF_PARTS} from './modeled-leaves.js';
import {TEMP_BASE_FIELDS} from './temp-bases.js';

// Botanical catalogue: authored surface branches and modeled leaves, plus
// reference-derived structural forms adapted to BF2 geometry and materials.
// Preserve the characteristic silhouettes and compound parts; no sampled
// source animations or source-game color maps are used; reference alpha silhouettes are retained.
const tau=Math.PI*2,vec=a=>new T.Vector3(...a),mix=T.MathUtils.lerp;
const empty=()=>({positions:[],uv:[],indices:[]});
function tube(points,radii,{rings=16,sides=10,rounded=false}={}){
 const curve=new T.CatmullRomCurve3(points.map(vec),false,'centripetal'),frames=curve.computeFrenetFrames(rings,false),mesh=empty(),bindings=[];
 for(let i=0;i<=rings;i++){
  const t=i/rings,center=curve.getPoint(t),x=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(x)),radius=mix(radii[j],radii[j+1],x-j);
  for(let k=0;k<sides;k++){const angle=k/sides*tau,p=center.clone().addScaledVector(frames.normals[i],Math.cos(angle)*radius).addScaledVector(frames.binormals[i],Math.sin(angle)*radius);mesh.positions.push(...p.toArray());mesh.uv.push(k/sides,t);bindings.push(t);}
 }
 for(let i=0;i<rings;i++)for(let k=0;k<sides;k++){const a=i*sides+k,b=i*sides+(k+1)%sides,c=b+sides,d=a+sides;mesh.indices.push(a,b,d,b,c,d);}
 for(const [i,end] of [[0,false],[rings,true]]){
  const t=i/rings,radius=radii[end?radii.length-1:0],direction=frames.tangents[i].clone().multiplyScalar(end?1:-1);let prior=i*sides;
  if(rounded)for(let ring=1;ring<3;ring++){
   const angle=ring*Math.PI/6,offset=mesh.positions.length/3,center=curve.getPoint(t).addScaledVector(direction,radius*Math.sin(angle));
   for(let k=0;k<sides;k++){const theta=k/sides*tau,p=center.clone().addScaledVector(frames.normals[i],Math.cos(theta)*radius*Math.cos(angle)).addScaledVector(frames.binormals[i],Math.sin(theta)*radius*Math.cos(angle));mesh.positions.push(...p.toArray());mesh.uv.push(k/sides,t);bindings.push(t);}
   for(let k=0;k<sides;k++){const a=prior+k,b=prior+(k+1)%sides,c=offset+(k+1)%sides,d=offset+k;mesh.indices.push(...(end?[a,b,d,b,c,d]:[a,d,b,b,d,c]));}prior=offset;
  }
  const center=mesh.positions.length/3;mesh.positions.push(...curve.getPoint(t).addScaledVector(direction,rounded?radius:0).toArray());mesh.uv.push(.5,t);bindings.push(t);for(let k=0;k<sides;k++){const a=prior+k,b=prior+(k+1)%sides;mesh.indices.push(center,...(end?[a,b]:[b,a]));}
 }
 mesh.bindings=bindings;return mesh;
}


const textures=new Map();
export function botanicalTexture(kind='bark',alpha=false){
 const key=kind+':'+alpha;if(textures.has(key))return textures.get(key);
 const leaf=kind.startsWith('leaf-')||kind.startsWith('cards-'),source=kind==='cards-fern'?BF2_FLORA_LEAVES['flora-fern-frond']:kind.startsWith('cards-')?SWBF_FOLIAGE_SOURCE[kind.slice(6)]:leaf?BF2_FLORA_LEAVES[kind.slice(5)]:BF2_FLORA_MATERIALS[kind]||BF2_FLORA_MATERIALS.bark,data=Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0));
 for(let i=0;i<data.length;i+=4){
  if(alpha)data[i]=data[i+1]=data[i+2]=data[i+3];
  else if(!leaf){const luma=(data[i]*.24+data[i+1]*.62+data[i+2]*.14)/255,shade=Math.round(255*Math.min(1,(leaf?.45:.26)+Math.pow(luma,.65)*(leaf?.72:1.05)));data[i]=shade;data[i+1]=Math.round(shade*(leaf?1:.96));data[i+2]=Math.round(shade*(leaf?.92:.9));}
  data[i+3]=255;
 }
 const texture=new T.DataTexture(data,source.width,source.height,T.RGBAFormat);if(!alpha)texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.flipY=false;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;textures.set(key,texture);return texture;
}

// The bottom of the atlas contains transparent padding. Anchor to the actual
// opaque stem tip, not the bottom edge of the rectangular texture.
const fernRootUV=[68.5/256,246.5/256];
function fernFrond(){
 const mesh=empty();for(let i=0;i<=4;i++){const t=i/4;for(const [j,side] of [-1,0,1].entries()){mesh.positions.push(side*.52,2.4*t,.18*t*t+(side===0?.06*t:0));mesh.uv.push(j===1?fernRootUV[0]:j*.25,fernRootUV[1]*(1-t));}}
 for(let i=0;i<4;i++)for(let j=0;j<2;j++){const a=i*3+j,b=a+1;mesh.indices.push(a,b,a+3,b,b+3,a+3);}
 // The fern texture already supplies its midrib; a modeled rod protrudes
 // through the sprite and beyond its tip.
 mesh.attachmentVertices=[1];return mesh;
}
// The modeled stalks use the same material as the cutout blades. Sample a
// fully opaque interior texel for their UVs so alpha testing cannot erase them.
// Constant UVs also avoid sampling a transparent mip level on a thin stalk.
const stemUVs=new Map();
function opaqueLeafUV(texture){
 if(stemUVs.has(texture))return stemUVs.get(texture);
 const alpha=botanicalTexture(texture,true).image,color=botanicalTexture(texture).image;let best=Infinity,uv;
 for(let y=1;y<alpha.height-1;y++)for(let x=1;x<alpha.width-1;x++){
  let solid=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(alpha.data[((y+dy)*alpha.width+x+dx)*4]<250)solid=false;
  if(!solid)continue;const i=(y*alpha.width+x)*4,score=(color.data[i]-80)**2+(color.data[i+1]-110)**2+(color.data[i+2]-35)**2;
  if(score<best){best=score;uv=[(x+.5)/alpha.width,(y+.5)/alpha.height];}
 }
 if(!uv)throw Error('Leaf material has no opaque stalk texel: '+texture);stemUVs.set(texture,uv);return uv;
}
function leafComponents(source){
 const parents=Array.from({length:source.positions.length/3},(_,i)=>i),find=i=>parents[i]===i?i:parents[i]=find(parents[i]);
 for(let i=0;i<source.indices.length;i+=3){parents[find(source.indices[i+1])]=find(source.indices[i]);parents[find(source.indices[i+2])]=find(source.indices[i]);}
 const groups=new Map();for(let i=0;i<parents.length;i++){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}
 return [...groups.values()];
}
function leafStemVertices(source,groups){
 const distances=groups.map(ids=>Math.min(...ids.map(i=>Math.hypot(...source.positions.slice(i*3,i*3+3))))),nearest=Math.min(...distances);
 // Retain every cap/seam component at the reference's attachment origin.
 return new Set(groups.filter((ids,i)=>distances[i]<=nearest+.005||distances[i]<.35&&ids.some(j=>source.positions[j*3+1]<=0)).flat());
}
function appendLeafStem(mesh,source,uv){
 const offset=mesh.positions.length/3;mesh.positions.push(...source.positions);mesh.indices.push(...source.indices.map(i=>i+offset));
 mesh.stemVertices=Array.from({length:source.positions.length/3},(_,i)=>i+offset);for(const i of mesh.stemVertices)mesh.uv.push(...uv);
}
// Convert each reference leaflet's placement plane into a folded game-style
// patch. Complete atlas tiles belong to complete cards, never arbitrary source
// triangles: that keeps cutouts from becoming holes through a solid leaf.
function compoundCards(source,texture,fern=false,needle=false){
 const groups=leafComponents(source),stemVertices=leafStemVertices(source,groups);
 let pieces=groups.filter(ids=>!stemVertices.has(ids[0])&&ids.length>=4&&ids.length<=45).map(ids=>{const points=ids.map(i=>new T.Vector3().fromArray(source.positions,i*3)),box=new T.Box3().setFromPoints(points),size=box.getSize(new T.Vector3());return {points,box,size};}).filter(p=>p.size.length()>.12);
 if(!pieces.length)pieces=[{points:Array.from({length:source.positions.length/3},(_,i)=>new T.Vector3().fromArray(source.positions,i*3))}];
 if(pieces.length>24)pieces=pieces.filter((_,i)=>i%Math.ceil(pieces.length/24)===0);
 const mesh=empty();
 for(const [index,{points}] of pieces.entries()){
  const center=points.reduce((s,p)=>s.add(p),new T.Vector3()).divideScalar(points.length);let along=new T.Vector3(0,1,0),distance=0;
  for(const a of points)for(const b of points){const d=a.distanceToSquared(b);if(d>distance){distance=d;along.copy(b).sub(a).normalize();}}
  let normal=new T.Vector3();for(let i=1;i<points.length&&!normal.lengthSq();i++)for(let j=i+1;j<points.length&&!normal.lengthSq();j++)normal.copy(points[i]).sub(points[0]).cross(points[j].clone().sub(points[0]));
  if(normal.lengthSq()<1e-10)normal.set(0,0,1);normal.normalize();const across=normal.clone().cross(along).normalize();if(along.dot(center)<0)along.negate();let width=Math.max(...points.map(p=>Math.abs(p.clone().sub(center).dot(across))))*2,height=Math.sqrt(distance);
  width=Math.max(width,height*(fern?.35:needle?.3:.45));if(!fern)width*=1.4;height*=fern?1:1.25;const offset=mesh.positions.length/3,u=fern||needle?0:(index%2)*.5,v=fern?1:needle?0:((index>>1)%2)*.5,du=fern?.5:needle?1:.5,dv=fern?-1:needle?1:.5;
  for(const [j,side] of [-1,0,1].entries())for(const [k,end] of [-1,1].entries()){const p=(fern?new T.Vector3().addScaledVector(along,k*height):center.clone().addScaledVector(along,end*height*.5)).addScaledVector(across,side*width*.5).addScaledVector(normal,side===0?height*.09*(fern?k:1):0);mesh.positions.push(...p.toArray());mesh.uv.push(fern&&j===1?fernRootUV[0]:u+j/2*du,fern?fernRootUV[1]*(1-k):v+k*dv);}
  mesh.indices.push(...[0,2,1,2,3,1,2,4,3,4,5,3].map(i=>i+offset));
 }
 // Fern-based palm and willow sprays carry their veins in the cutout.
 // Retain structural stalks only for the other compound foliage types.
 if(fern){mesh.attachmentVertices=Array.from({length:pieces.length},(_,i)=>i*6+2);return mesh;}
 const stem=empty(),indices=new Map();for(const i of stemVertices){indices.set(i,stem.positions.length/3);stem.positions.push(...source.positions.slice(i*3,i*3+3));}
 for(let i=0;i<source.indices.length;i+=3)if(stemVertices.has(source.indices[i]))stem.indices.push(...source.indices.slice(i,i+3).map(j=>indices.get(j)));
 appendLeafStem(mesh,stem,opaqueLeafUV(texture));return mesh;
}

const neutralMorph=(mesh,morphs={})=>{
 const width=mix(.6,1.4,morphs.width??.5),length=mix(.65,1.35,morphs.length??.5),bend=mix(-.35,.35,morphs.bend??morphs.curl??.5),height=Math.max(.05,...mesh.positions.filter((_,i)=>i%3===1)),positions=[];
 for(let i=0;i<mesh.positions.length;i+=3){const x=mesh.positions[i]*width,y=mesh.positions[i+1]*length,z=mesh.positions[i+2]*width,t=y/height;positions.push(x+bend*t*t*height,y,z);}
 return {...mesh,positions};
};
const compound=name=>/Sprig|Spray|Canopy|Crown|Whorl|Tuft|Frond/.test(name)&&name!=='Fern Frond';
const leafTexture=(id,name)=>compound(name)?/Palm|Willow/.test(name)?'cards-fern':/Needle|Pine/.test(name)?'cards-endor-redwood-needles':'cards-yavin-leaves':'leaf-'+id;
export const FLORA_PROFILES={},FLORA_BODY_FIELDS={...TEMP_BASE_FIELDS},FLORA_BODY_EXTRAS={};
// Neutral joint primitives use the same editable branch and attachment system.
const basicPoints=[[0,0,0],[0,.5,0],[0,1,0]],basicRadii=[.1,.1,.1];
FLORA_PROFILES['flora-basic-branch']={points:basicPoints,radii:basicRadii,length:3,joints:2,mesh:tube(basicPoints,basicRadii,{rings:24,sides:12,rounded:true})};
const trunkRadii=[.12,.10,.08];
FLORA_PROFILES['flora-basic-trunk']={points:basicPoints,radii:trunkRadii,length:4,joints:3,mesh:tube(basicPoints,trunkRadii,{rings:16,sides:12,rounded:true})};
const authoredParts=new Map([...BARK_BRANCH_PARTS,...MODELED_LEAF_PARTS].map(part=>[part.id,part]));
export const PROCEDURAL_FLORA=FLORA_DESIGNS.map(([id,name,kind,paletteCategory])=>{
 const approved=authoredParts.get(id);if(approved)return approved;
 const form=BF2_FLORA_FORMS[id],leaf=kind==='leaf',cutout=leaf&&(compound(name)||id==='flora-fern-frond'),texture=leaf?leafTexture(id,name):/Knotted|Twisting|Winding|Buttress|Swollen/.test(name)?'gnarled-bark':/Smooth|Slender|Twig/.test(name)?'smooth-bark':'bark';
 // Solid modeled leaves already carry their silhouette in geometry. Applying
 // a card mask to them cuts arbitrary holes through petioles and solid blades.
 const asset={id,name,sourceName:name,category:leaf?'Leaves':kind==='wood'&&paletteCategory==='Details'?'Details':'Trunks',paletteCategory,source:'Reference-derived form adapted to BF2 materials and polygon density',editorAxis:'z-to-y',texture:true,textureMap:()=>botanicalTexture(texture),alphaMap:()=>cutout?botanicalTexture(texture,true):null,iconUrl:new URL('../../assets/procedural-flora/'+id+'.png',import.meta.url).href};
 if(kind==='profile'){const profile=form?.profile||FLORA_PROFILES[id];FLORA_PROFILES[id]=profile;return {...asset,...(['flora-basic-branch','flora-basic-trunk'].includes(id)?{source:'Procedural neutral joint primitive'}:{}),profile:{radii:profile.radii,percentages:profile.points.map((_,i)=>i/(profile.points.length-1))},meshes:[profile.mesh]};}
 if(kind==='body'){FLORA_BODY_FIELDS[id]=form.edges;return {...asset,assembly:true,skeleton:form.skeleton,meshes:form.meshes.map(m=>({...m,positions:[...m.positions],uv:[...m.uv],indices:[...m.indices]}))};}
 const meshes=id==='flora-fern-frond'?[fernFrond()]:leaf&&compound(name)?[compoundCards(form.meshes[0],texture,/Palm|Willow/.test(name),/Needle|Pine/.test(name))]:form.meshes,shapeMesh=morphs=>neutralMorph(meshes[0],morphs),controls=leaf?[{id:'width',name:'Foliage spread',default:.5,start:[-.5,.2,0],end:[-.5,.8,0]},{id:'curl',name:'Foliage bend',default:.5,start:[.5,.2,0],end:[.5,.8,0]}]:[{id:'width',name:'Girth',default:.5,start:[-.45,.1,0],end:[-.45,.7,0]},{id:'bend',name:'Bend',default:.5,start:[.45,.1,0],end:[.45,.7,0]},{id:'length',name:'Branch length',default:.5,start:[0,.3,0],end:[0,1.5,0]}];
 return {...asset,placement:kind==='base'?{root:true}:{surface:true},meshes,shapeControls:controls,shapeMesh};
});
