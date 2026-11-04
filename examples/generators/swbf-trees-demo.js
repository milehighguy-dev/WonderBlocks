import * as T from '../../vendor/three.module.js';
import {makePart,validateProject} from '../../src/core/model.js';

import {FLORA_TREE_PRESETS,instantiateFloraTreePreset} from '../../src/flora/flora-tree-presets.js';

export function swbfTreesDemo(){
 const positions=[[-37,0,-8],[-11,0,22],[16,0,-13],[44,0,19],[-20,0,-55],[34,0,-58]];
 const parts=FLORA_TREE_PRESETS.filter(p=>!p.planet).map((preset,i)=>makePart('flora',{...instantiateFloraTreePreset(preset.id),position:positions[i]}));
 return validateProject({format:'open-building-studio',version:1,name:'SWBF2 · Yavin, Dagobah & Endor trees',parts});
}

// A neutral, renderer-independent export of our generated wood and leafpatch data.
// Blender recreates each foliage card and its camera constraint from this payload.
export function exportBillboardPlant(part,group){
 group.updateMatrixWorld(true);const meshes=[],billboards=[];
 group.traverse(mesh=>{if(!mesh.isMesh)return;const data=mesh.geometry.userData.billboard;
  if(data){const organ=part.flora.organs.find(o=>o.id===mesh.parent.userData.floraOrgan),scale=new T.Vector3().setFromMatrixScale(mesh.matrixWorld);billboards.push({asset:organ.asset,organ:organ.id,facing:data.settings.facing,atlas:data.settings.atlas,cards:data.cards.map(c=>({...c,center:new T.Vector3(...c.center).applyMatrix4(mesh.matrixWorld).toArray(),width:c.width*scale.x,height:c.height*scale.y}))});return;}
  const g=mesh.geometry,positions=[];for(let i=0;i<g.attributes.position.count;i++)positions.push(new T.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(mesh.matrixWorld).toArray());
  meshes.push({positions,indices:Array.from(g.index?.array||Array.from({length:positions.length},(_,i)=>i)),uv:Array.from(g.attributes.uv?.array||[]),color:mesh.material.color.getHexString(),texture:exportTexture(mesh.material.map)});
 });return {name:part.name,flora:part.flora,meshes,billboards};
}
function exportTexture(map){
 const image=map?.image;if(image?.toDataURL)return image.toDataURL('image/png');
 if(!image?.data||typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(image.width,image.height);
 for(let y=0;y<image.height;y++){const row=map.flipY?y:image.height-1-y;pixels.data.set(image.data.subarray(row*image.width*4,(row+1)*image.width*4),y*image.width*4);}
 ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
}
