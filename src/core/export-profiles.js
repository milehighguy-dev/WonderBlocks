const enums={output:['scene','object','mesh'],destination:['zip','folder'],'class-label':['prop','building'],textures:['128','256','512','1024'],'scene-update':['placements','assets'],'cleanup-navigation':['keep','remove']};
const checks=['unique-names','low-detail','collision','collision-helpers','shadows','ai-navigation','merge-navigation'];
const text=['export-name','target-world','merge-world'];
export const EXPORT_PROFILE_FIELDS=[...Object.keys(enums),...checks,...text,'sections'];
export function validateExportProfiles(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!data.profiles||typeof data.profiles!=='object'||Array.isArray(data.profiles)||Object.keys(data.profiles).length>2048)throw Error('Invalid export profiles.');
 const profiles={};
 for(const [key,profile] of Object.entries(data.profiles)){
  if(!/^(scene|asset):[a-zA-Z0-9_:|.-]{1,150}$/.test(key)||!profile||typeof profile.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(profile.id)||!profile.values||typeof profile.values!=='object'||Array.isArray(profile.values))throw Error('Invalid export profile.');
  const values={};for(const [field,value] of Object.entries(profile.values)){
   if(Object.hasOwn(enums,field)){if(!enums[field].includes(value))throw Error('Invalid export choice.');}
   else if(checks.includes(field)){if(typeof value!=='boolean')throw Error('Invalid export checkbox.');}
   else if(text.includes(field)){if(typeof value!=='string'||value.length>(field==='merge-world'?1024:100))throw Error('Invalid export name.');}
   else if(field==='sections'){if(!['string','number'].includes(typeof value)||!Number.isInteger(Number(value))||Number(value)<1||Number(value)>24)throw Error('Invalid export section count.');}
   else continue;values[field]=value;
  }
  if(profile.folderId!==undefined&&(typeof profile.folderId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(profile.folderId)))throw Error('Invalid remembered export folder.');
  profiles[key]={id:profile.id,values,...(profile.folderId?{folderId:profile.folderId}:{})};
 }
 if(data.active!==undefined&&(!Object.hasOwn(profiles,data.active)))throw Error('Invalid active export profile.');
 return {profiles,...(data.active!==undefined?{active:data.active}:{})};
}
function hash(value){let a=2166136261,b=3335557771;for(const char of value){a=Math.imul(a^char.charCodeAt(0),16777619);b=Math.imul(b^char.charCodeAt(0),2246822519);}return (a>>>0).toString(16)+(b>>>0).toString(16);}
export function exportProfileKey(project,ids,output){
 const parts=project.parts.filter(p=>p.type!=='character-reference'&&(!ids||ids.includes(p.id)));let scope='scene';
 if(ids||output!=='scene'){
  if(parts.length===1)scope='part:'+parts[0].id;
  else if(parts.length&&parts.every(p=>p.assemblyId===parts[0].assemblyId)&&parts[0].assemblyId&&project.parts.filter(p=>p.assemblyId===parts[0].assemblyId).length===parts.length)scope='group:'+parts[0].assemblyId;
  else scope='selection:'+hash(parts.map(p=>p.id).sort().join('|'));
 }
 return (output==='scene'?'scene:':'asset:')+scope;
}
export const activeExportProfile=project=>project.swbf2Exports?.profiles[project.swbf2Exports.active];
export const exportLayerName=(id,label='scene')=>'wb_'+(label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,24)||'scene')+'_'+hash(id).padStart(16,'0');
