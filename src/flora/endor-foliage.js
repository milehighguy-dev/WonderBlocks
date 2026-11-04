import * as T from '../../vendor/three.module.js';
import {ENDOR_REDWOOD_SPRAY_SOURCE as source} from './data/endor-foliage-source.js';

const textures=new Map();
export function endorSprayTexture(alpha=false){
 if(textures.has(alpha))return textures.get(alpha);
 const data=Uint8Array.from(atob(source.texture.rgba),c=>c.charCodeAt(0));
 for(let i=0;i<data.length;i+=4){if(alpha)data[i]=data[i+1]=data[i+2]=data[i+3];data[i+3]=255;}
 const texture=new T.DataTexture(data,source.texture.width,source.texture.height,T.RGBAFormat);
 if(!alpha)texture.colorSpace=T.SRGBColorSpace;
 texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.flipY=false;texture.needsUpdate=true;
 textures.set(alpha,texture);return texture;
}

// Original fixed, folded foliage geometry; the camera never turns these leaves.
export const ENDOR_REDWOOD_SPRAY={
 id:'endor-redwood-spray',name:'Endor Redwood Spray',sourceName:'Endor tall tree native needle spray',
 category:'Leaves',paletteCategory:'Leaves',editorAxis:'z-to-y',texture:true,
 textureMap:()=>endorSprayTexture(),alphaMap:()=>endorSprayTexture(true),
 iconUrl:new URL('../../assets/swbf-foliage/endor-redwood-spray.png',import.meta.url).href,
 source:source.source,triangles:source.indices.length/3,
 meshes:[{positions:source.positions,normals:source.normals,uv:source.uv,indices:source.indices}]
};

// A leaf group with a common mounting point, like the game's attached foliage.
// The five native folded sprays fan out without adding any wooden skeleton.
const groupMesh={positions:[],normals:[],uv:[],indices:[]};
for(const [i,angle] of [-.48,-.24,0,.24,.48].entries()){
 const q=new T.Quaternion().setFromEuler(new T.Euler(angle,0,(i%2-.5)*.12)),size=[.87,1,1.05,1,.87][i],base=groupMesh.positions.length/3;
 for(let j=0;j<source.positions.length;j+=3){groupMesh.positions.push(...new T.Vector3().fromArray(source.positions,j).multiplyScalar(size).applyQuaternion(q).toArray());groupMesh.normals.push(...new T.Vector3().fromArray(source.normals,j).applyQuaternion(q).toArray());}
 groupMesh.uv.push(...source.uv);groupMesh.indices.push(...source.indices.map(n=>n+base));
}
export const ENDOR_REDWOOD_FOLIAGE={...ENDOR_REDWOOD_SPRAY,id:'endor-redwood-foliage',name:'Endor Redwood Foliage',sourceName:'Endor tall tree attached leaf group',triangles:groupMesh.indices.length/3,meshes:[groupMesh],iconUrl:new URL('../../assets/swbf-foliage/endor-redwood-foliage.png',import.meta.url).href};
