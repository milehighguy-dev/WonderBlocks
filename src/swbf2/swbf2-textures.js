import * as T from '../../vendor/three.module.js';
import {writeTGA} from './swbf2-binary.js';
import {textureContentId,textureFilename,sourceTextureLabel,tintName} from './swbf2-texture-names.js';
export {textureFilename} from './swbf2-texture-names.js';
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
const srgb=x=>Math.round(255*Math.max(0,Math.min(1,x<=.0031308?x*12.92:1.055*x**(1/2.4)-.055)));
function pixels(texture){
 if(!texture)return null;const image=texture.image;if(!image?.width||!image?.height)throw Error('A texture has not finished loading. Try exporting again once the scene is visible.');
 if(image.data){const channels=image.data.length/(image.width*image.height);if(!(image.data instanceof Uint8Array||image.data instanceof Uint8ClampedArray)||![1,2,3,4].includes(channels))throw Error('Unsupported texture pixel layout; export requires byte RGB or RGBA textures.');return {width:image.width,height:image.height,channels,data:image.data,texture};}
 if(typeof document==='undefined')throw Error('Image textures require the browser exporter.');const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return {width:image.width,height:image.height,channels:4,data:ctx.getImageData(0,0,image.width,image.height).data,texture};
}
function sample(image,u,v){if(!image)return [255,255,255,255];const t=image.texture;const wrap=(n,mode)=>mode===T.ClampToEdgeWrapping?Math.max(0,Math.min(.999999,n)):mode===T.MirroredRepeatWrapping?1-Math.abs((n%2+2)%2-1):(n%1+1)%1;
 u=wrap(u,t.wrapS);v=wrap(v,t.wrapT);if(t.flipY)v=1-v;const x=Math.min(image.width-1,Math.floor(u*image.width)),y=Math.min(image.height-1,Math.floor(v*image.height)),i=(y*image.width+x)*image.channels,d=image.data;
 return image.channels===1?[d[i],d[i],d[i],255]:image.channels===2?[d[i],d[i],d[i],d[i+1]]:[d[i],d[i+1],d[i+2],image.channels===4?d[i+3]:255];
}
export function exportMaterial(material,{maxTextureSize=512,uvBounds=[0,0,1,1],bakeUV=false,opaqueSolid=false}={}){
 if(material.map?.userData.unavailable)throw Error('Cannot export unreadable texture "'+material.map.userData.surfacePreset+'". Restore its image file or remove that texture from the object.');
 const image=pixels(material.map),alpha=pixels(material.alphaMap);for(const texture of [material.map,material.alphaMap])if(texture?.matrixAutoUpdate)texture.updateMatrix();
 // MSH material flags do not carry Three's per-axis wrapping modes. Bake
 // clamped/mirrored regions that leave the first tile into a finite UV range.
 const wrappingBake=[image,alpha].filter(Boolean).some(({texture})=>{const corners=[uvBounds.slice(0,2),[uvBounds[0],uvBounds[3]],[uvBounds[2],uvBounds[1]],uvBounds.slice(2)].map(p=>new T.Vector2(...p).applyMatrix3(texture.matrix));return [texture.wrapS,texture.wrapT].some((wrap,axis)=>wrap!==T.RepeatWrapping&&corners.some(p=>p.getComponent(axis)<-1e-7||p.getComponent(axis)>1+1e-7));});
 const independent=material.map&&material.alphaMap&&!material.map.matrix.elements.every((v,i)=>Math.abs(v-material.alphaMap.matrix.elements[i])<1e-9),uvRange=bakeUV||independent||wrappingBake?{min:uvBounds.slice(0,2),span:[Math.max(1e-6,uvBounds[2]-uvBounds[0]),Math.max(1e-6,uvBounds[3]-uvBounds[1])]}:null;
 const density=axis=>Math.max(...[image,alpha].filter(Boolean).map(p=>{const m=p.texture.matrix.elements;return wrappingBake?Math.hypot(m[axis*3]*p.width,m[axis*3+1]*p.height):axis?p.height:p.width;}),0)||16;
 const size=x=>Math.min(maxTextureSize,2**Math.ceil(Math.log2(Math.max(1,x)))),width=size(density(0)*(uvRange?.span[0]??1)),height=size(density(1)*(uvRange?.span[1]??1)),rgba=new Uint8Array(width*height*4),tint=material.color??new T.Color(1,1,1);let transparent=false;
 // Bake tint: ModelMunge does not preserve Blender/Three diffuse colours.
 // TGA rows are top-to-bottom; source sampling matches Three's texture flip.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x+.5)/width,v=1-(y+.5)/height,base=uvRange?new T.Vector2(uvRange.min[0]+u*uvRange.span[0],uvRange.min[1]+v*uvRange.span[1]):new T.Vector2(u,v),diffuseUV=uvRange&&material.map?base.clone().applyMatrix3(material.map.matrix):base,p=sample(image,diffuseUV.x,diffuseUV.y);let a=(material.transparent||material.alphaTest>0||alpha?p[3]/255*(material.opacity??1):1);
  if(alpha){const uv=uvRange?base.clone().applyMatrix3(alpha.texture.matrix):base;a*=sample(alpha,uv.x,uv.y)[1]/255;}
  const i=(y*width+x)*4,sourceSRGB=!image||image.texture.colorSpace===T.SRGBColorSpace;
  for(let c=0;c<3;c++)rgba[i+c]=srgb((sourceSRGB?linear(p[c]/255):p[c]/255)*[tint.r,tint.g,tint.b][c]);rgba[i+3]=Math.round(a*255);if(rgba[i+3]<255)transparent=true;
 }
 const flags=(material.side===T.DoubleSide&&(!opaqueSolid||transparent)?8:0)|(transparent?(material.alphaTest>0?16:4):0)|(material.isMeshBasicMaterial?1:0),bytes=writeTGA(width,height,rgba),hash=textureContentId(bytes),base=sourceTextureLabel(image),tintHex=tint.getHexString(),textureLabel=base+(tintHex==='ffffff'?'':'_'+tintName(tintHex));
 return {name:'mat_'+hash+'_'+flags,texture:textureFilename(bytes,textureLabel),textureLabel,flags,bytes,width,height,transparent,uvRange};
}
export function exportUV(material,u,v,uvRange=null){if(uvRange)return [(u-uvRange.min[0])/uvRange.span[0],(v-uvRange.min[1])/uvRange.span[1]];const texture=material.map??material.alphaMap;if(texture){if(texture.matrixAutoUpdate)texture.updateMatrix();const p=new T.Vector2(u,v).applyMatrix3(texture.matrix);return [p.x,p.y];}return [u,v];}
export function nativeLeafTexture(material,atlas,maxSize=512){
 if(atlas===2)return {texture:material.texture,bytes:material.bytes};
 // The native leafpatch shader samples a 2×2 sheet. A single needle-bough image
 // therefore needs four copies, rather than being inadvertently quartered.
 const source=material.bytes,view=new DataView(source.buffer,source.byteOffset),width=view.getUint16(12,true),height=view.getUint16(14,true),channels=source[16]/8,sourceSize=atlas===1?1:atlas,w=Math.min(maxSize,2**Math.ceil(Math.log2(width/sourceSize*2))),h=Math.min(maxSize,2**Math.ceil(Math.log2(height/sourceSize*2))),rgba=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const tileX=Math.floor(x/(w/2)),tileY=Math.floor(y/(h/2)),u=x/(w/2)%1,v=y/(h/2)%1,sx=Math.min(width-1,Math.floor((atlas===1?u:(tileX+u)/atlas)*width)),sy=Math.min(height-1,Math.floor((atlas===1?v:(tileY+v)/atlas)*height)),at=18+(sy*width+sx)*channels,i=(y*w+x)*4;rgba.set([source[at+2],source[at+1],source[at],channels===4?source[at+3]:255],i);}
 const bytes=writeTGA(w,h,rgba),same=bytes.length===material.bytes.length&&bytes.every((v,i)=>v===material.bytes[i]);return {texture:same?material.texture:textureFilename(bytes,material.textureLabel),bytes};
}
