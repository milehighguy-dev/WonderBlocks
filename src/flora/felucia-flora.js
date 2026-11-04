import * as T from '../../vendor/three.module.js';
import {FELUCIA_FLORA_SOURCE as source} from './data/felucia-flora-source.js';

const textures=new Map();
function texturePair(key){
 if(textures.has(key))return textures.get(key);
 const src=source.textures[key],pixels=Uint8Array.from(atob(src.rgba),c=>c.charCodeAt(0)),rgb=pixels.slice(),mask=pixels.slice();
 for(let i=0;i<pixels.length;i+=4){rgb[i+3]=255;mask[i]=mask[i+1]=mask[i+2]=pixels[i+3];mask[i+3]=255;}
 const make=data=>{const map=new T.DataTexture(data,src.width,src.height,T.RGBAFormat);map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.flipY=false;map.wrapS=map.wrapT=T.RepeatWrapping;map.needsUpdate=true;return map;};
 const map=make(rgb),alpha=make(mask);map.colorSpace=T.SRGBColorSpace;const pair={map,alpha};textures.set(key,pair);return pair;
}
// Native organs stay joint-free. The Whisker base trunk uses editable joints;
// its crown and tassels remain separate, skin-mounted details.
export const FELUCIA_FLORA_PARTS=source.parts.map(part=>({...part,
 surfaceHost:part.surfaceHost??(!part.profile&&part.paletteCategory==='Flora'),
 category:part.category||'Leaves',sourceName:part.source,editorAxis:'z-to-y',texture:true,
 textureMap:()=>texturePair(part.texture).map,
 alphaMap:()=>part.cutout?texturePair(part.texture).alpha:null,
 iconUrl:new URL('../../assets/felucia-flora/'+part.id+'.png',import.meta.url).href,
 triangles:part.meshes.reduce((n,m)=>n+m.indices.length/3,0)
}));
