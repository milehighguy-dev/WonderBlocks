import * as T from '../../vendor/three.module.js';
import {billboardTexture} from './flora-billboards.js';

const quad={positions:[-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],uv:[0,0,1,0,1,1,0,1],normals:[0,0,1,0,0,1,0,0,1,0,0,1],indices:[0,1,2,0,2,3]};
const cutouts=[['biome-sprite-grass-green','Fresh Grass Tuft'],['biome-sprite-grass-seeded','Flowering Meadow Tuft'],['biome-sprite-grass-dry','Dry Bunchgrass'],['biome-sprite-broadleaf-scrub','Small Broadleaf Spray'],['biome-sprite-dry-twig','Dry Scrub Spray'],['biome-sprite-meadow-flowers','Meadow Flower Spray'],['biome-sprite-yellow-flowers','Yellow Flower Spray'],['biome-sprite-sword-fern','Sword Fern Blade'],['biome-sprite-cold-leaves','Small Woodland Leaves'],['biome-sprite-reed','BF1 Kashyyyk Reed Tuft'],['biome-sprite-bf1-meadow','BF1 Naboo Meadow Tuft'],['biome-sprite-heather','Alpine Heather Spray'],['biome-sprite-sagebrush','Desert Sagebrush Spray'],['biome-sprite-fescue','Fine Fescue Tuft'],['biome-sprite-bluestem','Bluestem Seed-head Tuft'],['biome-sprite-sea-oats','Coastal Oat Tuft'],['biome-sprite-sedge','Low Sedge Tussock'],['biome-sprite-hanging-moss','Hanging Swamp Moss'],['biome-sprite-root-curtain','Mangrove Root Curtain'],['biome-sprite-spanish-moss','Silver Spanish Moss'],['biome-sprite-lily-bed','Waterlily Bed Cutout']];
export const BIOME_CUTOUT_PARTS=cutouts.map(([id,name])=>({id,name,sourceName:'Biome flora · '+name,category:'Leaves',paletteCategory:'Leaves',editorAxis:'z-to-y',texture:true,textureMap:()=>billboardTexture(id),alphaMap:()=>billboardTexture(id,true),iconUrl:new URL('../../assets/biome-flora/'+id+'.png',import.meta.url).href,triangles:2,meshes:[quad],billboard:{count:1,radius:0,height:0,minSize:1,maxSize:1,heightScale:1,darknessMin:.85,darknessMax:1,seed:1121,atlas:1,facing:'upright',anchor:'bottom'}}));
const textures=new Map();
function solid(color,pattern=''){
 const key=color+'|'+pattern;if(textures.has(key))return textures.get(key);
 const c=new T.Color(color).convertLinearToSRGB(),size=256,data=new Uint8Array(size*size*4),base=[c.r,c.g,c.b];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,grain=(((x*17+y*31+x*y*3)%53)/53-.5)*.055;let shade=1+grain,cream=0;
  if(pattern.includes('cactus')){shade+=Math.cos(u*Math.PI*16)*.105;const du=Math.abs(((u*8+.5)%1)-.5),dv=Math.abs(((v*7+(Math.floor(u*8)%2)*.5)%1)-.5);if(du<.065&&dv<.055)cream=.48*(1-Math.max(du/.065,dv/.055));}
  else if(pattern.includes('leaf')||pattern.includes('pad')){shade+=Math.sin(v*Math.PI*2)*.05;const vein=Math.abs(Math.sin(v*65-Math.abs(u-.5)*24));if(vein>.985)shade+=.13;if(Math.abs(u-.5)<.013)shade+=.2;shade-=Math.abs(u-.5)*.08;}
  else if(pattern.includes('lichen')){shade+=.12*Math.sin(x*.19+Math.sin(y*.13)*2)*Math.sin(y*.21)+.07*Math.cos(x*.65+y*.36);}
  else if(pattern.includes('cotton'))shade+=grain*3+Math.sin(u*230+v*47)*.035;
  else if(pattern.includes('head'))shade+=Math.sin(u*130)*.08+Math.sin(v*90)*.05;
  const at=(y*size+x)*4;for(let k=0;k<3;k++)data[at+k]=Math.round(T.MathUtils.clamp(base[k]*shade*(1-cream)+[.86,.82,.64][k]*cream,0,1)*255);data[at+3]=255;
 }
 const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;textures.set(key,t);return t;
}
function ellipsoid(rings,sides,{x=1,y=1,z=1,center=.5,ribs=0,notch=false}={}){
 const positions=[0,center-y,0],uv=[.5,0],indices=[];
 for(let r=1;r<rings;r++)for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2,b=r/rings*Math.PI,rr=Math.sin(b)*(1+ribs*Math.cos(a*8)),d=notch?1-.62*Math.exp(-((Math.min(a,2*Math.PI-a)/.24)**2)):1;positions.push(Math.cos(a)*x*rr*d,center-Math.cos(b)*y,Math.sin(a)*z*rr*d);uv.push(s/sides,r/rings);}
 const top=positions.length/3;positions.push(0,center+y,0);uv.push(.5,1);
 for(let s=0;s<sides;s++){const a=1+s,b=1+(s+1)%sides;indices.push(0,b,a);}
 for(let r=0;r<rings-2;r++)for(let s=0;s<sides;s++){const a=1+r*sides+s,b=1+r*sides+(s+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,d,a,d,c);}
 for(let s=0;s<sides;s++)indices.push(top,1+(rings-2)*sides+s,1+(rings-2)*sides+(s+1)%sides);
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 return {positions,uv,indices};
}
function ribbon(steps,width=.16,curve=.4){const positions=[],uv=[],indices=[];for(let i=0;i<=steps;i++){const t=i/steps,w=width*Math.sin(Math.PI*(t*.96+.02))**.65;for(const side of [-1,0,1]){positions.push(side*w,t,curve*t*t+Math.abs(side)*w*.18);uv.push((side+1)/2,t);}if(i){const a=(i-1)*3;for(let side=0;side<2;side++){const j=a+side;indices.push(j,j+1,j+4,j,j+4,j+3);}}}return {positions,uv,indices};}
// Palmate and feather palms have different construction, not different scales
// of one stock whorl. Both LODs sample these same frond rules more sparsely.
function palmFrond(low,fan){
 const positions=[],uv=[],indices=[];
 const triangle=(a,b,c)=>{const i=positions.length/3;positions.push(...a,...b,...c);uv.push(.47,0,.1,.8,.9,1);indices.push(i,i+1,i+2);};
 const center=t=>[0,t,.36*t*t],petiole=fan?.42:.08;
 triangle([-.012,0,0],[.012,0,0],center(fan?.5:1));
 const count=fan?(low?7:13):(low?7:15);
 if(fan){
  for(let i=0;i<count;i++){
   const a=-1.12+i/count*2.24,b=-1.12+(i+1)/count*2.24;
   const point=(angle,r)=>[Math.sin(angle)*r,petiole+Math.cos(angle)*r,.12+.12*r*r];
   triangle(center(petiole),point(a,.48),point(b,.48));
   triangle(point(a,.48),point((a+b)/2,.98),point(b,.48));
  }
 }else for(let i=0;i<count;i++){
  const t=.14+i/(count-1)*.8,p=center(t),w=.25*Math.sin(t*Math.PI)**.7;
  for(const side of [-1,1])triangle(p,[side*w,t+.04,.36*t*t+.06],[side*w*.85,t+.19,.36*t*t+.015]);
 }
 return {positions,uv,indices};
}
const modeled=(id,name,color,build,category='Leaves')=>{const mesh=build(false);return {id,name,sourceName:'New biome flora - '+name,category,paletteCategory:category==='Leaves'?'Leaves':'Flora',texture:true,textureMap:()=>solid(color,id),alphaMap:()=>null,iconUrl:new URL('../../assets/procedural-flora/'+id+'.png',import.meta.url).href,triangles:mesh.indices.length/3,meshes:[mesh],lowDetailMeshes:[build(true)]};};
export const BIOME_MODELED_PARTS=[
 modeled('biome-fan-frond','Palmate Fan Frond','#608246',low=>palmFrond(low,true)),
 modeled('biome-palm-frond','Feather Palm Frond','#648548',low=>palmFrond(low,false)),
 modeled('biome-ribbon-leaf','Ribbon Leaf','#628c42',low=>ribbon(low?4:9,.11,.45)),
 modeled('biome-banana-leaf','Banana Blade','#488c3a',low=>ribbon(low?5:12,.32,.5)),
 modeled('biome-yucca-leaf','Yucca Blade','#7c9153',low=>ribbon(low?3:7,.055,.6)),
 modeled('biome-sedge-leaf','Slender Sedge Leaf','#708a45',low=>ribbon(low?3:8,.025,.65)),
 modeled('biome-herb-stem','Slender Herb Stem','#74854c',low=>ellipsoid(low?3:6,low?5:8,{x:.005,y:.5,z:.005,center:.5}),'Trunks'),
 modeled('biome-cactus-pad','Succulent Pad','#64844c',low=>ellipsoid(low?5:8,low?10:16,{x:.31,y:.45,z:.065,center:.45}),'Trunks'),
 modeled('biome-cactus-barrel','Ribbed Barrel','#71854d',low=>ellipsoid(low?6:10,low?16:32,{x:.45,y:.5,z:.45,center:.5,ribs:.11}),'Trunks'),
 modeled('biome-reed-head','Cattail Seed Head','#665039',low=>ellipsoid(low?5:8,low?6:10,{x:.045,y:.19,z:.045,center:.19})),
 modeled('biome-cotton-head','Cotton Sedge Head','#d7d5bc',low=>ellipsoid(low?4:7,low?6:10,{x:.065,y:.09,z:.065,center:.09})),
 {id:'biome-lily-pad',name:'Waterlily Sheet',sourceName:'Horizontal transparent waterlily sheet',category:'Leaves',paletteCategory:'Leaves',texture:true,textureMap:()=>billboardTexture('biome-sprite-lily-bed'),alphaMap:()=>billboardTexture('biome-sprite-lily-bed',true),iconUrl:new URL('../../assets/biome-flora/biome-sprite-lily-bed.png',import.meta.url).href,triangles:2,meshes:[{positions:[-.5,0,-.5,-.5,0,.5,.5,0,.5,.5,0,-.5],uv:[0,0,0,1,1,1,1,0],normals:[0,1,0,0,1,0,0,1,0,0,1,0],indices:[0,1,2,0,2,3]}],get lowDetailMeshes(){return this.meshes;}},
 modeled('biome-lichen-lobe','Pioneer Lichen Lobe','#a4a66d',low=>ellipsoid(low?3:5,low?10:20,{x:.28,y:.045,z:.22,center:.04,ribs:.18})),
];
export const BIOME_FLORA_PARTS=[...BIOME_CUTOUT_PARTS,...BIOME_MODELED_PARTS];
