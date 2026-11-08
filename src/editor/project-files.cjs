const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');

exports.createProjectFileService=({choose}={})=>{
 const files=new Map();
 return {async handle(request){
  if(request.action==='capabilities')return {nativeDialog:!!choose};
  if(!choose)throw Error('Native project dialogs are unavailable.');
  if(request.action==='choose'){
   const selected=await choose({suggestedName:path.basename(request.suggestedName||'Untitled.building.json'),previousPath:files.get(request.previous)});
   if(!selected)return null;
   if(!path.isAbsolute(selected)||path.extname(selected).toLowerCase()!=='.json')throw Error('Choose a JSON project file.');
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
   return {name:path.basename(file)};
  }
  throw Error('Unknown project file action.');
 }};
};
