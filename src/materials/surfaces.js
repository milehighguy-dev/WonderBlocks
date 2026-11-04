import {LIBRARY_SURFACES,libraryPixels,libraryImage} from './texture-library.js';
import {patternFactors} from './pattern-scaling.js';
import * as THREE from '../../vendor/three.module.js';
export const SURFACES=[...LIBRARY_SURFACES,{id:'plain',name:'Plain',roughness:.72,metalness:.05}];
export const SURFACE_THEMES=['All',...new Set(LIBRARY_SURFACES.flatMap(s=>s.themes))];
export function surfacesForTheme(theme){return SURFACES.filter(s=>theme==='All'||s.id==='plain'||s.themes?.includes(theme));}
const cache=new Map();
export function surfacePixels(id,size=128){return libraryPixels(id,size)||new Uint8Array(size*size*4).fill(255);}
export function surfaceTexture(id){
 if(!cache.has(id)){const image=libraryImage(id)||{data:surfacePixels(id),width:128,height:128};const texture=new THREE.DataTexture(image.data,image.width,image.height);texture.userData.surfacePreset=id;texture.userData.unavailable=!!image.unavailable;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;cache.set(id,texture);}return cache.get(id);
}
export function applySurface(group,primary,part){
 const preset=SURFACES.find(s=>s.id===part.surface?.preset);if(!preset)return;primary.userData.surfaceScale=part.surface?.scale??1;primary.roughness=preset.roughness;primary.metalness=preset.metalness;
 if(primary.userData.surfaceOptics){Object.assign(primary,primary.userData.surfaceOptics);delete primary.userData.surfaceOptics;primary.needsUpdate=true;}
 if(preset.id==='waterfall'||['mask','blend'].includes(preset.alphaMode)){
  primary.userData.surfaceOptics??={transparent:primary.transparent,depthWrite:primary.depthWrite,side:primary.side,alphaTest:primary.alphaTest};
  const blend=preset.id==='waterfall'||preset.alphaMode==='blend';primary.transparent=blend;primary.depthWrite=!blend;primary.alphaTest=blend?0:.5;if(preset.id==='waterfall')primary.side=THREE.DoubleSide;primary.needsUpdate=true;
 }
 if(preset.id==='plain'){primary.map=null;primary.bumpMap=null;primary.needsUpdate=true;return;}
 primary.map=surfaceTexture(preset.id);primary.bumpMap=primary.map;primary.bumpScale=preset.id==='marble'||preset.id==='metal'?.012:.035;primary.roughness=preset.roughness;primary.metalness=preset.metalness;
 updateSurfaceUVs(group,primary,part);
}
export function updateSurfaceUVs(group,primary,part){
 const density=part.surface.scale,scale=new THREE.Vector3(...patternFactors(part,'texture')),offset=new THREE.Vector3(...(part.surfaceOffset||[0,0,0]));
 // Project in part space, accounting for part scale, so adjacent component meshes align.
 // Flora branches own an attachment matrix; recomposing it from their default
 // position/rotation/scale drops the live mesh to the plant origin.
 group.traverse(m=>{if(!m.isMesh||m.material!==primary)return;if(m.matrixAutoUpdate)m.updateMatrix();const old=m.geometry;const g=old.index?old.toNonIndexed():old;if(g!==old){m.geometry=g;old.dispose();}const pos=g.attributes.position,uv=new Float32Array(pos.count*2);
 if(g.attributes.aqueductUV){const source=g.attributes.aqueductUV,u=g.attributes.aqueductU,v=g.attributes.aqueductV;for(let i=0;i<pos.count;i++){uv[i*2]=source.getX(i)*new THREE.Vector3().fromBufferAttribute(u,i).multiply(scale).length()*density;uv[i*2+1]=source.getY(i)*new THREE.Vector3().fromBufferAttribute(v,i).multiply(scale).length()*density;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return;}
 if(g.attributes.yavinTrimUV&&part.surface.preset==='yavin-bridge-trim'){const source=g.attributes.yavinTrimUV,u=g.attributes.yavinTrimU,v=g.attributes.yavinTrimV;for(let i=0;i<pos.count;i++){uv[i*2]=source.getX(i)*new THREE.Vector3().fromBufferAttribute(u,i).multiply(scale).length()*density;uv[i*2+1]=source.getY(i)*new THREE.Vector3().fromBufferAttribute(v,i).multiply(scale).length()*density;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return;}
 if(g.attributes.roofUV){const source=g.attributes.roofUV,u=g.attributes.roofU,v=g.attributes.roofV;for(let i=0;i<pos.count;i++){const ud=new THREE.Vector3().fromBufferAttribute(u,i).multiply(scale),vd=new THREE.Vector3().fromBufferAttribute(v,i).multiply(scale);uv[i*2]=source.getX(i)*ud.length()*density;uv[i*2+1]=source.getY(i)*vd.length()*density;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return;}
 if(g.attributes.highwayRoadUV&&part.surface.preset.startsWith('highway-')){const source=g.attributes.highwayRoadUV;for(let i=0;i<pos.count;i++){uv[i*2]=source.getX(i);uv[i*2+1]=source.getY(i)*Math.abs(scale.z)*density/4;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return;}
 if(g.attributes.buildingUV){const source=g.attributes.buildingUV,axes=g.attributes.buildingUVAxes,factors=[Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z)];for(let i=0;i<pos.count;i++){uv[i*2]=source.getX(i)*factors[axes.getX(i)]*density;uv[i*2+1]=source.getY(i)*factors[axes.getY(i)]*density;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return;}
 if(g.attributes.highwayUV){const source=g.attributes.highwayUV,axes=g.attributes.highwayUVAxes,factors=[Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z)];for(let i=0;i<pos.count;i++){uv[i*2]=source.getX(i)*factors[axes.getX(i)]*density;uv[i*2+1]=source.getY(i)*factors[axes.getY(i)]*density;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return;}
 if(m.userData.routeFloor){
  const heading=m.rotation.y,c=Math.cos(heading),n=Math.sin(heading),factors=[Math.hypot(scale.x*c,scale.z*n),Math.abs(scale.y),Math.hypot(scale.x*n,scale.z*c)];
  const source=g.attributes.routeUV,axes=g.attributes.routeUVAxes;
  if(source&&axes){for(let i=0;i<pos.count;i++){
   // Keep the curve unwrapped horizontally, but use the finished height after ground anchoring.
   const uAxis=axes.getX(i),vAxis=axes.getY(i);
   uv[i*2]=(uAxis===1?pos.getY(i):source.getX(i))*factors[uAxis]*density;
   uv[i*2+1]=(vAxis===1?pos.getY(i):source.getY(i))*factors[vAxis]*density;
  }}
  else for(let i=0;i<pos.count;i+=3){const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,i+j));const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));const axis=Math.abs(normal.y)>1e-7?'y':Math.abs(normal.x)>Math.abs(normal.z)?'x':'z';vertices.forEach((v,j)=>{uv[(i+j)*2]=(axis==='x'?v.z*factors[2]:v.x*factors[0])*density;uv[(i+j)*2+1]=(axis==='y'?v.z*factors[2]:v.y*factors[1])*density;});}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return;
 }
 for(let i=0;i<pos.count;i+=3){const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,i+j).applyMatrix4(m.matrix).add(offset).multiply(scale));const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));const axis=Math.abs(normal.y)>=Math.max(Math.abs(normal.x),Math.abs(normal.z))?'y':Math.abs(normal.x)>Math.abs(normal.z)?'x':'z';vertices.forEach((v,j)=>{uv[(i+j)*2]=(axis==='x'?v.z:v.x)*density;uv[(i+j)*2+1]=(axis==='y'?v.z:v.y)*density;});}
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));});
}
