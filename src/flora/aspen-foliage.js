import * as T from '../../vendor/three.module.js';
import {SWBF_FOLIAGE_SOURCE} from './data/swbf-foliage-source.js';

const cache=new Map();
// Recolour the stock Yavin broadleaf atlas, retaining every original leaf,
// gap and translucent edge. Summer/fall share the same native cutout mask.
export function aspenLeafTexture(season,alpha=false){
 const key=season+alpha;if(cache.has(key))return cache.get(key);
 const source=SWBF_FOLIAGE_SOURCE['yavin-leaves'],pixels=Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0)),fall=season==='fall';
 for(let i=0;i<pixels.length;i+=4){
  const mask=pixels[i+3];
  if(alpha)pixels[i]=pixels[i+1]=pixels[i+2]=mask;
  else{
   const light=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722,variation=(pixels[i]-pixels[i+1])*.12;
   const tint=fall?[2.3,2,.3]:[.72,1.18,.38];
   for(let channel=0;channel<3;channel++)pixels[i+channel]=Math.round(T.MathUtils.clamp(light*tint[channel]+variation,0,255));
  }
  pixels[i+3]=255;
 }
 const texture=new T.DataTexture(pixels,source.width,source.height,T.RGBAFormat);if(!alpha)texture.colorSpace=T.SRGBColorSpace;
 texture.flipY=false;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;cache.set(key,texture);return texture;
}
const quad={positions:[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],uv:[0,0,1,0,1,1,0,1],indices:[0,1,2,0,2,3]};
const foliage=season=>({id:'aspen-'+season+'-leaves',name:'Aspen · '+(season==='fall'?'Golden':'Summer')+' Leaf Sprays',sourceName:'Recoloured stock YAV/msh/PC/yav_leaf.tga',category:'Leaves',paletteCategory:'Leaves',texture:true,editorAxis:'z-to-y',textureMap:()=>aspenLeafTexture(season),alphaMap:()=>aspenLeafTexture(season,true),iconUrl:new URL('../../assets/flora-tree-presets/aspen-'+season+'.png',import.meta.url).href,triangles:24,meshes:[quad],billboard:{count:12,radius:.85,height:1.5,minSize:2.6,maxSize:3.2,heightScale:.5,darknessMin:.7,darknessMax:1,seed:151,atlas:2,facing:'camera',anchor:'center'}});

const twigs={positions:[],uv:[],indices:[]};
function twig(a,b,radius){const geometry=new T.CylinderGeometry(radius*.15,radius,a.distanceTo(b),5,1),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());geometry.applyQuaternion(rotation);geometry.translate(...a.clone().lerp(b,.5).toArray());const base=twigs.positions.length/3;twigs.positions.push(...geometry.attributes.position.array);twigs.uv.push(...geometry.attributes.uv.array);twigs.indices.push(...Array.from(geometry.index.array,i=>i+base));geometry.dispose();}
for(let i=0;i<5;i++){const angle=(i-2)*.65,end=new T.Vector3(Math.sin(angle)*.85,1.2+Math.cos(angle)*.4,Math.cos(i*2)*.25);twig(new T.Vector3(),end,.009);for(let j=0;j<2;j++){const start=end.clone().multiplyScalar(.5+j*.24),tip=start.clone().add(new T.Vector3((j?1:-1)*.3,.45,.16*Math.sin(i)));twig(start,tip,.0045);}}
export const ASPEN_TWIGS={id:'aspen-fine-twigs',name:'Aspen · Fine Winter Twigs',sourceName:'Attached fine aspen twig fan',category:'Details',paletteCategory:'Details',editorAxis:'z-to-y',texture:false,iconUrl:new URL('../../assets/flora-tree-presets/aspen-winter.png',import.meta.url).href,triangles:twigs.indices.length/3,meshes:[twigs]};
export const ASPEN_FLORA_PARTS=[foliage('summer'),foliage('fall'),ASPEN_TWIGS];
