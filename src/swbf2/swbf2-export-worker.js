const exporter=import('./export-swbf2.js');
// Install the listener before loading the image folders. Messages can arrive
// while a module worker is awaiting its asynchronous dependencies.
self.onmessage=async({data})=>{
 try{
  const {createSWBF2Package,recommendCollisionHelpers}=await exporter;
  if(data.kind==='recommend'){self.postMessage({result:recommendCollisionHelpers(data.project,data.settings,data.collisionSource)});return;}
  let lastPhase='',lastUpdate=0;
  const onProgress=progress=>{const now=performance.now();if(progress.phase!==lastPhase||now-lastUpdate>=50||progress.completed===progress.total){lastPhase=progress.phase;lastUpdate=now;self.postMessage({progress});}};
  const result=createSWBF2Package(data.project,data.settings,{collisionSource:data.collisionSource,navigationMerge:data.navigationMerge,packZip:data.packZip,onProgress});
  const buffers=new Set(result.zip?[result.zip.buffer]:[]);for(const value of result.files.values())if(value instanceof Uint8Array)buffers.add(value.buffer);
  self.postMessage({result},[...buffers]);
 }catch(error){self.postMessage({error:error.message});}
};
