import {createRecentProjectStore} from './recent-projects.js';
const types=[{description:'Wonderblocks project',accept:{'application/json':['.building.json','.json']}}];

export function createProjectFiles({fetcher=globalThis.fetch?.bind(globalThis),pickFile=globalThis.showSaveFilePicker?.bind(globalThis),openFile=globalThis.showOpenFilePicker?.bind(globalThis),download,recentStore=createRecentProjectStore(),onRecentChanged=()=>{}}={}){
 let target=null,busy=false,generation=0;
 const request=async body=>{const response=await fetcher('/api/project-file',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||'Could not access the project file.');}return response.json();};
 const capabilities=fetcher?request({action:'capabilities'}).catch(()=>({})):Promise.resolve({});
 const native=capabilities.then(result=>result.nativeDialog);
 async function remember(file,text){
  if(file.native){await request({action:'remember',id:file.id});}
  else{const entries=await recentStore.list();let previous;for(const e of entries){if(file.handle&&e.handle?.isSameEntry){if(await e.handle.isSameEntry(file.handle)){previous=e;break;}}else if(!file.handle&&!e.handle&&e.name===file.name){previous=e;break;}}
   const entry={id:previous?.id||crypto.randomUUID(),name:file.name,projectName:JSON.parse(text).name,lastOpened:Date.now(),source:file.handle?'file':'snapshot',text,...(file.handle?{handle:file.handle}:{})};await recentStore.write([entry,...entries.filter(e=>e.id!==entry.id)].slice(0,10));}
  await onRecentChanged();
 }
 return {
  get name(){return target?.name||null;},
  reset(){generation++;target=null;},
  async recent(){if((await capabilities).nativeOpen)return request({action:'recent'});return (await recentStore.list()).map(({handle,text,...entry})=>entry);},
  async forgetRecent(id){if((await capabilities).nativeOpen)await request({action:'forget',id});else await recentStore.write((await recentStore.list()).filter(e=>e.id!==id));await onRecentChanged();},
  async clearRecent(){if((await capabilities).nativeOpen)await request({action:'clearRecent'});else await recentStore.write([]);await onRecentChanged();},
  async open(){
   try{if((await capabilities).nativeOpen){const file=await request({action:'open'});return file?{...file,native:true}:null;}
    if(!openFile)return {fallback:true};const [handle]=await openFile({types,excludeAcceptAllOption:true,multiple:false});if(!handle)return null;const file=await handle.getFile();return {handle,name:file.name,text:await file.text()};
   }catch(error){if(error.name==='AbortError')return null;throw error;}
  },
  async openRecent(id){
   if((await capabilities).nativeOpen)return {...await request({action:'read',id}),native:true};
   const entry=(await recentStore.list()).find(e=>e.id===id);if(!entry)throw Error('This recent project is no longer listed.');
   if(entry.handle){if(entry.handle.queryPermission&&await entry.handle.queryPermission({mode:'read'})!=='granted'&&await entry.handle.requestPermission({mode:'read'})!=='granted')throw Error('File access was not granted. Use Open to choose the project again.');const file=await entry.handle.getFile();return {handle:entry.handle,name:file.name,text:await file.text()};}
   return {name:entry.name,text:entry.text,snapshot:true};
  },
  async opened(file){if(!file.snapshot)target=file.handle||file.native?file:null;await remember(file,file.text);},
  async imported(file,text){await remember({name:file.name},text);},
  async save(text,suggestedName,{saveAs=false}={}){
   if(busy)return {status:'busy'};busy=true;const document=generation,previous=target;
   try{
    let next=saveAs?null:previous;
    if(await native){
     if(!next){const selected=await request({action:'choose',suggestedName:previous?.name||suggestedName,previous:previous?.id});if(!selected)return {status:'cancelled'};next={...selected,native:true};}
     await request({action:'write',id:next.id,text});
    }else if(pickFile){
     if(!next){const handle=await pickFile({suggestedName:previous?.name||suggestedName,types,excludeAcceptAllOption:true,...(previous?.handle?{startIn:previous.handle}:{})});next={handle,name:handle.name};}
     const writable=await next.handle.createWritable();
     try{await writable.write(text);await writable.close();}catch(error){await writable.abort?.().catch(()=>{});throw error;}
    }else{
     download(text,suggestedName,'application/json');await remember({name:suggestedName},text);return {status:'downloaded',name:suggestedName};
    }
    if(document===generation){target=next;if(next.native)await onRecentChanged();else await remember(next,text);}
    return {status:'saved',name:next.name};
   }catch(error){if(error.name==='AbortError')return {status:'cancelled'};throw error;}
   finally{busy=false;}
  }
 };
}
