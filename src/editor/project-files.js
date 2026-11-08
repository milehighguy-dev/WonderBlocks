const types=[{description:'Wonderblocks project',accept:{'application/json':['.building.json','.json']}}];

export function createProjectFiles({fetcher=globalThis.fetch?.bind(globalThis),pickFile=globalThis.showSaveFilePicker?.bind(globalThis),download}={}){
 let target=null,busy=false,generation=0;
 const request=async body=>{const response=await fetcher('/api/project-file',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||'Could not access the project file.');}return response.json();};
 const native=fetcher?request({action:'capabilities'}).then(result=>result.nativeDialog).catch(()=>false):Promise.resolve(false);
 return {
  get name(){return target?.name||null;},
  reset(){generation++;target=null;},
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
     download(text,suggestedName,'application/json');return {status:'downloaded',name:suggestedName};
    }
    if(document===generation)target=next;
    return {status:'saved',name:next.name};
   }catch(error){if(error.name==='AbortError')return {status:'cancelled'};throw error;}
   finally{busy=false;}
  }
 };
}
