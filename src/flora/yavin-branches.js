import * as T from '../../vendor/three.module.js';
import {YAVIN_BRANCH_SOURCE as source} from './data/yavin-branch-source.js';

const maps=new Map();
export function yavinBranchTexture(alpha=false){
 if(maps.has(alpha))return maps.get(alpha);
 const data=Uint8Array.from(atob(source.texture.rgba),c=>c.charCodeAt(0));
 for(let i=0;i<data.length;i+=4){if(alpha)data[i]=data[i+1]=data[i+2]=data[i+3];data[i+3]=255;}
 const texture=new T.DataTexture(data,source.texture.width,source.texture.height,T.RGBAFormat);
 if(!alpha)texture.colorSpace=T.SRGBColorSpace;
 texture.flipY=false;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;maps.set(alpha,texture);return texture;
}

function sheet(crossed,morphs={}){
 const positions=[],uv=[],indices=[],width=T.MathUtils.lerp(.55,1.45,morphs.width??.5),length=T.MathUtils.lerp(.6,1.4,morphs.length??.5);
 for(let layer=0;layer<(crossed?2:1);layer++){
  const base=positions.length/3,angle=layer*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
  for(let i=0;i<source.positions.length;i+=3){const x=source.positions[i]*width,y=source.positions[i+1]*length,z=source.positions[i+2]*width;positions.push(x*c-z*s,y,x*s+z*c);}
  uv.push(...source.uv);indices.push(...source.indices.map(i=>i+base));
 }
 return {positions,uv,indices};
}

function part(id,name,crossed){
 const mesh=sheet(crossed);
 return {id,name,sourceName:'Yavin native fixed alpha branch planes · '+name,source:source.source,category:'Leaves',paletteCategory:'Branches',editorAxis:'z-to-y',texture:true,walkCollision:false,
  textureMap:()=>yavinBranchTexture(),alphaMap:()=>yavinBranchTexture(true),meshes:[mesh],get lowDetailMeshes(){return this.meshes;},triangles:mesh.indices.length/3,
  shapeControls:[{id:'width',name:'Branch spread',default:.5,start:[-.7,.2,0],end:[-.7,1.5,0]},{id:'length',name:'Branch length',default:.5,start:[.2,.2,0],end:[.2,2,0]}],shapeMesh:morphs=>sheet(crossed,morphs),
  iconUrl:new URL('../../assets/procedural-flora/'+id+'.png',import.meta.url).href};
}

// These are fixed surface decorations, not camera-facing leafpatch objects.
// Already-minimal planes remain two/four triangles in the distant mesh.
export const YAVIN_BRANCH_SPRAY=part('yavin-branch-spray','Yavin Branch Plane',false);
export const YAVIN_BRANCH_CROSS=part('yavin-branch-cross','Yavin Crossed Branch Planes',true);
export const YAVIN_BRANCH_PARTS=[YAVIN_BRANCH_SPRAY,YAVIN_BRANCH_CROSS];

export function withYavinBranchPlanes(preset){
 if(!['yavin-temple-broadleaf','yavin-slender-grove'].includes(preset.id))return preset;
 const flora=structuredClone(preset.floraPreset),boughs=flora.branches.filter(b=>b.parent&&!/root/i.test(b.name)).slice(0,4);
 for(const [i,b] of boughs.entries())flora.organs.push({id:preset.id+'-twig-plane-'+i,name:'Yavin textured twig branch '+(i+1),kind:'leaf',asset:i%2?YAVIN_BRANCH_SPRAY.id:YAVIN_BRANCH_CROSS.id,branch:b.id,at:.82,offset:[0,0,0],rotation:[0,.37+i*.71,-.35],scale:[1.25,1.35,1.25]});
 return {...preset,floraPreset:flora};
}
