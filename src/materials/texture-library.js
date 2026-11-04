// Browser, export workers and Node tools all load the same directory inventory.
const library=typeof process!=='undefined'&&process.versions?.node
 ?await (await import('./read-texture-library.cjs')).default.readTextureLibrary(process.env.WONDERBLOCKS_TEXTURE_DIR)
 :await (async()=>{const response=await fetch(new URL('/api/material-library',import.meta.url));if(!response.ok)throw Error('Could not load texture folders: '+await response.text());return response.json();})();
export const LIBRARY_CATEGORIES=library.categories;
export const LIBRARY_WARNINGS=library.warnings||[];
export const LIBRARY_SURFACES=library.surfaces.map(({rgba,hash,width,height,...surface})=>surface);
const contentNames=new Map(),textureNames=new Map();
for(const surface of [...library.surfaces].sort((a,b)=>(a.order??10000)-(b.order??10000)||(a.id<b.id?-1:a.id>b.id?1:0))){
 const key=surface.hash?surface.width+'x'+surface.height+':'+surface.hash:surface.id;
 if(!contentNames.has(key))contentNames.set(key,surface.name);textureNames.set(surface.id,contentNames.get(key));
}
export const libraryTextureName=id=>textureNames.get(id);
const images=new Map(library.surfaces.map(s=>[s.id,{width:s.width,height:s.height,unavailable:!!s.unavailable,alphaMode:s.alphaMode,data:Uint8Array.from(atob(s.rgba),c=>c.charCodeAt(0))}]));
export const libraryImage=id=>images.get(id);
export function libraryPixels(id,size=128){
 const image=images.get(id);if(!image)return null;
 const {data,width,height}=image;
 if(size===width&&size===height)return data.slice();
 const output=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const at=(Math.floor(y*height/size)*width+Math.floor(x*width/size))*4;output.set(data.subarray(at,at+4),(y*size+x)*4);}
 return output;
}
