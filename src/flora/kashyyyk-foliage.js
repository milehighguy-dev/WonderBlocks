import * as T from '../../vendor/three.module.js';
import {KASHYYYK_FOLIAGE_SOURCE as source} from './data/kashyyyk-foliage-source.js';

let texture,mask;
export function kashyyykLeafTexture(){
 if(!texture){
  const data=Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0));
  for(let i=3;i<data.length;i+=4)data[i]=255;
  texture=new T.DataTexture(data,source.width,source.height,T.RGBAFormat);
  texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  texture.flipY=false;texture.needsUpdate=true;
 }return texture;
}
export function kashyyykLeafMask(){
 if(!mask){
  const original=Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0)),data=new Uint8Array(original.length);
  for(let i=0;i<data.length;i+=4){data[i]=data[i+1]=data[i+2]=original[i+3];data[i+3]=255;}
  mask=new T.DataTexture(data,source.width,source.height,T.RGBAFormat);
  mask.magFilter=T.LinearFilter;mask.minFilter=T.LinearMipmapLinearFilter;
  mask.generateMipmaps=true;mask.flipY=false;mask.needsUpdate=true;
 }return mask;
}
export const KASHYYYK_LEAF_PATCH={
 id:'kashyyyk-leaf-patch',name:'Kashyyyk Canopy Patch',sourceName:'Battlefront Kashyyyk leaf patch',
 category:'Leaves',editorAxis:'z-to-y',texture:true,textureMap:kashyyykLeafTexture,alphaMap:kashyyykLeafMask,
 iconUrl:new URL('../../assets/kashyyyk-foliage/leaf-patch-preview.png',import.meta.url).href,
 source:source.source,triangles:source.triangles,
 meshes:[{positions:source.positions,uv:source.uv,normals:source.normals,indices:Array.from({length:source.positions.length/3},(_,i)=>i)}]
};
