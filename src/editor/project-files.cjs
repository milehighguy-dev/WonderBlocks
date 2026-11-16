const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');

exports.createProjectFileService=({choose,open,registryPath}={})=>{
 const files=new Map();let recent=[],pending=Promise.resolve();
 const valid=file=>typeof file==='string'&&path.isAbsolute(file)&&path.extname(file).toLowerCase()==='.json';
 const ready=(async()=>{if(!registryPath)return;try{const data=JSON.parse(await fs.readFile(registryPath,'utf8'));recent=Array.isArray(data)?data.filter(e=>e&&typeof e.id==='string'&&valid(e.path)&&typeof e.name==='string').slice(0,10):[];for(const e of recent)files.set(e.id,e.path);}catch(error){if(error.code!=='ENOENT')console.warn('Could not read recent projects:',error.message);}})();
 async function update(change){const operation=pending.catch(()=>{}).then(async()=>{await ready;change();if(registryPath){await fs.mkdir(path.dirname(registryPath),{recursive:true});const temp=registryPath+'.tmp';await fs.writeFile(temp,JSON.stringify(recent,null,2));await fs.rename(temp,registryPath);}});pending=operation;return operation;}
 async function read(id){const file=files.get(id);if(!file)throw Error('Choose a project file before opening it.');const info=await fs.stat(file);if(info.size>64*1024*1024)throw Error('Project files must be smaller than 64 MB.');const text=await fs.readFile(file,'utf8'),project=JSON.parse(text);if(project?.format!=='open-building-studio'||project.version!==1||!Array.isArray(project.parts))throw Error('Invalid project data.');return {id,name:path.basename(file),path:file,text};}
 async function remember(id){const result=await read(id),project=JSON.parse(result.text);await update(()=>{const key=result.path.toLowerCase(),previous=recent.find(e=>e.path.toLowerCase()===key);recent=[{id:previous?.id||id,name:result.name,path:result.path,projectName:project.name,lastOpened:Date.now()},...recent.filter(e=>e.path.toLowerCase()!==key)].slice(0,10);for(const e of recent)files.set(e.id,e.path);});}
 return {async handle(request){
  if(request.action==='capabilities')return {nativeDialog:!!choose,nativeOpen:!!open};
  if(!choose&&!open)throw Error('Native project dialogs are unavailable.');
  await ready;
  if(request.action==='recent'){await pending;return recent.map(e=>({...e,source:'file'}));}
  if(request.action==='forget'){await update(()=>{recent=recent.filter(e=>e.id!==request.id);});return null;}
  if(request.action==='clearRecent'){await update(()=>{recent=[];});return null;}
  if(request.action==='read')return read(request.id);
  if(request.action==='remember'){await remember(request.id);return null;}
  if(request.action==='open'){
   if(!open)throw Error('Native project opening is unavailable.');const file=await open();if(!file)return null;if(!valid(file))throw Error('Choose a JSON project file.');const id=randomUUID();files.set(id,file);return read(id);
  }
  if(request.action==='choose'){
   if(!choose)throw Error('Native project saving is unavailable.');
   const selected=await choose({suggestedName:path.basename(request.suggestedName||'Untitled.building.json'),previousPath:files.get(request.previous)});
   if(!selected)return null;
   if(!valid(selected))throw Error('Choose a JSON project file.');
   const id=randomUUID();files.set(id,selected);return {id,name:path.basename(selected)};
  }
  if(request.action==='write'){
   const file=files.get(request.id);if(!file)throw Error('Choose a project file before saving.');
   if(typeof request.text!=='string')throw Error('Missing project data.');
   const project=JSON.parse(request.text);if(project?.format!=='open-building-studio'||project.version!==1||!Array.isArray(project.parts))throw Error('Invalid project data.');
   // Replace only the file chosen in the native dialog, after a complete write.
   const temporary=path.join(path.dirname(file),'.'+path.basename(file)+'.'+randomUUID()+'.tmp');
   try{await fs.writeFile(temporary,request.text,{encoding:'utf8',flag:'wx'});await fs.rename(temporary,file);}
   finally{await fs.rm(temporary,{force:true}).catch(()=>{});}
   await remember(request.id);return {name:path.basename(file)};
  }
  throw Error('Unknown project file action.');
 }};
};
