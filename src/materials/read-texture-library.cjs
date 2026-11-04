const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const crypto=require('node:crypto');
const DEFAULT_TEXTURE_ROOT=path.resolve(__dirname,'../../textures');
const EXTENSIONS=new Set(['.png','.jpg','.jpeg','.webp','.tif','.tiff','.gif','.avif','.tga']);
const slug=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const title=value=>value.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const cache=new Map();
async function optionalJSON(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw new Error(`${file}: ${e.message}`);}}
// TGA is common in the Mod Tools. Decode both raw and RLE true-color/grayscale,
// including the origin bits, before passing pixels to the common image reader.
function decodeTGA(bytes){
 if(bytes.length<18)throw Error('Incomplete TGA header');
 const type=bytes[2],width=bytes.readUInt16LE(12),height=bytes.readUInt16LE(14),bits=bytes[16],channels=bits/8;
 if(bytes[1]||![2,3,10,11].includes(type)||!width||!height||width*height>16777216||!([3,11].includes(type)?[8,16]:[24,32]).includes(bits))throw Error('Unsupported TGA image');
 const output=Buffer.alloc(width*height*4),rle=type===10||type===11,gray=type===3||type===11;
 let at=18+bytes[0],pixel=0;
 const sample=()=>{if(at+channels>bytes.length)throw Error('Incomplete TGA pixels');const p=gray?[bytes[at],bytes[at],bytes[at],channels===2?bytes[at+1]:255]:[bytes[at+2],bytes[at+1],bytes[at],channels===4?bytes[at+3]:255];at+=channels;return p;};
 const put=p=>{const x=pixel%width,y=Math.floor(pixel/width),targetX=bytes[17]&16?width-1-x:x,targetY=bytes[17]&32?y:height-1-y;output.set(p,(targetY*width+targetX)*4);pixel++;};
 while(pixel<width*height){if(!rle){put(sample());continue;}if(at>=bytes.length)throw Error('Incomplete TGA packet');const packet=bytes[at++],count=(packet&127)+1;if(pixel+count>width*height)throw Error('TGA packet exceeds image');if(packet&128){const p=sample();for(let i=0;i<count;i++)put(p);}else for(let i=0;i<count;i++)put(sample());}
 return {data:output,width,height};
}
async function readTextureLibrary(textureRoot=DEFAULT_TEXTURE_ROOT,{strict=false}={}){
 textureRoot=path.resolve(textureRoot);
 const warnings=[],issue=(file,error)=>{const message=path.relative(textureRoot,file)+': '+error.message;if(strict)throw Error(message);warnings.push(message);};
 const json=async file=>{try{const value=await optionalJSON(file);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Expected a JSON object');return value;}catch(error){issue(file,error);return {};}};
 const text=(value,fallback)=>typeof value==='string'&&value.trim()?value:fallback;
 const folders=(await fs.readdir(textureRoot,{withFileTypes:true})).filter(f=>f.isDirectory()&&!f.name.startsWith('.')).sort((a,b)=>a.name.localeCompare(b.name));
 const surfaces=new Map(),categories=[];
 for(const folder of folders){
  const directory=path.join(textureRoot,folder.name),settings=await json(path.join(directory,'_category.json')),id=slug(folder.name);
  if(!id||id==='all'){issue(directory,Error('Reserved or invalid texture category'));continue;}
  if(categories.some(c=>c.id===id)){issue(directory,Error('Duplicate texture category'));continue;}
  const category={id,name:text(settings.name,title(folder.name)),order:Number.isFinite(settings.order)?settings.order:10000,ids:[],preview:Array.isArray(settings.preview)?settings.preview.filter(s=>typeof s==='string'):[]};
  let entries;try{entries=await fs.readdir(directory,{withFileTypes:true});}catch(error){issue(directory,error);continue;}
  const images=entries.filter(f=>f.isFile()&&!f.name.startsWith('.')&&EXTENSIONS.has(path.extname(f.name).toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  for(const image of images){
   const file=path.join(directory,image.name),stem=path.parse(image.name).name,textureId=slug(stem);
   if(!textureId||textureId==='plain'){issue(file,Error('Reserved or invalid texture name'));continue;}
   const meta=await json(path.join(directory,stem+'.json'));let source;
   try{
    const stat=await fs.stat(file);if(stat.size>64*1024*1024)throw Error('Image file exceeds 64 MB');
    // Windows can preserve size and timestamps across rapid overwrites. Cache
    // decoded pixels by source content rather than trusting those timestamps.
    const bytes=await fs.readFile(file),fingerprint=crypto.createHash('sha256').update(bytes).digest('hex'),previous=cache.get(file);
    if(previous?.fingerprint===fingerprint)source=previous.source;
    else{
     const tga=path.extname(file).toLowerCase()==='.tga'?decodeTGA(bytes):null;
     const reader=tga?sharp(tga.data,{raw:{width:tga.width,height:tga.height,channels:4}}):sharp(bytes,{limitInputPixels:16777216});
     const {data,info}=await reader.rotate().resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
     let alphaMode='opaque';for(let i=3;i<data.length;i+=4)if(data[i]<255){alphaMode=data[i]===0?'mask':'blend';if(alphaMode==='blend')break;}
     source={width:info.width,height:info.height,alphaMode,rgba:data.toString('base64'),hash:crypto.createHash('sha256').update(data).digest('hex')};cache.set(file,{fingerprint,source});
    }
   }catch(error){
    issue(file,Error('Could not read image: '+error.message));
    const data=Buffer.alloc(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const tone=((x>>4)+(y>>4))%2?125:205;data.set([tone,tone,tone,255],(y*128+x)*4);}
    source={width:128,height:128,alphaMode:'opaque',rgba:data.toString('base64'),hash:crypto.createHash('sha256').update(data).digest('hex'),unavailable:true};
   }
   const number=(value,fallback)=>Number.isFinite(value)&&value>=0&&value<=1?value:fallback;
   delete meta.unavailable;
   const surface={...meta,id:textureId,name:text(meta.name,title(stem)),roughness:number(meta.roughness,.85),metalness:number(meta.metalness,0),order:Number.isFinite(meta.order)?meta.order:10000,themes:Array.isArray(meta.themes)?meta.themes.filter(s=>typeof s==='string'):[],...source};
   const existing=surfaces.get(textureId);
   if(existing&&(existing.hash!==surface.hash||existing.roughness!==surface.roughness||existing.metalness!==surface.metalness||existing.name!==surface.name)){issue(file,Error('Conflicting textures named '+textureId+'. Give different images different filenames.'));continue;}
   if(!existing)surfaces.set(textureId,surface);
   if(!category.ids.includes(textureId))category.ids.push(textureId);
  }
  if(category.ids.length){category.preview=category.preview.filter(id=>category.ids.includes(id));if(!category.preview.length)category.preview=category.ids.slice(0,4);categories.push(category);}
 }
 categories.sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name));
 return {surfaces:[...surfaces.values()].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name)),categories,warnings};
}

module.exports={readTextureLibrary,DEFAULT_TEXTURE_ROOT,decodeTGA};
