import * as T from '../../vendor/three.module.js';
import {SWBF_FOLIAGE_SOURCE} from './data/swbf-foliage-source.js';

const textures=new Map();
export function billboardTexture(id,alpha=false){
 const key=id+(alpha?'-alpha':'');if(textures.has(key))return textures.get(key);
 const source=SWBF_FOLIAGE_SOURCE[id],data=Uint8Array.from(atob(source.rgba),c=>c.charCodeAt(0));
 for(let i=0;i<data.length;i+=4){if(alpha)data[i]=data[i+1]=data[i+2]=data[i+3];data[i+3]=255;}
 const texture=new T.DataTexture(data,source.width,source.height,T.RGBAFormat);
 if(!alpha)texture.colorSpace=T.SRGBColorSpace;
 texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.flipY=false;texture.needsUpdate=true;
 textures.set(key,texture);return texture;
}

export const BILLBOARD_LIMITS={count:[1,128],radius:[0,12],height:[0,12],minSize:[.05,16],maxSize:[.05,16],heightScale:[.1,4],darknessMin:[.2,1],darknessMax:[.2,1],seed:[0,65535],atlas:[1,4]};
const defaults={count:30,radius:1.5,height:.15,minSize:.9,maxSize:1.1,heightScale:.5,darknessMin:.5,darknessMax:1,seed:1,facing:'camera',atlas:2,anchor:'center'};
const quad={positions:[-.5,-.25,0,.5,-.25,0,.5,.25,0,-.5,.25,0],uv:[0,0,1,0,1,1,0,1],normals:[0,0,1,0,0,1,0,0,1,0,0,1],indices:[0,1,2,0,2,3]};
const preset=(id,name,values,odf,paletteCategory='Leaves')=>({id,name,sourceName:name,category:'Leaves',paletteCategory,texture:true,editorAxis:'z-to-y',billboard:{...defaults,...values},textureMap:()=>billboardTexture(id),alphaMap:()=>billboardTexture(id,true),iconUrl:new URL('../../assets/swbf-foliage/'+id+'.png',import.meta.url).href,source:odf,triangles:(values.count||30)*2,meshes:[quad]});
export const SWBF_BILLBOARD_PARTS=[
 preset('yavin-leaves','Yavin Broadleaf Canopy',{},'YAV/odf/yav_prop_leafpatch.odf'),
 preset('yavin-fine-leaves','Yavin Fineleaf Canopy',{count:20,radius:1.5,height:.3,minSize:.75,maxSize:.9},'YAV/odf/yav_prop_leafpatch2.odf'),
 preset('dagobah-canopy','Dagobah Swamp Canopy',{darknessMin:1},'DAG/odf/dag1_prop_leafpatch.odf'),
 preset('dagobah-vines','Dagobah Hanging Vines',{minSize:.3,maxSize:.3,heightScale:4,facing:'upright',anchor:'top'},'DAG/odf/dag1_prop_leafpatch_1.odf'),
 preset('endor-leaves','Endor Woodland Canopy',{count:20,radius:1.5,height:.3,minSize:.75,maxSize:.9},'END/odf/end_prop_leafpatch2.odf'),
 preset('endor-redwood-needles','Endor Needle Bough',{count:5,radius:.5,height:.4,minSize:1,maxSize:1.4,heightScale:.75,atlas:1},'END/msh/end_prop_tree01.msh'),
];
export function validateBillboard(settings){
 if(!settings||Array.isArray(settings)||typeof settings!=='object')throw Error('Invalid foliage billboard settings.');
 for(const [key,[min,max]] of Object.entries(BILLBOARD_LIMITS)){const x=settings[key];if(!Number.isFinite(x)||x<min||x>max||(['count','seed','atlas'].includes(key)&&!Number.isInteger(x)))throw Error('Invalid foliage billboard '+key+'.');}
 if(settings.minSize>settings.maxSize||settings.darknessMin>settings.darknessMax||!['camera','upright'].includes(settings.facing)||!['center','top','bottom'].includes(settings.anchor))throw Error('Invalid foliage billboard range.');
 return settings;
}
// Stable distribution: camera changes and rebuilding a plant never shuffle its leaves.
export function billboardCards(settings){
 validateBillboard(settings);let state=settings.seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 return Array.from({length:settings.count},()=>{const angle=random()*Math.PI*2,r=Math.sqrt(random())*settings.radius,width=T.MathUtils.lerp(settings.minSize,settings.maxSize,random()),height=width*settings.heightScale;return {center:[Math.cos(angle)*r,(random()-.5)*settings.height+(settings.anchor==='top'?-height/2:settings.anchor==='bottom'?height/2:0),Math.sin(angle)*r],width,height,shade:T.MathUtils.lerp(settings.darknessMin,settings.darknessMax,random()),tile:Math.floor(random()*settings.atlas**2)};});
}
export function billboardGeometry(settings){
 const cards=billboardCards(settings),geometry=new T.BufferGeometry(),position=[],normal=[],uv=[],color=[],indices=[],centers=[],corners=[];
 for(const [i,c] of cards.entries())for(const [x,y,u,v] of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){position.push(c.center[0]+x*c.width/2,c.center[1]+y*c.height/2,c.center[2]);centers.push(...c.center);corners.push(x*c.width/2,y*c.height/2);normal.push(0,0,1);uv.push((c.tile%settings.atlas+u)/settings.atlas,(Math.floor(c.tile/settings.atlas)+v)/settings.atlas);color.push(c.shade,c.shade,c.shade);if(x===-1&&y===-1)indices.push(i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3);}
 for(const [name,values,size] of [['position',position,3],['normal',normal,3],['uv',uv,2],['color',color,3]])geometry.setAttribute(name,new T.Float32BufferAttribute(values,size));
 geometry.setAttribute('billboardCenter',new T.Float32BufferAttribute(centers,3));geometry.setAttribute('billboardCorner',new T.Float32BufferAttribute(corners,2));
 geometry.setIndex(indices);geometry.userData.billboard={cards,settings:structuredClone(settings)};
 // A conservative orientation-independent bound includes every card corner.
 const box=new T.Box3();for(const c of cards){const r=Math.hypot(c.width,c.height)/2;box.expandByPoint(new T.Vector3(...c.center).addScalar(r));box.expandByPoint(new T.Vector3(...c.center).addScalar(-r));}
 geometry.boundingBox=box;geometry.boundingSphere=box.getBoundingSphere(new T.Sphere());return geometry;
}
export function updateBillboardFacing(mesh,camera){
 if(!camera)return;const data=mesh.geometry.userData.billboard;if(!data)return;
 camera.updateWorldMatrix(true,false);mesh.updateWorldMatrix(true,false);
 const key=camera.matrixWorld.elements.join(',')+'|'+mesh.matrixWorld.elements.join(',');if(mesh.userData.billboardFrame===key)return;mesh.userData.billboardFrame=key;
 const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0).normalize(),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1).normalize(),normal=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,2).normalize();
 if(data.settings.facing==='upright'){up.set(0,1,0);right.y=0;if(right.lengthSq()<1e-8)right.set(1,0,0);right.normalize();normal.crossVectors(right,up).normalize();}
 const scale=new T.Vector3().setFromMatrixScale(mesh.matrixWorld),inverse=mesh.matrixWorld.clone().invert(),center=new T.Vector3(),point=new T.Vector3(),localNormal=normal.clone().applyMatrix3(new T.Matrix3().setFromMatrix4(mesh.matrixWorld).transpose()).normalize(),positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;
 for(const [i,c] of data.cards.entries()){
  center.fromArray(c.center).applyMatrix4(mesh.matrixWorld);
  for(const [j,[x,y]] of [[-1,-1],[1,-1],[1,1],[-1,1]].entries()){point.copy(center).addScaledVector(right,x*c.width*scale.x/2).addScaledVector(up,y*c.height*scale.y/2).applyMatrix4(inverse);positions.setXYZ(i*4+j,point.x,point.y,point.z);normals.setXYZ(i*4+j,localNormal.x,localNormal.y,localNormal.z);}
 }
 positions.needsUpdate=normals.needsUpdate=true;
 mesh.geometry.computeBoundingBox();
}
export function buildBillboardMesh(settings,material){
 // Each patch supplies a different model inverse and scale to the shader.
 // Keep its uniform state private even when the asset material is cached.
 // Programs and texture objects still share their normal renderer caches.
 material=material.clone();
 material.vertexColors=true;material.userData.walkCollision=false;
 const mesh=new T.Mesh(billboardGeometry(settings),material);mesh.userData.floraBillboard=true;
 // Foliage is a cutout decoration, not a collision surface or a solid shadow slab.
 mesh.castShadow=false;mesh.receiveShadow=true;
 // GPU facing updates in the same draw, including the editor's on-demand renders.
 // CPU geometry is only posed when raycasting/exporting, never rewritten per frame.
 const uniforms={billboardInverse:{value:new T.Matrix4()},billboardRight:{value:new T.Vector3(1,0,0)},billboardUp:{value:new T.Vector3(0,1,0)},billboardScale:{value:new T.Vector3(1,1,1)},billboardNormal:{value:new T.Vector3(0,0,1)}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='attribute vec3 billboardCenter;\nattribute vec2 billboardCorner;\nuniform mat4 billboardInverse;\nuniform vec3 billboardRight;\nuniform vec3 billboardUp;\nuniform vec3 billboardScale;\nuniform vec3 billboardNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 billboardWorld = (modelMatrix * vec4(billboardCenter, 1.0)).xyz + billboardRight * billboardCorner.x * billboardScale.x + billboardUp * billboardCorner.y * billboardScale.y;\nvec3 transformed = (billboardInverse * vec4(billboardWorld, 1.0)).xyz;').replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\ntransformedNormal = billboardNormal;');
 };
 material.customProgramCacheKey=()=> 'flora-camera-billboards-v1';
 mesh.onBeforeRender=(_renderer,_scene,camera)=>{
  const right=uniforms.billboardRight.value,up=uniforms.billboardUp.value;
  right.setFromMatrixColumn(camera.matrixWorld,0).normalize();up.setFromMatrixColumn(camera.matrixWorld,1).normalize();
  if(mesh.geometry.userData.billboard.settings.facing==='upright'){up.set(0,1,0);right.y=0;if(right.lengthSq()<1e-8)right.set(1,0,0);right.normalize();}
  uniforms.billboardInverse.value.copy(mesh.matrixWorld).invert();uniforms.billboardScale.value.setFromMatrixScale(mesh.matrixWorld);uniforms.billboardNormal.value.crossVectors(right,up).transformDirection(camera.matrixWorldInverse);
 };
 mesh.raycast=function(raycaster,hits){
  updateBillboardFacing(this,raycaster.camera);const candidates=[];T.Mesh.prototype.raycast.call(this,raycaster,candidates);
  const mask=this.material.alphaMap,image=mask?.image;
  if(mask?.matrixAutoUpdate)mask.updateMatrix();
  for(const hit of candidates){if(image?.data&&hit.uv){const uv=mask.transformUv(hit.uv.clone()),x=Math.min(image.width-1,Math.floor(uv.x*image.width)),y=Math.min(image.height-1,Math.floor(uv.y*image.height));if(image.data[(y*image.width+x)*4+1]/255*this.material.opacity<this.material.alphaTest)continue;}hits.push(hit);}
 };return mesh;
}
