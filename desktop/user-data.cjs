const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function maybeRead(file){try{return await fs.readFile(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}}

// Keep the texture library writable outside the installed application. Updates
// replace untouched defaults, preserving users' additions, edits and deletions.
async function prepareTextureLibrary(defaults,userData){
 const destination=path.join(userData,'textures'),receipt=path.join(userData,'texture-defaults.json');
 await fs.mkdir(destination,{recursive:true});
 const stored=await maybeRead(receipt),previous=stored?JSON.parse(stored.toString()):{},next={...previous};
 async function visit(relative=''){
  for(const entry of await fs.readdir(path.join(defaults,relative),{withFileTypes:true})){
   const name=relative?relative+'/'+entry.name:entry.name,target=path.join(destination,name);
   if(entry.isDirectory()){await fs.mkdir(target,{recursive:true});await visit(name);continue;}
   if(!entry.isFile())continue;
   const source=await fs.readFile(path.join(defaults,name)),hash=digest(source),current=await maybeRead(target);
   if(!current&&!Object.hasOwn(previous,name)||current&&(digest(current)===previous[name]||digest(current)===hash)){
    if(!current||digest(current)!==hash)await fs.writeFile(target,source);
    next[name]=hash;
   }
  }
 }
 await visit();await fs.writeFile(receipt+'.tmp',JSON.stringify(next,null,2));await fs.rename(receipt+'.tmp',receipt);
 return destination;
}
module.exports={prepareTextureLibrary};
