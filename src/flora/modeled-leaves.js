import * as T from '../../vendor/three.module.js';
import {volumeForm} from './leaf-cups.js';
import {leafVolume} from './leaf-shapes.js';
import {accentVolume} from './leaf-accents.js';

// Approved modeled foliage. New curves, section layouts and textures replace
// the former reference meshes under the established catalogue IDs.
function makeMesh(kind,morphs={}){
 if(['horned','folded','ruffled','disc','shield','notched'].includes(kind))return volumeForm(kind,morphs);
 if(['willow','scalloped','paddle','fan','maple','coin'].includes(kind))return leafVolume(kind,morphs);
 return accentVolume(kind,morphs);
}

const maps=new Map();
const tones={willow:[94,116,61],star:[91,115,46],horned:[91,110,51],coral:[182,45,37],disc:[111,124,68],shield:[94,116,58],notched:[105,118,55],scalloped:[78,105,50],tendril:[92,110,53],paddle:[94,121,58],fan:[109,127,63],maple:[84,116,49],folded:[110,122,57],ruffled:[99,121,57],coin:[82,111,57]};
const hash=(x,y,seed)=>((Math.imul(x+seed*13,73856093)^Math.imul(y+seed*7,19349663))>>>0)/4294967295;
function grain(u,v,period,seed){
 const x=u*period,y=v*period,ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
 const sample=(dx,dy)=>hash(((ix+dx)%period+period)%period,iy+dy,seed);
 return T.MathUtils.lerp(T.MathUtils.lerp(sample(0,0),sample(1,0),sx),T.MathUtils.lerp(sample(0,1),sample(1,1),sx),sy);
}
function texture(kind){
 if(maps.has(kind))return maps.get(kind);
 const size=128,data=new Uint8Array(size*size*4),base=tones[kind],seed=Object.keys(tones).indexOf(kind)+17,coral=kind==='coral',cup=['horned','folded','ruffled','disc','shield','notched'].includes(kind);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/(size-1),v=y/(size-1),broad=grain(u,v,5,seed),mid=grain(u,v,13,seed+1),fine=grain(u,v,37,seed+2),fiber=Math.abs(Math.sin((u*(cup?8:5)+.035*Math.sin(v*9))*Math.PI)),vein=Math.exp(-fiber*28);
  const mottling=.77+broad*.34+mid*.12+(fine-.5)*.045,root=.89+.11*Math.min(1,v*2.2),vessel=coral?1:1+vein*.10;
  const pit=coral&&fine<.22?.84:1,shade=mottling*root*vessel*pit;
  const at=(y*size+x)*4;data[at]=Math.min(255,Math.round(base[0]*shade+(broad-.5)*6));data[at+1]=Math.min(255,Math.round(base[1]*shade));data[at+2]=Math.min(255,Math.round(base[2]*shade-(mid-.5)*5));data[at+3]=255;
 }
 const map=new T.DataTexture(data,size,size,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.flipY=false;map.wrapS=map.wrapT=T.RepeatWrapping;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.needsUpdate=true;maps.set(kind,map);return map;
}

const designs=[
 ['willow','flora-willow-leaf','Willow Leaf'],['star','flora-starburst-leaf','Starburst Leaf'],['horned','flora-horned-leaf','Horned Leaf'],
 ['coral','flora-coral-leaf','Coral Leaf'],['disc','flora-blade-leaf','Blade Leaf'],['shield','flora-shield-leaf','Shield Leaf'],
 ['notched','flora-notched-leaf','Notched Leaf'],['scalloped','flora-scalloped-leaf','Scalloped Leaf'],['tendril','flora-spiral-tendril','Spiral Tendril'],
 ['paddle','flora-paddle-leaf','Paddle Leaf'],['fan','flora-ginkgo-leaf','Ginkgo Leaf'],['maple','flora-maple-leaf','Maple Leaf'],
 ['folded','flora-folded-leaf','Folded Leaf'],['ruffled','flora-ruffled-leaf','Ruffled Leaf'],['coin','flora-coin-leaf','Coin Leaf']
];
export const MODELED_LEAF_PARTS=designs.map(([kind,id,name])=>{
 const mesh=makeMesh(kind);
 return {id,name,sourceName:name,source:'Independently authored botanical geometry and texture',category:'Leaves',paletteCategory:kind==='coral'?'Coral':'Leaves',editorAxis:'z-to-y',surfaceHost:true,texture:true,textureMap:()=>texture(kind),alphaMap:()=>null,iconUrl:new URL('../../assets/procedural-flora/'+id+'.png',import.meta.url).href,meshes:[mesh],triangles:mesh.indices.length/3,
  shapeControls:[{id:'width',name:'Spread',default:.5,start:[-.55,.2,0],end:[-.55,.9,0]},{id:'length',name:'Length',default:.5,start:[0,.3,0],end:[0,1.4,0]},{id:'curl',name:kind==='tendril'?'Coil':'Bend',default:.5,start:[.55,.2,0],end:[.55,.9,0]}],shapeMesh:morphs=>makeMesh(kind,morphs)};
});
