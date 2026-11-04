import {navigationPreview} from './swbf2-navigation-preview.js';
import {exportLayerName} from '../core/export-profiles.js';
import {exportOwner,removeGeneratedNavigation,assertAssetUpdateCompatible} from './swbf2-export-ownership.js';
import {readNavigationFolder} from './swbf2-navigation-merge.js';
import {registerWorldLayer,nextWorldSequence,remapWorldLayer,registerLayerRequest} from './swbf2-layer-registration.js';
import {retiredExportAssets} from './swbf2-retired-assets.js';

const abortIfNeeded=signal=>{if(signal?.aborted)throw new DOMException('Export canceled.','AbortError');};
const missing=error=>error.name==='NotFoundError';
const safeName=name=>/^[a-z0-9_][a-z0-9_.-]{0,119}$/i.test(name)&&!/[. ]$/.test(name)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name);
const bytes=value=>typeof value==='string'?new TextEncoder().encode(value):value;
async function optionalDirectory(parent,name){try{return await parent.getDirectoryHandle(name);}catch(error){if(missing(error))return null;throw error;}}
async function optionalFile(parent,name){try{return await parent.getFileHandle(name);}catch(error){if(missing(error))return null;throw error;}}
const equal=(a,b)=>{if(!a||!b)return a===b;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;};

// Keep browser filesystem round trips bounded. A failed/canceled batch drains
// every in-flight operation before returning, so rollback cannot race a write.
async function fileBatch(items,action,signal){
 let next=0,failure;
 await Promise.all(Array.from({length:Math.min(6,items.length)},async()=>{
  while(!failure&&next<items.length){const index=next++;try{abortIfNeeded(signal);await action(items[index],index);}catch(error){failure??=error;}}
 }));
 if(failure)throw failure;abortIfNeeded(signal);
}
function worldIO(root,inspected){
 const directories=new Map([['',Promise.resolve(root)],...['msh','odf','world1'].filter(name=>inspected?.[name]).map(name=>[name,Promise.resolve(inspected[name])])]);
 async function directory(path,create=false){
  if(directories.has(path))try{return await directories.get(path);}catch(error){if(!missing(error)||!create)throw error;}
  const slash=path.lastIndexOf('/'),parent=slash<0?'':path.slice(0,slash),name=path.slice(slash+1);
  const pending=directory(parent,create).then(handle=>handle.getDirectoryHandle(name,{create}));directories.set(path,pending);
  try{return await pending;}catch(error){if(directories.get(path)===pending)directories.delete(path);throw error;}
 }
 async function locate(path,create=false){const names=path.split('/');if(names.some(n=>!safeName(n)))throw Error('Unsupported export path: '+path);return {directory:await directory(names.slice(0,-1).join('/'),create),name:names.at(-1)};}
 return {
  async read(path){try{const {directory,name}=await locate(path),handle=await optionalFile(directory,name);return handle?new Uint8Array(await(await handle.getFile()).arrayBuffer()):null;}catch(error){if(missing(error))return null;throw error;}},
  async write(path,value){const {directory,name}=await locate(path,true),handle=await directory.getFileHandle(name,{create:true}),stream=await handle.createWritable();try{await stream.write(value);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}},
  async remove(path){const {directory,name}=await locate(path);await directory.removeEntry(name);}
 };
}
const BACKUP_MARKER='backup-format.json',BACKUP_FORMAT='{"format":"wonderblocks-backup","version":1}\n';

// Mod Tools scan source folders recursively. Backups must not retain native
// source extensions, or old meshes/layers get compiled alongside the new ones.
async function prepareBackupFolder(handle,signal){
 const metadata=await optionalDirectory(handle,'_wonderblocks'),backups=metadata&&await optionalDirectory(metadata,'backups');if(!backups)return;
 async function visit(folder){const entries=[];for await(const entry of folder.values())entries.push(entry);for(const entry of entries){abortIfNeeded(signal);if(entry.kind==='directory'){await visit(entry);continue;}if(!/\.(msh|tga|odf|pln|bar|req|lyr|ldx|option)$/i.test(entry.name))continue;const original=new Uint8Array(await (await entry.getFile()).arrayBuffer());let name=entry.name+'.wbbackup',target=await optionalFile(folder,name);if(target&&!equal(original,new Uint8Array(await (await target.getFile()).arrayBuffer()))){name=entry.name+'.'+crypto.randomUUID().slice(0,8)+'.wbbackup';target=null;}if(!target){const stream=await (await folder.getFileHandle(name,{create:true})).createWritable();try{await stream.write(original);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}}await folder.removeEntry(entry.name);}}
 // Completed backups never change. Inspect each generation's tiny marker,
 // rather than recursively walking all previously verified source files.
 const entries=[];for await(const entry of backups.values())entries.push(entry);
 await fileBatch(entries.filter(entry=>entry.kind==='directory'),async entry=>{
  abortIfNeeded(signal);
   const marker=await optionalFile(entry,BACKUP_MARKER);
   if(marker&&await(await marker.getFile()).text()===BACKUP_FORMAT)return;
   await visit(entry);abortIfNeeded(signal);
   const stream=await(await entry.getFileHandle(BACKUP_MARKER,{create:true})).createWritable();try{await stream.write(BACKUP_FORMAT);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}
 },signal);
 // Raw files directly under backups/ are unusual, but must still be migrated.
 const filesOnly={async *values(){for(const entry of entries)if(entry.kind==='file')yield entry;},getFileHandle:(...args)=>backups.getFileHandle(...args),removeEntry:(...args)=>backups.removeEntry(...args)};
 await visit(filesOnly);
}

export async function inspectWorldFolder(handle){
 const [msh,odf,world1]=await Promise.all(['msh','odf','world1'].map(name=>optionalDirectory(handle,name)));
 return {handle,msh,odf,world1:world1||handle,canWriteWorld:!!(msh&&odf&&world1)};
}
export async function worldFolderNavigation(handle){
 const {world1}=await inspectWorldFolder(handle),files=[];
 for await(const entry of world1.values())if(entry.kind==='file'&&/\.(pln|bar|req)$/i.test(entry.name)){
  const file=await entry.getFile();files.push({name:file.name,size:file.size,webkitRelativePath:handle.name+'/'+(world1===handle?'':'world1/')+file.name,text:()=>file.text()});
 }
 if(!files.some(file=>/\.pln$/i.test(file.name)))return [];
 return readNavigationFolder(files);
}
export async function worldFolderWorlds(handle){
 const {world1}=await inspectWorldFolder(handle),names=[];for await(const entry of world1.values())if(entry.kind==='file')names.push(entry.name);
 return names.filter(name=>/\.wld$/i.test(name)&&safeName(name)).flatMap(wldFilename=>{const worldName=wldFilename.slice(0,-4),indexFilename=names.find(name=>name.toLowerCase()===(worldName+'.ldx').toLowerCase());return indexFilename?[{worldName,wldFilename,indexFilename}]:[];}).sort((a,b)=>a.worldName.localeCompare(b.worldName));
}
export async function allowWorldFolderWrite(handle){
 const access={mode:'readwrite'};
 if(handle.queryPermission&&await handle.queryPermission(access)!=='granted'&&await handle.requestPermission(access)!=='granted')throw Error('Allow access to the selected world folder to export there.');
 const inspected=await inspectWorldFolder(handle);if(!inspected.canWriteWorld)throw Error('Choose the world folder containing msh, odf and world1, rather than world1 itself.');
 return inspected;
}

// Copy assets and placements; scaffold files from the package never replace an
// authored world/index. Registration patches the existing index separately.
export function worldFolderFiles(result){
 const name=exportOwner(result);if(!safeName(name))throw Error('Unsupported export name.');
 const files=new Map();
 for(const [path,value] of result.files){
  const asset=/^(msh\/[a-z0-9_.-]+\.(?:msh|tga)(?:\.option)?|odf\/[a-z0-9_.-]+\.odf)$/i.test(path);
  const world=/^world1\/[a-z0-9_.-]+\.(lyr|pln|bar|req)$/i.test(path);
  if(asset||world){
   if(world&&!path.endsWith('.lyr')&&!result.manifest.navigation?.merged)throw Error('Merge with existing world planning before writing AI navigation directly to a world folder.');
   files.set(path,bytes(value));
  }else if(path==='README.txt'||path==='export-report.json'||path==='ai-navigation-preview.html'||/^source\/[a-z0-9_.-]+\.(json|building\.json)$/i.test(path))files.set('_wonderblocks/exports/'+name+'/'+path,bytes(value));
  else if(!/\.(wld|ldx|ps1)$/i.test(path))throw Error('Unsupported direct export file: '+path);
 }
 describeFolderExport(result,files);return files;
}
function describeFolderExport(result,files,registration=null,previous=null,mode='placements'){
 const name=exportOwner(result),prefix='_wonderblocks/exports/'+name+'/',report=structuredClone(result.manifest);
 if(registration)report.layerFile=registration.layerPath;
 report.files=[...files.keys()];report.destination={...(mode==='assets'?previous?.destination:{}),updateMode:mode,type:'world-folder',preservedBaseWorld:true,requiresLayerImport:mode!=='assets'&&!registration&&!!report.layerFile,...(registration?{worldName:registration.worldName,layerIndex:registration.indexPath,layerID:registration.id,layerName:registration.name,gameMode:'Common',layerRequests:registration.requestPaths}:{})};
 if(mode==='assets')report.layerFile=previous.layerFile;
 report.managedNavigation=report.navigation?{prefix:report.navigation.prefix,planningFile:report.navigation.planningFile,barrierFile:report.navigation.barrierFile}:previous?.managedNavigation;
 if(report.sourceProject)report.sourceProject=prefix+report.sourceProject;
 if(report.navigation)for(const key of ['report','preview','mergeReport'])if(report.navigation[key])report.navigation[key]=prefix+report.navigation[key];
 if(files.has(prefix+'export-report.json'))files.set(prefix+'export-report.json',bytes(JSON.stringify(report,null,2)+'\n'));
 if(files.has(prefix+'README.txt'))files.set(prefix+'README.txt',bytes(`Wonderblocks — direct world-folder export\n\nMeshes, textures and compiler options were written to msh/; object definitions to odf/. ${mode==='assets'?'WorldEdit placements and planning were retained.':registration?'Layer '+registration.id+' ('+registration.name+') is registered in '+registration.indexPath+' under Common. Reopen the world in WorldEdit to load '+registration.layerPath+'.':report.layerFile?'Import '+report.layerFile+' in WorldEdit to place the scene.':''}\nThe existing .wld, terrain and mission files were not replaced. Matching files were overwritten; originals are retained under _wonderblocks/backups/. Source snapshots and reports are in ${prefix}.\n${report.navigation?.merged?'Planning and barriers were merged into world1/ using the selected existing world filenames. Existing and generated planning remain separate graphs; connect them in WorldEdit where needed.':''}\n${report.navigation?.minimumWorldExtent?'SetWorldExtents in the mission must remain at least '+report.navigation.minimumWorldExtent+' metres.':''}\n${(report.warnings||[]).join('\n')}\n`));
}

async function prepareRegistration(handle,files,preferredWorld,io,signal,identity,previous){
 const exportedLayer=[...files.keys()].find(path=>path.endsWith('.lyr'));if(!exportedLayer)return null;
 const worlds=await worldFolderWorlds(handle),world=worlds.find(w=>w.worldName.toLowerCase()===(preferredWorld||handle.name).toLowerCase())||(!preferredWorld&&worlds.length===1?worlds[0]:null);
 if(!world)throw Error(worlds.length?'Choose the target world for layer registration.':'No matching .wld and .ldx files were found in world1.');
 const guards=new Map(),read=async path=>{const value=await io.read(path);guards.set(path,value);return value;},decode=value=>new TextDecoder().decode(value);
 const indexPath='world1/'+world.indexFilename,indexBytes=await read(indexPath),registration=registerWorldLayer(decode(indexBytes),identity?{name:(previous?.destination?.layerIndex===indexPath?previous.destination.layerName:null)??exportLayerName(identity.id,identity.label),description:'Wonderblocks · '+identity.label}:{});
 const layerPath='world1/'+world.worldName+'_'+registration.name+'.lyr',sources=[decode(await read('world1/'+world.wldFilename))],{world1}=await inspectWorldFolder(handle);
 const entries=[];for await(const entry of world1.values())entries.push(entry);
 const layers=entries.filter(entry=>entry.kind==='file'&&entry.name.toLowerCase().startsWith(world.worldName.toLowerCase()+'_')&&/\.lyr$/i.test(entry.name)&&('world1/'+entry.name).toLowerCase()!==layerPath.toLowerCase());
 await fileBatch(layers,async entry=>{sources.push(decode(await read('world1/'+entry.name)));},signal);
 await read(layerPath);const layerText=remapWorldLayer(decode(files.get(exportedLayer)),{id:registration.id,sequenceStart:nextWorldSequence(sources)});
 files.delete(exportedLayer);files.set(layerPath,bytes(layerText));
 const requestPaths=[];for(const entry of entries)if(entry.kind==='file'&&/\.req$/i.test(entry.name)){
  const path='world1/'+entry.name,current=await io.read(path),updated=registerLayerRequest(decode(files.get(path)||current),world.worldName,layerPath.slice(7,-4));
  if(updated!==null){guards.set(path,current);files.set(path,bytes(updated));requestPaths.push(path);}
 }
 if(!requestPaths.length)throw Error('No PC .req world request was found for '+world.worldName+'. Layer registration needs its existing world bundle request.');
 files.set(indexPath,bytes(registration.text));return {...registration,layerPath,indexPath,requestPaths,guards,worldName:world.worldName};
}

export async function writeWorldFolder(handle,result,{signal,navigationSource=null,worldName,mode=result.manifest.assetsOnly?'assets':'placements',cleanupNavigation=false,allowOverwrite=false,onProgress=()=>{},backupName=new Date().toISOString().replace(/[:.]/g,'-')+'_'+crypto.randomUUID().slice(0,8)}={}){
 abortIfNeeded(signal);
 if(!safeName(backupName))throw Error('Unsupported backup name.');
 const inspected=await allowWorldFolderWrite(handle),io=worldIO(handle,inspected),files=worldFolderFiles(result),previous=new Map(),attempted=[],attemptedSet=new Set(),completedWrites=new Set();
 onProgress({phase:'Reading world folder',completed:0,total:0});
 const exportName=exportOwner(result),reportPath='_wonderblocks/exports/'+exportName+'/export-report.json',oldReport=await io.read(reportPath);let previousReport=oldReport?JSON.parse(new TextDecoder().decode(oldReport)):null;
 const legacyName=result.filename.replace(/\.(swbf2|object|msh)\.zip$/,''),legacyPath='_wonderblocks/exports/'+legacyName+'/export-report.json';
 if(!previousReport&&result.manifest.exportIdentity&&legacyName!==exportName){
  const legacyBytes=await io.read(legacyPath);if(legacyBytes){const legacy=JSON.parse(new TextDecoder().decode(legacyBytes));if(!legacy.exportIdentity&&legacy.sourceProject?.startsWith('_wonderblocks/exports/'+legacyName+'/')){const oldSource=await io.read(legacy.sourceProject),newSource=result.files.get(result.manifest.sourceProject);if(oldSource&&newSource){const before=JSON.parse(new TextDecoder().decode(oldSource)),after=typeof newSource==='string'?JSON.parse(newSource):JSON.parse(new TextDecoder().decode(newSource)),ids=new Set(before.parts.map(p=>p.id));if(after.parts.some(p=>ids.has(p.id)))previousReport=legacy;}}}
 }
 if(previousReport?.navigation&&!previousReport.managedNavigation){const navPath=previousReport.navigation.report;if(navPath?.startsWith('_wonderblocks/exports/')){const data=await io.read(navPath);if(data){const nav=JSON.parse(new TextDecoder().decode(data));previousReport.managedNavigation={prefix:nav.prefix,planningFile:previousReport.navigation.planningFile,barrierFile:previousReport.navigation.barrierFile};}}}
 if(!['placements','assets'].includes(mode))throw Error('Invalid scene update mode.');
 if(mode==='assets'){assertAssetUpdateCompatible(previousReport,files);for(const path of [...files.keys()])if(path.startsWith('world1/')||path.endsWith('/ai-navigation-preview.html')||path.endsWith('/source/ai-navigation.json'))files.delete(path);}
 const identity=result.manifest.exportIdentity?{...result.manifest.exportIdentity,label:result.manifest.project}:null;
 const registration=mode==='assets'?null:await prepareRegistration(handle,files,worldName||navigationSource?.worldName,io,signal,identity,previousReport);
 if(previousReport?.managedNavigation&&result.manifest.navigation&&previousReport.managedNavigation.prefix!==result.manifest.navigation.prefix){
  const nav=result.manifest.navigation,plan=files.get(nav.planningFile),bar=files.get(nav.barrierFile);if(plan&&bar){const oldPrefix=previousReport.managedNavigation.prefix,cleaned=removeGeneratedNavigation(new TextDecoder().decode(plan),new TextDecoder().decode(bar),oldPrefix);files.set(nav.planningFile,bytes(cleaned.planning));files.set(nav.barrierFile,bytes(cleaned.barriers));
   const prefix='_wonderblocks/exports/'+exportName+'/',readJSON=path=>JSON.parse(new TextDecoder().decode(files.get(prefix+path))),data=readJSON(nav.report),owned=record=>record.name.toLowerCase().startsWith(oldPrefix+'_'),removedHubs=data.hubs.filter(owned).length,removedConnections=data.connections.filter(owned).length;
   data.hubs=data.hubs.filter(h=>!owned(h));data.connections=data.connections.filter(c=>!owned(c));data.barriers=data.barriers.filter(b=>!owned(b));const names=new Set(data.hubs.map(h=>h.name));data.components=data.components.map(c=>({...c,hubs:c.hubs.filter(h=>names.has(h))})).filter(c=>c.hubs.length);data.components.forEach((c,i)=>c.id=i);if(data.stats.existingHubs!==undefined)data.stats.existingHubs-=removedHubs;if(data.stats.existingConnections!==undefined)data.stats.existingConnections-=removedConnections;
   Object.assign(nav,{hubs:data.hubs.length,connections:data.connections.length,barriers:data.barriers.length,components:data.components.length,stats:data.stats});files.set(prefix+nav.report,bytes(JSON.stringify(data,null,2)+'\n'));files.set(prefix+nav.preview,bytes(navigationPreview(readJSON(result.manifest.sourceProject),data)));}
 }
 describeFolderExport(result,files,registration,previousReport,mode);
 if(previousReport&&!oldReport&&legacyName!==exportName){const adopted={...previousReport,exportIdentity:result.manifest.exportIdentity,destination:{...previousReport.destination,supersededBy:reportPath}};files.set(legacyPath,bytes(JSON.stringify(adopted,null,2)+'\n'));}
 const cleanupGuards=new Map();
 if(cleanupNavigation){
  if(mode==='assets')throw Error('Update assets only leaves planning untouched.');
  if(result.manifest.navigation)throw Error('Turn off generated planning before removing its previous entries.');
  const managed=previousReport?.managedNavigation;
  if(managed){
   for(const path of [managed.planningFile,managed.barrierFile])if(!/^world1\/[a-z0-9_.-]+\.(pln|bar)$/i.test(path))throw Error('Invalid previous planning path.');
   const plan=await io.read(managed.planningFile),bar=await io.read(managed.barrierFile);cleanupGuards.set(managed.planningFile,plan);cleanupGuards.set(managed.barrierFile,bar);
   const cleaned=removeGeneratedNavigation(new TextDecoder().decode(plan??new Uint8Array()),new TextDecoder().decode(bar??new Uint8Array()),managed.prefix);files.set(managed.planningFile,bytes(cleaned.planning));files.set(managed.barrierFile,bytes(cleaned.barriers));
   const report=JSON.parse(new TextDecoder().decode(files.get(reportPath)));delete report.managedNavigation;report.files=[...files.keys()];files.set(reportPath,bytes(JSON.stringify(report,null,2)+'\n'));
  }
 }
 const {retired,retained}=await retiredExportAssets(handle,files,exportName,{previousReport,ownerId:identity?.id});
 if(retired.length||retained.length){const path=reportPath;if(files.has(path)){const report=JSON.parse(new TextDecoder().decode(files.get(path)));report.destination.archivedSources=retired;report.destination.retainedManagedSources=retained;files.set(path,bytes(JSON.stringify(report,null,2)+'\n'));}}
 const checkRegistration=async()=>{if(registration)await fileBatch([...registration.guards],async([path,original])=>{const current=await io.read(path),expected=attemptedSet.has(path)?files.get(path):original;if(!equal(current??new Uint8Array(),expected??new Uint8Array()))throw Error('World layers changed while exporting. Export again to use the latest layer index and objects: '+path);},signal);};
 if([...files.keys()].some(path=>/^world1\/.*\.(pln|bar)$/i.test(path))&&!navigationSource&&!cleanupGuards.size)throw Error('The existing planning source is required for direct navigation export.');
 const navigationOriginals=new Map(navigationSource?[[navigationSource.planningFilename,navigationSource.planning],[navigationSource.barrierFilename,navigationSource.barriers],...(navigationSource.requests||[]).map(r=>[r.filename,r.text])].map(([name,text])=>['world1/'+name,bytes(text)]):[]);
 for(const [path,value] of cleanupGuards)navigationOriginals.set(path,value??new Uint8Array());
 const navigationReads=new Map(),checkNavigation=async(afterWrite=false)=>{await fileBatch([...navigationOriginals],async([path,original])=>{const current=await io.read(path),expected=afterWrite&&completedWrites.has(path)?files.get(path):original;if(!equal(current??new Uint8Array(),expected??new Uint8Array()))throw Error('World planning changed while exporting. Export again to merge the latest files: '+path.slice(7));navigationReads.set(path,current);},signal);};
 await checkNavigation();await checkRegistration();
 // Guarded world sources were just compared with their snapshots. Reuse those
 // originals; all remaining destination reads can run independently.
 const paths=[...files.keys(),...retired];let checked=0;
 await fileBatch(paths,async path=>{
  const original=registration?.guards.has(path)?registration.guards.get(path):navigationReads.has(path)?navigationReads.get(path):await io.read(path);
  previous.set(path,original);onProgress({phase:'Checking world files',label:path,completed:++checked,total:paths.length});
 },signal);
 const changes=new Map([...files,...retired.map(path=>[path,null])].filter(([path,value])=>!equal(previous.get(path),value)));
 const ownerIndexPath='_wonderblocks/asset-owners.json',ownerIndexBefore=identity?await io.read(ownerIndexPath):null;
 if(identity){
  const index=ownerIndexBefore?JSON.parse(new TextDecoder().decode(ownerIndexBefore)):{version:1,assets:{}},resourceChanges=[...changes.keys()].filter(path=>/^(msh\/.*\.msh|odf\/.*\.odf)$/i.test(path)&&files.has(path)),candidates=resourceChanges.filter(path=>previous.get(path)!==null),conflicts=[];
  if(index.version!==1||!index.assets||typeof index.assets!=='object')throw Error('The asset ownership index is invalid. Restore its backup before exporting.');
  const ownFiles=new Set(previousReport?.files??[]),exports=await optionalDirectory(await optionalDirectory(handle,'_wonderblocks')??handle,'exports'),others=[];
  if(exports)for await(const entry of exports.values())if(entry.kind==='directory'&&entry.name!==exportName){const file=await optionalFile(entry,'export-report.json');if(file){const record=JSON.parse(await(await file.getFile()).text());others.push(record);}}
  for(const path of candidates){const registered=index.assets[path.toLowerCase()],other=registered?registered.id===identity.id?null:{project:registered.label}:others.find(record=>record.exportIdentity?.id!==identity.id&&record.files?.some(file=>file.toLowerCase()===path.toLowerCase()));if(other||!registered&&!ownFiles.has(path))conflicts.push({path,owner:other?.project??'an existing asset'});}
  if(conflicts.length&&!allowOverwrite){const error=Error('These filenames belong to other assets. Change the export name, enable Unique names, or explicitly replace them.');error.name='ExportOwnershipError';error.conflicts=conflicts;throw error;}
  for(const path of resourceChanges)index.assets[path.toLowerCase()]={id:identity.id,label:result.manifest.project};for(const path of retired)if(index.assets[path.toLowerCase()]?.id===identity.id)delete index.assets[path.toLowerCase()];
  const updated=bytes(JSON.stringify(index,null,2)+'\n');if(!equal(updated,ownerIndexBefore)){previous.set(ownerIndexPath,ownerIndexBefore);files.set(ownerIndexPath,updated);changes.set(ownerIndexPath,updated);}
 }
 const checkOwners=async()=>{if(identity){const current=await io.read(ownerIndexPath),expected=completedWrites.has(ownerIndexPath)?files.get(ownerIndexPath):ownerIndexBefore;if(!equal(current,expected))throw Error('Asset ownership changed during export. Export again using the latest world folder.');}};
 const backup='_wonderblocks/backups/'+backupName,originals=[...changes.keys()].filter(path=>previous.get(path)!==null);
 onProgress({phase:'Preparing backup folder',completed:0,total:0});await prepareBackupFolder(handle,signal);
 let backedUp=0;await fileBatch(originals,async path=>{await io.write(backup+'/'+path+'.wbbackup',previous.get(path));onProgress({phase:'Backing up world files',label:path,completed:++backedUp,total:originals.length});},signal);
 if(originals.length)await io.write(backup+'/'+BACKUP_MARKER,BACKUP_FORMAT);
 await checkNavigation();await checkRegistration();
 await checkOwners();
 let completed=0;
 const apply=async([path,value])=>{attempted.push(path);attemptedSet.add(path);if(value===null)await io.remove(path);else await io.write(path,value);completedWrites.add(path);onProgress({phase:'Writing world folder',label:path,completed:++completed,total:changes.size});};
 try{
  // Assets and reports are independent. Keep world placement, planning and
  // registration ordered, and commit them only after the asset batch drains.
  await fileBatch([...changes].filter(([path])=>!path.startsWith('world1/')&&path!==ownerIndexPath),apply,signal);
  if(changes.has(ownerIndexPath)){abortIfNeeded(signal);await checkOwners();await apply([ownerIndexPath,changes.get(ownerIndexPath)]);}
  const worldChanges=[...changes].filter(([path])=>path.startsWith('world1/'));
  if(worldChanges.length){await checkNavigation();await checkRegistration();}
  let checkedNavigation=false;
  for(const entry of worldChanges){const [path]=entry;abortIfNeeded(signal);if(registration&&(path===registration.layerPath||path===registration.indexPath))await checkRegistration();if(!checkedNavigation&&/^world1\/.*\.(pln|bar|req)$/i.test(path)){await checkNavigation();checkedNavigation=true;}await apply(entry);}
  abortIfNeeded(signal);
  await checkNavigation(true);await checkRegistration();await checkOwners();
 }catch(error){
  const failed=[],outsideEdits=[];
  for(const path of attempted.reverse())try{
   const original=previous.get(path),current=await io.read(path),written=changes.get(path);
   if(equal(current,original))continue;
   // A failed create can leave an empty target before its writable stream opens.
   const incompleteCreate=original===null&&!completedWrites.has(path)&&current?.length===0;
   if(!equal(current,written)&&!incompleteCreate){outsideEdits.push(path);continue;}
   if(original!==null)await io.write(path,original);else try{await io.remove(path);}catch(error){if(!missing(error))throw error;}
  }catch{failed.push(path);}
  const recovery=originals.length?' Originals are in '+backup+'.':'';
  if(outsideEdits.length)throw Error('Export stopped. Newer edits made outside Wonderblocks were kept: '+outsideEdits.join(', ')+(failed.length?'. These files could not be restored: '+failed.join(', '):'')+'.'+recovery);
  if(failed.length)throw Error('Export stopped. Some files could not be restored: '+failed.join(', ')+'.'+recovery);throw error;
 }
 return {files:files.size,updated:[...changes].filter(([,value])=>value!==null).length,reused:files.size-[...changes].filter(([,value])=>value!==null).length,created:[...changes].filter(([path,value])=>value!==null&&previous.get(path)===null).length,archived:retired.length,warnings:[...(result.manifest.warnings??[]),...(retained.length?[retained.length+' previous asset files were retained because other world objects still reference them.']:[])],backup:originals.length?backup:null,layer:[...files.keys()].find(path=>path.endsWith('.lyr')),registration:registration?{id:registration.id,index:registration.indexPath,name:registration.name,gameMode:'Common'}:null};
}
