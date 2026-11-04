import * as THREE from '../../vendor/three.module.js';
const cache=new Map();
// Original opaque detail maps. No transparency overdraw or per-bar meshes.
export function architecturalTexture(kind){
 if(cache.has(kind))return cache.get(kind);
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/(size-1),v=y/(size-1);let ink=false;
  if(kind==='window')ink=!(u<.055||u>.945||v<.07||v>.93||Math.abs(u*4-Math.round(u*4))<.07);
  if(kind==='gable')ink=v<.06||(v<.8&&(Math.abs(u*16-Math.round(u*16))<.10||Math.abs(v*6-Math.round(v*6))<.08));
  if(kind==='story')ink=v<.085||v>.915;
  if(kind==='wall')ink=v<.065||v>.935||u<.04||u>.96||Math.abs(u-.5)<.02;
  const i=(y*size+x)*4,value=ink?50:245;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;cache.set(kind,map);return map;
}
