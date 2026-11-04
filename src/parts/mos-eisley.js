import * as T from '../../vendor/three.module.js';
import {MOS_SOURCE,MOS_TEXTURES} from './data/mos-eisley-source.js';

// Stock pieces used by the five selected Mos Eisley building collections.
const names={
 'mos-entry-a':'Recessed entry · narrow','mos-entry-b':'Recessed entry · broad',
 'mos-entry-a-open':'Doorless entry · narrow','mos-entry-b-open':'Doorless entry · broad',
 'mos-arch':'Street arch',
 'mos-dome':'Low faceted dome','mos-buttress':'Tapered wall buttress',
 'mos-vent':'Roof vent','mos-canopy':'Rectangular cloth canopy'
};
export const MOS_EISLEY_PARTS=Object.entries(names).map(([id,name])=>({id,name,color:'#ffffff',category:'Mos Eisley',icon:'◇'}));
const textures=new Map();
export function mosTexture(id){
 if(textures.has(id))return textures.get(id);
 const source=MOS_TEXTURES[id];if(!source)throw Error('Missing Mos Eisley texture: '+id);
 const texture=new T.DataTexture(Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0)),source.width,source.height,T.RGBAFormat);
 texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;textures.set(id,texture);return texture;
}
export function mosSourceGroup(source,primary=new T.MeshStandardMaterial({color:'#ffffff',roughness:1})){
 const group=new T.Group(),materials=new Map();
 for(const s of source.meshes){
  const key=s.texture+':'+s.doubleSided;let material=materials.get(key);
  if(!material){material=primary.clone();material.map=mosTexture(s.texture);material.roughness=1;material.metalness=0;material.side=s.doubleSided?T.DoubleSide:T.FrontSide;materials.set(key,material);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(s.positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(s.uv,2));geometry.setIndex(s.indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }
 group.userData.mosSource={file:source.source,sha256:source.sha256,triangles:source.triangles};return group;
}
export function buildMosEisley(type,group,material){
 const source=MOS_SOURCE[type];if(!source)return;
 const built=mosSourceGroup(source,material);group.userData.mosSource=built.userData.mosSource;
 for(const mesh of [...built.children])group.add(mesh);
}
