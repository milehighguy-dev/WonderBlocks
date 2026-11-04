// Re-export can replace a combined asset with individual instances. Archive its
// now-unused managed MSH/ODF sources too: ModelMunge scans every source mesh,
// including obsolete ones which no longer appear in any generated layer.
const managed=/^(msh\/[a-z0-9_][a-z0-9_.-]*\.msh(?:\.option)?|odf\/[a-z0-9_][a-z0-9_.-]*\.odf)$/i;
async function directory(parent,name){try{return await parent.getDirectoryHandle(name);}catch(error){if(error.name==='NotFoundError')return null;throw error;}}
async function file(parent,name){try{return await (await parent.getFileHandle(name)).getFile();}catch(error){if(error.name==='NotFoundError')return null;throw error;}}
export async function retiredExportAssets(root,files,exportName,{previousReport=null,ownerId}={}){
 const metadata=await directory(root,'_wonderblocks'),exports=metadata&&await directory(metadata,'exports'),own=exports&&await directory(exports,exportName),previous=own&&await file(own,'export-report.json');if(!previous&&!previousReport)return {retired:[],retained:[]};
 const report=previousReport??JSON.parse(await previous.text());if(!Array.isArray(report.files))return {retired:[],retained:[]};
 const candidates=new Map([...report.files,...(report.destination?.retainedManagedSources||[])].filter(path=>managed.test(path)&&!files.has(path)).map(path=>[path.toLowerCase(),path]));if(!candidates.size)return {retired:[],retained:[]};
 const protectedPaths=new Set(),byName=new Map();
 for(const [key,path] of candidates){const name=path.split('/').at(-1);for(const alias of [name,name.replace(/\.(msh(?:\.option)?|odf)$/i,'')]){const normalized=alias.toLowerCase();if(!byName.has(normalized))byName.set(normalized,[]);byName.get(normalized).push(key);}}
 const protectText=text=>{for(const match of text.matchAll(/"([^"\r\n]+)"/g))for(const key of byName.get(match[1].toLowerCase())||[])protectedPaths.add(key);};
 // Another saved export can own the same descriptive/shared resource names.
 for await(const entry of exports.values())if(entry.kind==='directory'&&entry.name!==exportName){const other=await file(entry,'export-report.json');if(!other)continue;let record;try{record=JSON.parse(await other.text());}catch{return {retired:[],retained:[...candidates.values()]};}if(ownerId&&record.exportIdentity?.id===ownerId)continue;for(const path of record.files||[])if(typeof path==='string'&&candidates.has(path.toLowerCase()))protectedPaths.add(path.toLowerCase());}
 for(const name of ['world1','odf']){const source=await directory(root,name);if(!source)continue;for await(const entry of source.values())if(entry.kind==='file'&&/\.(wld|lyr|odf)$/i.test(entry.name)){
  const path=name+'/'+entry.name;if(candidates.has(path.toLowerCase()))continue;const incoming=files.get(path),existing=incoming?null:await entry.getFile();if(existing?.size>16*1024*1024)return {retired:[],retained:[...candidates.values()]};protectText(incoming?new TextDecoder().decode(incoming):await existing.text());
 }}
 const examined=new Set();while([...protectedPaths].some(path=>!examined.has(path))){for(const path of [...protectedPaths]){if(examined.has(path))continue;examined.add(path);if(/\.odf$/i.test(path)){const source=await directory(root,'odf'),entry=source&&await file(source,candidates.get(path).split('/').at(-1));if(entry)protectText(await entry.text());}if(/\.msh$/i.test(path)&&candidates.has(path+'.option'))protectedPaths.add(path+'.option');}}
 return {retired:[...candidates].filter(([key])=>!protectedPaths.has(key)).map(([,path])=>path),retained:[...candidates].filter(([key])=>protectedPaths.has(key)).map(([,path])=>path)};
}
