import * as T from '../../vendor/three.module.js';
import {twigShape} from './twig-shapes.js';
import {branchAccent} from './branch-accents.js';

// Approved on-bark branches, authored from new curves, surfaces and textures.
// Canonical IDs keep placed plants using the normal branch catalogue.
const maps=new Map(),tau=Math.PI*2;
function hash(x,y,seed){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function noise(u,v,px,py,seed){
 const x=u*px,y=v*py,ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
 const sample=(dx,dy)=>hash(((ix+dx)%px+px)%px,((iy+dy)%py+py)%py,seed);
 return T.MathUtils.lerp(T.MathUtils.lerp(sample(0,0),sample(1,0),sx),T.MathUtils.lerp(sample(0,1),sample(1,1),sx),sy);
}
function barkTexture(kind){
 if(maps.has(kind))return maps.get(kind);
 const size=256,data=new Uint8Array(size*size*4),seed=17+['tapered','bent','thorn','segmented','slender'].indexOf(kind)*3;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;let value;
  if(u<.75){
   const around=u/.75,warp=around+.022*Math.sin(v*tau)+.016*Math.sin(v*tau*3+around*tau*2);
   const grain=noise(warp,v,13,3,seed),broad=noise(around,v,6,4,seed+1),fine=noise(warp,v,47,29,seed+2),fissure=Math.exp(-(((grain-.31)*13)**2));
   const fiber=Math.sin((warp*31+.15*Math.sin(v*tau*2))*tau),split=fiber>.94&&noise(around,v,17,9,seed+3)<.56?23:0;
   value=183+(broad-.5)*78+(grain-.5)*70+(fine-.5)*29-fissure*64-split;
   // Small elliptical bark scars interrupt the fibers without baking a large
   // lighting gradient into the diffuse map. Pattern repeats only axially.
   for(const [cx,cy,rx,ry] of [[.20,.29,.055,.105],[.66,.76,.037,.07]]){
    const dx=Math.min(Math.abs(around-cx),1-Math.abs(around-cx))/rx,dy=Math.min(Math.abs(v-cy),1-Math.abs(v-cy))/ry,r=Math.hypot(dx,dy);
    if(r<1.4)value-=Math.exp(-(((r-.78)*7)**2))*31+Math.exp(-r*r*9)*34;
   }
  }else{
   const dx=(u-.875)/.115,dy=(v-.5)/.44,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx),rings=Math.sin((r*8+.08*Math.sin(a*3)+.035*Math.sin(a*7))*tau);
   value=207-r*13-rings*13+(hash(x,y,seed)-.5)*10;
   if(Math.abs(Math.sin(a*2+.15*r))<.018&&r>.35)value-=28;
  }
  const at=(y*size+x)*4,shade=T.MathUtils.clamp(Math.round(value),53,238);data[at]=shade;data[at+1]=Math.round(shade*.975);data[at+2]=Math.round(shade*.935);data[at+3]=255;
 }
 const map=new T.DataTexture(data,size,size,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.flipY=false;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.needsUpdate=true;maps.set(kind,map);return map;
}
const designs=[
 ['tapered','flora-tapered-twig','Tapered Twig'],
 ['bent','flora-bent-twig','Bent Twig'],
 ['thorn','flora-thorn-branch','Thorn Branch'],
 ['segmented','flora-segmented-branch','Segmented Branch'],
 ['slender','flora-slender-twig','Slender Twig']
];
const makeMesh=(kind,morphs)=>['thorn','segmented'].includes(kind)?branchAccent(kind,morphs):twigShape(kind,morphs);
export const BARK_BRANCH_PARTS=designs.map(([kind,id,name])=>{
 const mesh=makeMesh(kind);
 return {id,name,sourceName:name,source:'Independently authored curves, surfaces and bark texture',category:'Trunks',paletteCategory:'Branches',placement:{surface:true},surfaceHost:true,editorAxis:'z-to-y',texture:true,textureMap:()=>barkTexture(kind),alphaMap:()=>null,iconUrl:new URL('../../assets/procedural-flora/'+id+'.png',import.meta.url).href,meshes:[mesh],triangles:mesh.indices.length/3,
  shapeControls:[{id:'width',name:'Girth',default:.5,start:[-.35,.1,0],end:[-.35,.7,0]},{id:'length',name:'Branch length',default:.5,start:[0,.3,0],end:[0,1.5,0]},{id:'bend',name:'Bend',default:.5,start:[.35,.1,0],end:[.35,.7,0]}],shapeMesh:morphs=>makeMesh(kind,morphs)};
});
