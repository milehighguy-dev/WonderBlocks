import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const base=new URL('../desktop/',import.meta.url),svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="42" fill="#232426"/><g transform="translate(32 24) scale(6)" fill="none" stroke="#edc66f" stroke-width="1.8" stroke-linejoin="round"><path d="m4 8 12-6 12 6-12 6z M4 8v15l12 7 12-7V8 M16 14v16 M4 16l12 7 12-7"/></g></svg>';
await writeFile(new URL('icon.svg',base),svg);
const images=[];for(const size of [16,32,48,256])images.push(await sharp(Buffer.from(svg)).resize(size,size).png().toBuffer());
await writeFile(new URL('icon.png',base),images.at(-1));
const header=Buffer.alloc(6+16*images.length);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;
for(let i=0;i<images.length;i++){const at=6+16*i,size=[16,32,48,256][i];header[at]=header[at+1]=size===256?0:size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(images[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=images[i].length;}
await writeFile(new URL('icon.ico',base),Buffer.concat([header,...images]));
