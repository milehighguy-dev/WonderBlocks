import * as T from '../../vendor/three.module.js';
import {TRUNK_BASE_DESIGNS} from './temp-base-trunks.js';
import {ROOT_BASE_DESIGNS} from './temp-base-roots.js';
import {TEMP_BASE_MESHES} from './data/temp-base-meshes.js';
import {BF2_FLORA_MATERIALS} from './data/bf2-flora-materials.js';

// Six bases cover different structural roles. All skeletons, profiles
// and surfaces are newly authored; only the existing BF2 bark material is reused.
export const TEMP_BASE_DESIGNS=[...TRUNK_BASE_DESIGNS,...ROOT_BASE_DESIGNS];
export const TEMP_BASE_FIELDS=Object.fromEntries(TEMP_BASE_DESIGNS.map(a=>[a.id,a.edges]));
const roles={stem:'Tapered rooted stem',fork:'Unequal split leaders',crooked:'Bent trunk with a broken side bough',bulbous:'Swollen trunk with short crown boughs',buttress:'Broad blade-shaped root flares',stilt:'Raised trunk with open root arches'};
let bark;
function barkTexture(){
 if(bark)return bark;
 const source=BF2_FLORA_MATERIALS.bark,data=Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0));
 for(let i=0;i<data.length;i+=4){const light=(data[i]*.24+data[i+1]*.62+data[i+2]*.14)/255,shade=Math.round(255*Math.min(1,.26+Math.pow(light,.65)*1.05));data[i]=shade;data[i+1]=Math.round(shade*.96);data[i+2]=Math.round(shade*.9);data[i+3]=255;}
 bark=new T.DataTexture(data,source.width,source.height,T.RGBAFormat);bark.colorSpace=T.SRGBColorSpace;bark.flipY=false;bark.wrapS=bark.wrapT=T.RepeatWrapping;bark.generateMipmaps=true;bark.minFilter=T.LinearMipmapLinearFilter;bark.magFilter=T.LinearFilter;bark.needsUpdate=true;return bark;
}
export const TEMP_BASE_PARTS=TEMP_BASE_DESIGNS.map(design=>{
 const mesh=TEMP_BASE_MESHES[design.id]||{positions:[],uv:[],indices:[]};
 return {id:design.id,name:design.name,sourceName:design.name,reviewRole:roles[design.id.slice(10)],source:'Independently authored trunk and root volumes with stock BF2 bark',category:'Trunks',paletteCategory:'Bases',assembly:true,editorAxis:'z-to-y',skeleton:design.skeleton,texture:true,textureMap:barkTexture,alphaMap:()=>null,iconUrl:new URL('../../assets/temp-bases/'+design.id+'.png',import.meta.url).href,meshes:[mesh],triangles:mesh.indices.length/3};
});
