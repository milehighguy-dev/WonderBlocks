// Bake textured thumbnails offline so the sidebar only decodes small PNGs.
import fs from 'node:fs';
import {deflateSync} from 'node:zlib';
import * as T from '../vendor/three.module.js';
import {PROCEDURAL_FLORA,FLORA_ASSETS} from '../src/flora/flora-palette.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {makePart} from '../src/core/model.js';
import {updateBillboardFacing} from '../src/flora/flora-billboards.js';
import {BARK_BRANCH_PARTS} from '../src/flora/bark-branches.js';
import {MODELED_LEAF_PARTS} from '../src/flora/modeled-leaves.js';
const output=new URL('../assets/procedural-flora/',import.meta.url);
fs.mkdirSync(output,{recursive:true});
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((x,i)=>x-b[i]),unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
const eye=unit([1,.65,1.5]),right=unit(cross([0,1,0],eye)),up=cross(eye,right),light=unit([-.5,1,.8]);
function crc(data){let v=-1;for(const byte of data){v^=byte;for(let i=0;i<8;i++)v=v>>>1^(v&1?0xedb88320:0);}return (v^-1)>>>0;}
function png(width,height,data){
 const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)data.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
 const chunk=(name,data)=>{const type=Buffer.from(name),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,sum]);},header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const resolution=256,edge=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
const wetland=process.argv.includes('--wetlands');
const branches=process.argv.includes('--branches');
const leaves=process.argv.includes('--leaves');
const temp=process.argv.includes('--temp');
const requested=process.argv.find(arg=>arg.startsWith('--part='))?.slice(7);
const requestedTree=process.argv.find(arg=>arg.startsWith('--tree='))?.slice(7);
if(requested&&requestedTree)throw Error('Choose either --part or --tree.');
const specimens=requestedTree?[]:requested?FLORA_ASSETS.filter(p=>p.id===requested):temp?FLORA_ASSETS.filter(p=>p.paletteCategory==='temp'):branches?BARK_BRANCH_PARTS:leaves?MODELED_LEAF_PARTS:wetland?FLORA_ASSETS.filter(p=>p.id.startsWith('coral-')||p.id==='willow-hanging-spray'):PROCEDURAL_FLORA;
if(requested&&!specimens.length)throw Error('Unknown flora part: '+requested);
const entries=specimens.filter(part=>!part.floraPreset).map(part=>({part,output:part.id.startsWith('temp-base-')?new URL('../assets/temp-bases/',import.meta.url):wetland?new URL('../assets/reef-flora/',import.meta.url):output}));
// Whole plants use the same material-aware baking path as the wetland presets.
// --part also accepts a tree ID so every selectable asset has one safe entry.
const treeIds=[...specimens.filter(part=>part.floraPreset).map(part=>part.id),...(requestedTree?[requestedTree]:[]),...(wetland?['weeping-willow','red-mangrove']:[])];
for(const id of new Set(treeIds)){
 if(!FLORA_ASSETS.some(part=>part.id===id&&part.floraPreset))throw Error('Unknown flora tree preset: '+id);
 const group=buildPart(makePart('flora',instantiateFloraTreePreset(id)),{collision:false}),center=new T.Box3().setFromObject(group).getCenter(new T.Vector3()),camera=new T.PerspectiveCamera(35,1,.01,1000);camera.position.copy(center).add(new T.Vector3(...eye).multiplyScalar(30));camera.lookAt(center);camera.updateMatrixWorld(true);group.updateMatrixWorld(true);
 const meshes=[],white={width:1,height:1,data:new Uint8Array([255,255,255,255])};
 group.traverse(m=>{if(!m.isMesh)return;if(m.userData.floraBillboard)updateBillboardFacing(m,camera);const g=m.geometry,positions=[];for(let i=0;i<g.attributes.position.count;i++)positions.push(...new T.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(m.matrixWorld).toArray());const color=m.material.color.clone().convertLinearToSRGB();meshes.push({positions,uv:[...g.attributes.uv.array],indices:g.index?[...g.index.array]:Array.from({length:g.attributes.position.count},(_,i)=>i),diffuse:m.material.map?.image||white,mask:m.material.alphaMap?.image||null,tint:[color.r,color.g,color.b]});});
 entries.push({part:{id,category:'Leaves',meshes,textureMap:()=>({image:white}),alphaMap:()=>null},output:new URL('../assets/flora-tree-presets/',import.meta.url)});disposePart(group);
}
for(const {part,output:destination} of entries){
 fs.mkdirSync(destination,{recursive:true});
 const vertices=part.meshes.flatMap(m=>Array.from({length:m.positions.length/3},(_,i)=>m.positions.slice(i*3,i*3+3))),xs=vertices.map(v=>dot(v,right)),ys=vertices.map(v=>dot(v,up)),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=212/Math.max(maxX-minX,maxY-minY),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const project=v=>[128+(dot(v,right)-cx)*scale,128-(dot(v,up)-cy)*scale,dot(v,eye)],leaf=part.category==='Leaves',baseDiffuse=part.textureMap().image,baseMask=part.alphaMap()?.image,baseColor=leaf?[1,1,1]:[.71,.66,.55],pixels=Buffer.alloc(resolution*resolution*4),depth=new Float64Array(resolution*resolution).fill(-Infinity);
 for(const mesh of part.meshes){const diffuse=mesh.diffuse||baseDiffuse,mask=mesh.mask===undefined?baseMask:mesh.mask,color=mesh.tint||baseColor;for(let i=0;i<mesh.indices.length;i+=3){
  const ids=mesh.indices.slice(i,i+3),pts=ids.map(j=>mesh.positions.slice(j*3,j*3+3)),normal=cross(sub(pts[1],pts[0]),sub(pts[2],pts[0]));if(Math.hypot(...normal)<1e-8)continue;const n=unit(normal);if(!leaf&&dot(n,eye)<0)continue;
  const xy=pts.map(project),uv=ids.map(j=>mesh.uv.slice(j*2,j*2+2)),area=edge(xy[0],xy[1],xy[2][0],xy[2][1]);if(Math.abs(area)<1e-8)continue;
  const loX=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[0])))),hiX=Math.min(255,Math.ceil(Math.max(...xy.map(p=>p[0])))),loY=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[1])))),hiY=Math.min(255,Math.ceil(Math.max(...xy.map(p=>p[1])))),shade=Math.max(.4,Math.min(1,.65+.35*Math.abs(dot(n,light))));
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
   const a=edge(xy[1],xy[2],x+.5,y+.5)/area,b=edge(xy[2],xy[0],x+.5,y+.5)/area,c=1-a-b;if(a<0||b<0||c<0)continue;
   const at=y*resolution+x,z=a*xy[0][2]+b*xy[1][2]+c*xy[2][2];if(z<=depth[at])continue;
   const u=a*uv[0][0]+b*uv[1][0]+c*uv[2][0],v=a*uv[0][1]+b*uv[1][1]+c*uv[2][1],tx=Math.floor((u-Math.floor(u))*diffuse.width),ty=Math.floor((v-Math.floor(v))*diffuse.height),source=(ty*diffuse.width+tx)*4;
   if(mask&&mask.data[source]<=.45*255)continue;depth[at]=z;for(let k=0;k<3;k++)pixels[at*4+k]=Math.round(diffuse.data[source+k]*color[k]*shade);pixels[at*4+3]=255;
  }
 }
 }
 // Supersampling preserves silhouettes without retaining vector paths.
 const small=Buffer.alloc(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const at=(y*128+x)*4;let alpha=0;const rgb=[0,0,0];for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=((y*2+dy)*resolution+x*2+dx)*4,a=pixels[i+3];alpha+=a;for(let k=0;k<3;k++)rgb[k]+=pixels[i+k]*a;}
  for(let k=0;k<3;k++)small[at+k]=alpha?Math.round(rgb[k]/alpha):0;small[at+3]=Math.round(alpha/4);
 }
 const image=png(128,128,small);fs.writeFileSync(new URL(part.id+'.png',destination),image);console.log(part.id,image.length+' bytes');
}
