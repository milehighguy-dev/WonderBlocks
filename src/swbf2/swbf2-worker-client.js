// Own one worker per operation so Cancel immediately stops even geometry
// preparation, texture baking and ZIP packing, rather than waiting for a yield.
export function runSWBF2Worker(kind,payload,{signal,onProgress=()=>{},workerFactory=()=>new Worker(new URL('./swbf2-export-worker.js',import.meta.url),{type:'module'})}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Export canceled.','AbortError'));return;}
  let worker,settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker?.terminate();error?reject(error):resolve(result);};
  const abort=()=>finish(new DOMException('Export canceled.','AbortError'));
  try{
   worker=workerFactory();signal?.addEventListener('abort',abort,{once:true});
   worker.onmessage=({data})=>{if(settled)return;if(data.progress){try{onProgress(data.progress);}catch(error){finish(error);}return;}if(data.error)finish(Error(data.error));else finish(null,data.result);};
   worker.onerror=event=>finish(Error(event.message||'The export worker could not start. Reload Wonderblocks and try again.'));
   worker.onmessageerror=()=>finish(Error('The export worker returned unreadable data.'));
   worker.postMessage({kind,...payload});
  }catch(error){finish(error);}
 });
}
