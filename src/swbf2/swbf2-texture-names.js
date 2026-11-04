import {crc32,writeTGA} from './swbf2-binary.js';
import {TEXTURE_NAME_CATALOG} from './data/texture-name-catalog.js';
import {libraryTextureName} from '../materials/texture-library.js';

export const textureContentId=bytes=>crc32(bytes).toString(16).padStart(8,'0');
export const textureLabel=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'surface';
const imageKey=bytes=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint16(12,true)+'x'+new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint16(14,true)+'_'+textureContentId(bytes);

export function sourceTextureKey(image,{flip=false}={}){
 const {width,height,data}=image,channels=image.channels??data.length/(width*height),rgba=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const source=((flip?height-1-y:y)*width+x)*channels,at=(y*width+x)*4;
  const r=data[source],g=channels<3?r:data[source+1],b=channels<3?r:data[source+2],a=channels===2?data[source+1]:channels===4?data[source+3]:255;
  rgba.set([r,g,b,a],at);
 }
 return imageKey(writeTGA(width,height,rgba));
}
export const sourceTextureLabel=image=>image?TEXTURE_NAME_CATALOG[sourceTextureKey(image)]||libraryTextureName(image.texture?.userData.surfacePreset)||(image.texture?.userData.kotorTexture?'kotor_'+textureLabel(image.texture.userData.kotorTexture):'surface'):'solid';

export function tintName(hex){
 const channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255),maximum=Math.max(...channels),minimum=Math.min(...channels),delta=maximum-minimum,saturation=maximum?delta/maximum:0;
 if(maximum<.16)return 'black';if(saturation<.12)return maximum>.92?'white':maximum>.65?'lightgray':maximum>.3?'gray':'charcoal';
 const [r,g,b]=channels;let hue=(maximum===r?(g-b)/delta+(g<b?6:0):maximum===g?(b-r)/delta+2:(r-g)/delta+4)*60;
 if(hue>=15&&hue<65&&saturation<.4&&maximum>.65)return 'beige';
 if(hue<15||hue>=345)return 'red';if(hue<45)return maximum<.72?'brown':'orange';if(hue<70)return 'yellow';if(hue<160)return 'green';if(hue<190)return 'teal';if(hue<255)return 'blue';if(hue<290)return 'purple';return 'pink';
}

export function textureFilename(bytes,label='surface'){
 if(bytes.length<18||![24,32].includes(bytes[16]))throw Error('Texture naming requires a generated RGB/RGBA TGA.');
 const channels=bytes[16]/8;let invisible=channels===4,uniform=true;const first=bytes.subarray(18,18+channels);
 for(let at=18;at<bytes.length;at+=channels){
  if(channels===4&&bytes[at+3]!==0)invisible=false;
  for(let c=0;c<channels;c++)if(bytes[at+c]!==first[c])uniform=false;
  if(!invisible&&!uniform)break;
 }
 if(invisible)label='invisible';
 else if(uniform){const hex=[first[2],first[1],first[0]].map(n=>n.toString(16).padStart(2,'0')).join('');label='solid_'+tintName(hex);}
 else label=TEXTURE_NAME_CATALOG[imageKey(bytes)]||label;
 // The readable stem is independent of object/project identity; the original
 // image checksum remains a stable suffix for tint, alpha and size variants.
 return 'wb_'+textureLabel(label).slice(0,38).replace(/_$/,'')+'_'+textureContentId(bytes)+'.tga';
}
