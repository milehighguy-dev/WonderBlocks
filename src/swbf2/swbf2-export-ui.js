import {EXPORT_PROFILE_FIELDS,exportProfileKey,validateExportProfiles,exportLayerName} from '../core/export-profiles.js';
import {chooseLocalWorldFolder,restoreLocalWorldFolder} from './local-world-folder.js';
import {createSWBF2PackageAsync,recommendCollisionHelpersAsync,SWBF2_EXPORT_DEFAULTS,swbfName,routeSectionError} from './export-swbf2.js';
import {exportScope} from './swbf2-export-scope.js';
import {createExportPreview} from './swbf2-export-preview.js';
import {recommendSceneryClass} from './swbf2-class-label.js';
import {readNavigationFolder} from './swbf2-navigation-merge.js';
import {inspectWorldFolder,worldFolderNavigation,worldFolderWorlds,allowWorldFolderWrite,writeWorldFolder} from './swbf2-world-folder.js';

export function createSWBF2ExportUI({snapshot,selection=()=>[],previewRoots,download,notify,collisionSource,saveProfiles,chooseFolderHandle}){
 const dialog=document.createElement('dialog');dialog.className='swbf2-export';dialog.setAttribute('aria-labelledby','swbf2-export-title');
 dialog.innerHTML=`<form method="dialog">
  <div class="swbf2-export-heading"><h2 id="swbf2-export-title">Export to SWBF2</h2><button formnovalidate value="cancel" aria-label="Close exporter">×</button></div>
  <div class="swbf2-export-layout"><section class="swbf2-export-options">
   <label class="field">Export scope<select name="scope"><option value="scene">Entire scene</option><option value="selection">Selected objects / group</option></select></label>
   <label class="field">Export format<select name="output"><option value="scene">Scene package</option><option value="object">Single asset — MSH + ODF</option><option value="mesh">Single asset — MSH only</option></select></label>
   <label class="field" title="Download a ZIP or save directly into a Mod Tools world source folder.">Export to<select name="destination"><option value="zip">Download ZIP</option><option value="folder" title="Direct folder access requires Chrome or Edge.">World folder</option></select></label>
   <div data-world-folder hidden><button type="button" data-choose-world-folder title="Choose the world root containing msh, odf and world1. This folder is also used for planning merges.">Choose world folder…</button><label class="field" data-target-world-field hidden title="Register the Wonderblocks scene layer in this world's layer index, shared across its game modes.">Target world<select name="target-world"></select></label><p class="muted small" data-world-folder-status>Choose the world folder containing msh, odf and world1.</p></div>
   <label class="field">Export name<input name="export-name" maxlength="80"></label>
   <label class="field" data-update-controls hidden title="Update assets only keeps all placements and planning edited in WorldEdit.">Scene export<select name="scene-update"><option value="placements">Replace scene placements</option><option value="assets">Update assets only</option></select></label>
   <div data-overwrite-conflicts hidden><p class="muted small" data-conflicting-names></p><label class="swbf2-export-check"><input name="allow-overwrite" type="checkbox"> Replace these existing assets</label></div>
   <div data-class-controls><label class="field" title="Organizes the exported ODF. Prop and Building use the same static scenery implementation.">Class label<select name="class-label" aria-describedby="swbf2-class-help"><option value="prop">Prop</option><option value="building">Building</option></select></label><p id="swbf2-class-help" class="muted small" data-class-recommendation></p></div>
   <label class="swbf2-export-check" title="Enable to keep similarly named objects separate. Leave off to replace matching filenames on the next export."><input name="unique-names" type="checkbox" aria-describedby="swbf2-name-help"> Unique mesh / ODF names</label>
   <p id="swbf2-name-help" class="muted small" data-name-help></p>
   <p class="muted small" data-format-help></p>
   <label class="field" data-scene-only>Split routes after this many sections<input name="sections" type="number" min="1" max="24" step="1" value="6"></label>
   <label class="field">Largest texture size<select name="textures"><option value="128">128 × 128</option><option value="256">256 × 256</option><option value="512" selected>512 × 512</option><option value="1024">1024 × 1024</option></select></label>
   <label class="swbf2-export-check"><input name="low-detail" type="checkbox" checked> Include simpler distant models</label>
   <label class="swbf2-export-check"><input name="collision" type="checkbox" checked> Include collision</label>
   <label class="swbf2-export-check"><input name="collision-helpers" type="checkbox" checked aria-describedby="swbf2-helper-help"> Separate collision helpers</label>
   <p id="swbf2-helper-help" class="muted small" data-helper-recommendation aria-live="polite"></p>
   <details data-helper-details hidden><summary>Collision check details</summary><p class="muted small" data-helper-stats></p><p class="muted small">These are nearby collision candidates, not confirmed contacts. Vehicle access and movement are not simulated. Compiler polygon merging can change the counts.</p></details>
   <label class="swbf2-export-check"><input name="shadows" type="checkbox" checked> Include closed shadow volumes</label>
   <div data-scene-only data-planning-controls><label class="swbf2-export-check"><input name="ai-navigation" type="checkbox" checked aria-describedby="swbf2-ai-help"> Generate AI planning and barriers</label><p id="swbf2-ai-help" class="muted small">Estimate paths and barriers from routes, floors and walls. Independent of Include collision.</p>
    <label class="swbf2-export-check" title="Read existing planning from a folder and include merged copies in the download, using the existing world filenames."><input name="merge-navigation" type="checkbox"> Merge with existing world planning</label>
    <div data-merge-setup hidden><button type="button" data-choose-merge-folder>Choose world folder…</button><input name="merge-folder" type="file" webkitdirectory multiple hidden aria-label="Existing world folder">
     <label class="field" data-merge-world-field hidden>Keep world filenames<select name="merge-world" aria-describedby="swbf2-merge-help"></select></label>
     <p id="swbf2-merge-help" class="muted small" data-merge-status aria-live="polite">Choose the folder containing your existing .pln and .bar files. Originals stay untouched; merged copies go in the ZIP.</p>
    </div>
    <details data-cleanup-controls hidden><summary>Generated planning cleanup</summary><label class="field" title="Remove only planning previously generated by this scene. Authored planning is retained.">Previous planning<select name="cleanup-navigation"><option value="keep">Keep existing planning</option><option value="remove">Remove this scene’s generated planning</option></select></label></details>
   </div>
  </section><section class="swbf2-export-visual" aria-label="What will be exported">
   <div class="swbf2-export-preview"></div><p data-preview-caption aria-live="polite"></p>
   <div class="row"><button type="button" data-frame="export">Frame export</button><button type="button" data-frame="scene">Frame scene</button></div>
   <label class="swbf2-export-check"><input name="context" type="checkbox" checked> Show rest of scene</label>
   <p class="muted small">Yellow objects are included. Faded objects are context only. Drag to orbit; scroll to zoom. Reference characters are excluded.</p>
   <section class="swbf2-export-contents" aria-labelledby="swbf2-contents-title">
    <h3 id="swbf2-contents-title">Files in this download</h3><p class="muted small" data-download-name></p>
    <dl data-file-types aria-live="polite"></dl>
    <p class="muted small" data-embedded-files></p><p class="muted small" data-placement-files></p>
    <details><summary>Support files &amp; folder paths</summary><ul data-file-paths></ul></details>
   </section>
  </section></div>
  <div class="swbf2-export-status" role="status" aria-live="polite"></div><progress hidden aria-label="Export progress" max="1"></progress>
  <div class="swbf2-export-readiness" id="swbf2-export-readiness" role="status" aria-live="polite" hidden><span data-export-reason></span><button type="button" data-export-fix hidden></button></div>
  <details data-export-notes hidden><summary data-notes-title>Export notes</summary><ul data-notes-list></ul></details>
  <div class="swbf2-export-actions"><button type="button" data-open-output hidden>Open output folder</button><button formnovalidate value="cancel">Close</button><button type="button" class="primary" data-action="export" aria-describedby="swbf2-export-readiness">Download SWBF2 package</button></div>
 </form>`;
 document.body.append(dialog);
 const input=name=>dialog.querySelector(`[name="${name}"]`),button=dialog.querySelector('[data-action="export"]'),status=dialog.querySelector('[role="status"]'),progress=dialog.querySelector('progress'),fields=[...dialog.querySelectorAll('input,select')],previewContainer=dialog.querySelector('.swbf2-export-preview');
 let busy=false,controller=null,fullSnapshot=null,selectedIds=[],preview=null,initialized=false,analysisController=null,analysisBusy=false,recommendation=null,helpersTouched=false,classTouched=false,scopeError=false,analysisError=false;
 let helperCheckTimer=null;
 let mergeWorlds=[],mergeReading=false,mergeError='',mergeReadVersion=0,previewBusy=false,previewVersion=0;
 let worldFolder=null,lastFolder=null,folderError='',targetWorlds=[];const direct=()=>input('destination').value==='folder';
 let profileKey=null,profile=null,profileVersion=0,knownLayerPath=null;const sessionFolders=new Map();
 const assetsOnly=()=>input('output').value==='scene'&&input('scene-update').value==='assets';
 function rememberProfile(){
  if(!profileKey||!profile||!fullSnapshot||previewBusy||mergeReading)return false;const values={};for(const field of EXPORT_PROFILE_FIELDS){if(field==='class-label'&&!classTouched||field==='collision-helpers'&&!helpersTouched)continue;const el=input(field);values[field]=el.type==='checkbox'?el.checked:el.value;}
  values.output=profileKey.startsWith('scene:')?'scene':input('output').value==='scene'?(profile.values.output??'object'):input('output').value;
  const next={profiles:{...(fullSnapshot.swbf2Exports?.profiles??{}),[profileKey]:{id:profile.id,values,...(sessionFolders.get(profile.id)?.id?{folderId:sessionFolders.get(profile.id).id}:profile.folderId?{folderId:profile.folderId}:{})}},active:profileKey};
  try{fullSnapshot.swbf2Exports=validateExportProfiles(next);profile=fullSnapshot.swbf2Exports.profiles[profileKey];saveProfiles?.(structuredClone(fullSnapshot.swbf2Exports));return true;}catch{return false;}
 }
 async function loadProfile({reuseFolder=false}={}){
  const priorFolder=worldFolder,priorDestination=input('destination').value,priorWorld=input('target-world').value;
  previewBusy=true;
  const version=++profileVersion;profileKey=exportProfileKey(fullSnapshot,input('scope').value==='selection'?selectedIds:null,input('output').value);profile=fullSnapshot.swbf2Exports?.profiles[profileKey]??{id:crypto.randomUUID(),values:{}};
  let defaultName=fullSnapshot.name;try{defaultName=scoped().name;}catch{}
  const defaults={'export-name':defaultName,'destination':reuseFolder?priorDestination:'zip','class-label':'prop','unique-names':false,sections:'6',textures:'512','low-detail':true,collision:true,'collision-helpers':true,shadows:true,'ai-navigation':true,'merge-navigation':false,'scene-update':'placements','cleanup-navigation':'keep','target-world':''};
  for(const [field,value] of Object.entries({...defaults,...profile.values})){const el=input(field);if(el.type==='checkbox')el.checked=value;else if(field!=='target-world')el.value=String(value);}
  helpersTouched=Object.hasOwn(profile.values,'collision-helpers');classTouched=Object.hasOwn(profile.values,'class-label');input('allow-overwrite').checked=false;dialog.querySelector('[data-overwrite-conflicts]').hidden=true;dialog.querySelector('[data-open-output]').hidden=true;dialog.querySelector('[data-export-notes]').hidden=true;
  worldFolder=null;knownLayerPath=null;targetWorlds=[];input('target-world').replaceChildren();setMergeWorlds([]);folderError='';mergeError='';syncControls();
  if(profile.folderId||sessionFolders.has(profile.id)||reuseFolder&&priorFolder){mergeReading=true;syncControls();try{const handle=profile.folderId?await restoreLocalWorldFolder(profile.folderId):sessionFolders.get(profile.id)??priorFolder;if(version!==profileVersion)return;await useFolder(handle,profile.values['target-world']||profile.values['merge-world']||priorWorld,false);}catch{if(version===profileVersion)folderError='Choose the remembered world folder again.';}finally{if(version===profileVersion)mergeReading=false;}}
  if(!worldFolder&&input('merge-folder').files.length&&input('merge-navigation').checked){mergeReading=true;try{const worlds=await readNavigationFolder(input('merge-folder').files);if(version===profileVersion)setMergeWorlds(worlds,profile.values['merge-world']);}catch(error){if(version===profileVersion)mergeError=error.message;}finally{if(version===profileVersion)mergeReading=false;}}
  if(version===profileVersion){syncControls();refreshPreview();}
 }
 function clearConflicts(){input('allow-overwrite').checked=false;dialog.querySelector('[data-overwrite-conflicts]').hidden=true;}
 for(const el of fields)if(el.name!=='allow-overwrite')el.addEventListener('change',clearConflicts);input('export-name').addEventListener('input',clearConflicts);
 const preparedSources=new Map();
 async function preparedCollision(project,signal){const key=project.parts.map(p=>p.id).sort().join('|');if(signal.aborted)throw new DOMException('Canceled.','AbortError');if(preparedSources.has(key))return preparedSources.get(key);const source=await collisionSource?.(project,signal);if(signal.aborted)throw new DOMException('Canceled.','AbortError');if(source)preparedSources.set(key,source);return source;}
 const mergeActive=()=>input('output').value==='scene'&&!assetsOnly()&&input('ai-navigation').checked&&input('merge-navigation').checked;
 const mergeSource=()=>mergeWorlds.find(w=>w.id===input('merge-world').value);
 function scoped(){return exportScope(fullSnapshot,input('scope').value==='selection'?selectedIds:null);}
 function helperBlocked(){return input('collision').checked&&(recommendation?.required&&!input('collision-helpers').checked||input('output').value==='mesh'&&input('collision-helpers').checked&&recommendation?.helperCount>0);}
 function helperMessage(){
  const help=dialog.querySelector('[data-helper-recommendation]');
  dialog.querySelector('[data-helper-details]').hidden=!input('collision').checked||analysisBusy||!recommendation;
  if(!input('collision').checked){help.textContent='Collision is excluded.';return;}
  if(analysisBusy||previewBusy){help.textContent='Checking collision requirements…';return;}
  if(!recommendation){help.textContent=analysisError?'Collision requirements could not be checked. Try reopening the exporter.':'';return;}
  const {required,recommended,reasons,helperCount,contactReview}=recommendation;
  help.textContent=required?'Required: On. '+(reasons.includes('different-masks')?'Different movement and projectile profiles need separate meshes.':'Collision exceeds the native per-model limit for non-box shapes.'):recommended?'Recommended: On. Infantry-sized samples found crowded collision.':'Recommended: Off. Collision can stay in the main mesh.';
  if(reasons.includes('vehicle-review')&&!required)help.textContent+=' Vehicle contacts need an in-game check; this estimate does not prove helpers are needed.';
  if(!required&&input('collision-helpers').checked&&helperCount)help.textContent+=` ${helperCount} separate collision helper${helperCount===1?'':'s'}.`;
  if(recommended&&!required&&!input('collision-helpers').checked)help.textContent+=' Off combines collision in the main mesh; test infantry movement in game.';
  if(!required&&input('collision-helpers').checked&&!helperCount)help.textContent+=' This selection generates no extra helpers.';
  if(input('output').value==='mesh'&&input('collision-helpers').checked&&helperCount)help.textContent+=' Choose MSH + ODF to attach helpers, or turn helpers off if supported.';
  const describe=(label,r)=>r.samples?`${label}: up to ${r.maximumPolygons} source triangles / ${r.maximumVertices} polygon vertices nearby.`:`${label}: no mesh collision uses this profile.`;
  dialog.querySelector('[data-helper-stats]').textContent=describe('Infantry',contactReview.infantry)+' '+describe('Vehicles',contactReview.vehicle)+' Native candidate storage: at most 100 polygons and fewer than 300 polygon vertices per query. This is separate from the 64-body model limit.';
 }
 async function checkHelpers(){
  clearTimeout(helperCheckTimer);helperCheckTimer=null;
  analysisController?.abort();const check=new AbortController();analysisController=check;recommendation=null;if(analysisError&&status.textContent===analysisError)status.textContent='';analysisError=false;analysisBusy=input('collision').checked&&!routeSectionError(Number(input('sections').value));
  syncControls();
  if(!analysisBusy)return;
  try{
   const project=scoped(),prepared=await preparedCollision(project,check.signal);
   if(check.signal.aborted)return;
   recommendation=await recommendCollisionHelpersAsync(project,{output:input('output').value,routeSections:Number(input('sections').value)},{collisionSource:prepared,signal:check.signal});
   if(check.signal.aborted)return;
   if(!helpersTouched)input('collision-helpers').checked=recommendation.recommended;
  }catch(error){if(!check.signal.aborted){analysisError=error.message;status.textContent=error.message;}}
  finally{if(!check.signal.aborted){analysisBusy=false;syncControls();refreshContents();}}
 }
 function refreshContents(){
  const output=input('output').value,scene=output==='scene',ai=scene&&!assetsOnly()&&input('ai-navigation').checked,name=swbfName(input('export-name').value.trim()),merging=mergeActive(),source=merging?mergeSource():null,worldName=direct()?(input('target-world').value||source?.worldName||name):source?.worldName??name;
  dialog.querySelector('[data-name-help]').textContent=input('unique-names').checked?'Adds object IDs to mesh and ODF filenames. Companion option files use matching names.':scene?'Uses scene and object names; re-exporting with unchanged names replaces matching files. Companion option files use matching names.':`${name}.msh${output==='object'?' · '+name+'.odf':''}. Re-export with the same name to replace it. Companion option files use matching names.`;
  const groups=[
   ...(scene&&!assetsOnly()?[['Scene placements',direct()?['.lyr','.ldx','.req']:merging?['.lyr']:['.lyr','.wld','.ldx'],direct()?[knownLayerPath??`world1/${worldName}_${profile?exportLayerName(profile.id,input('export-name').value):'wonderblocks'}.lyr`,`world1/${worldName}.ldx`,`world1/${worldName}.req`]:merging?[`world1/${worldName}_${profile?exportLayerName(profile.id,input('export-name').value):'wonderblocks'}.lyr`]:[`world1/${name}_${profile?exportLayerName(profile.id,input('export-name').value):'wonderblocks'}.lyr`,`world1/${name}.wld`,`world1/${name}.ldx`]]]:[]),
   ...(output!=='mesh'?[['Object definitions',['.odf'],['odf/*.odf']]]:[]),
   ['Meshes',['.msh'],['msh/*.msh']],['Textures',['.tga'],['msh/*.tga']],
   ['Compiler options',['.msh.option','.tga.option'],['msh/*.msh.option','msh/*.tga.option']],
   ...(ai?[['AI planning & barriers',merging&&!source?.requests.length?['.pln','.bar']:['.pln','.bar','.req'],merging?[`world1/${source?.planningFilename??worldName+'.pln'}`,`world1/${source?.barrierFilename??worldName+'.bar'}`,...(source?.requests??[]).map(r=>'world1/'+r.filename)]:[`world1/${name}.pln`,`world1/${name}.bar`,`world1/${name}.req`]]]:[])
  ];
  dialog.querySelector('[data-download-name]').textContent=direct()?(worldFolder?.name||'World folder')+' · files written directly':name+(scene?'.swbf2.zip':output==='mesh'?'.msh.zip':'.object.zip')+' · ZIP archive';
  dialog.querySelector('#swbf2-contents-title').textContent=direct()?'Files written to the world folder':'Files in this download';
  const types=dialog.querySelector('[data-file-types]');types.replaceChildren();
  for(const [label,extensions] of groups){const row=document.createElement('div'),title=document.createElement('dt'),value=document.createElement('dd');title.textContent=label;for(const extension of extensions){const code=document.createElement('code');code.textContent=extension;value.append(code);}row.append(title,value);types.append(row);}
  if(scene&&!ai&&!assetsOnly()){const row=document.createElement('div'),title=document.createElement('dt'),value=document.createElement('dd');title.textContent='AI planning & barriers';value.textContent='Off — no .pln, .bar or .req';row.append(title,value);types.append(row);}
  const embedded=[...(input('collision').checked?['collision']:[]),...(input('shadows').checked?['shadow volumes']:[]),...(input('low-detail').checked?['distant models']:[])];
  dialog.querySelector('[data-embedded-files]').textContent=embedded.length?'Inside the .msh files: '+embedded.join(', ')+'.'+(input('collision').checked?(input('collision-helpers').checked?' Separate collision meshes / ODFs are included where applicable.':' Collision stays in each main MSH.'):'' ):'Meshes contain visible geometry; collision, shadows and distant models are off.';
  if(!input('collision').checked&&embedded.length)dialog.querySelector('[data-embedded-files]').textContent='Inside the .msh files: '+embedded.join(', ')+'. Collision is excluded.';
  dialog.querySelector('[data-placement-files]').textContent=scene?'Use the .lyr layer or the .wld + .ldx world scaffold to place the scene. Loading both duplicates the objects. Terrain and mission scripts are not generated.':'This asset export has no scene placements, .pln or .bar files.';
  if(merging)dialog.querySelector('[data-placement-files]').textContent='Import the .lyr into your existing world. Planning and barriers are merged in the ZIP using the selected world filenames. Your existing .wld and .ldx are not replaced.';
  if(direct())dialog.querySelector('[data-placement-files]').textContent=scene?'Registers the Wonderblocks layer in the existing .ldx under Common, shared by the game modes. Reopen the world in WorldEdit to load it. The .wld and terrain stay untouched. Replaced files are backed up under _wonderblocks/backups.':'Writes meshes, textures and object definitions to msh and odf. Matching files are replaced; originals are backed up under _wonderblocks/backups.';
  if(assetsOnly())dialog.querySelector('[data-placement-files]').textContent='Updates mesh, texture and ODF files. WorldEdit placements and planning stay untouched.';
  const paths=dialog.querySelector('[data-file-paths]');paths.replaceChildren();
  for(let path of [...groups.flatMap(g=>g[2]),`source/${name}.building.json`,'export-report.json','README.txt',...(ai?['source/ai-navigation.json','ai-navigation-preview.html',merging?'source/ai-merge-report.json':'merge-ai-navigation.ps1']:[])]){if(direct()){if(/\.(wld|ps1)$/.test(path))continue;if(!/^(msh|odf|world1)\//.test(path))path=`_wonderblocks/exports/${profile?.id??name}/`+path;}const item=document.createElement('li'),code=document.createElement('code');code.textContent=path;item.append(code);paths.append(item);}
 }
 function exportBlocker(){
  if(busy)return {message:'Export in progress…',waiting:true};
  const sectionError=input('output').value==='scene'?routeSectionError(Number(input('sections').value)):null;if(sectionError)return {message:sectionError,action:'Fix section count',fix:()=>input('sections').focus()};
  if(previewBusy)return {message:'Preparing the export preview…',waiting:true};
  if(scopeError)return {message:scopeError};
  if(!input('export-name').value.trim())return {message:'Enter an export name.',action:'Enter name',fix:()=>input('export-name').focus()};
  if(analysisBusy)return {message:'Checking collision requirements. The export button will become available when this finishes.',waiting:true};
  if(analysisError)return {message:'Collision check failed: '+analysisError,action:'Retry check',fix:checkHelpers};
  if(helperBlocked()){
   if(recommendation?.required&&!input('collision-helpers').checked)return {message:'This selection requires separate collision helpers.',action:'Enable collision helpers',fix:()=>{input('collision-helpers').checked=true;helpersTouched=true;syncControls();refreshContents();}};
   return {message:'MSH only cannot attach the collision helpers this selection needs. Choose MSH + ODF, or exclude collision.',action:'Use MSH + ODF',fix:()=>{input('output').value='object';refreshPreview();}};
  }
  if(mergeReading)return {message:'Reading the selected world folder…',waiting:true};
  if(direct()){
   if(folderError)return {message:folderError,action:'Choose world folder…',fix:()=>chooseFolder(true)};
   if(!worldFolder)return {message:'Choose a world folder before exporting there.',action:'Choose world folder…',fix:()=>chooseFolder(true)};
   if(input('output').value==='scene'&&!assetsOnly()&&!input('target-world').value)return {message:'No matching .wld and .ldx files were found in world1. Choose an existing world source folder.',action:'Choose world folder…',fix:()=>chooseFolder(true)};
   if(input('output').value==='scene'&&!assetsOnly()&&input('ai-navigation').checked&&!mergeActive())return {message:'Direct export with AI generation needs Merge with existing world planning. Enable merging, or turn off AI generation.',action:'Enable planning merge',fix:()=>{input('merge-navigation').checked=true;syncTargetPlanning();syncControls();refreshContents();}};
  }
  if(mergeActive()){
   if(mergeError)return {message:mergeError,action:'Choose world folder…',fix:()=>chooseFolder(direct())};
   if(!mergeSource())return {message:direct()&&mergeWorlds.length?'The target world has no matching planning file. Choose another target world, or turn off AI generation.':'Choose the existing world folder to merge its .pln and .bar files, or uncheck Merge with existing world planning.',action:'Choose world folder…',fix:()=>chooseFolder(direct())};
  }
  return null;
 }
 function syncControls(){
  const single=input('output').value!=='scene';
  for(const el of dialog.querySelectorAll('[data-scene-only]'))el.hidden=single;
  dialog.querySelector('[data-planning-controls]').hidden=single||assetsOnly();
  fields.forEach(el=>el.disabled=busy);input('sections').disabled=busy||single;input('ai-navigation').disabled=busy||single||assetsOnly();
  input('collision-helpers').disabled=busy||!input('collision').checked;
  input('merge-navigation').disabled=busy||single||assetsOnly()||!input('ai-navigation').checked;
  dialog.querySelector('[data-update-controls]').hidden=single;input('scene-update').options[0].textContent=direct()?'Replace scene placements':'Scene placements and assets';input('scene-update').options[1].textContent=direct()?'Update assets only':'Assets only';
  dialog.querySelector('[data-cleanup-controls]').hidden=single||!direct()||assetsOnly()||input('ai-navigation').checked;
  dialog.querySelector('[data-merge-setup]').hidden=!mergeActive();dialog.querySelector('[data-merge-world-field]').hidden=!mergeWorlds.length||direct();
  dialog.querySelector('[data-choose-merge-folder]').disabled=busy||mergeReading||!mergeActive();input('merge-world').disabled=busy||mergeReading||!mergeActive();
  dialog.querySelector('[data-world-folder]').hidden=!direct();dialog.querySelector('[data-choose-world-folder]').disabled=busy||mergeReading;
  dialog.querySelector('[data-target-world-field]').hidden=single||assetsOnly()||!targetWorlds.length;input('target-world').disabled=busy||single||!direct();
  dialog.querySelector('[data-choose-merge-folder]').hidden=direct()&&!!worldFolder;
  dialog.querySelector('[data-world-folder-status]').textContent=folderError||(worldFolder?worldFolder.name+' · msh / odf / world1. Matching files will be replaced with backups.':typeof window.showDirectoryPicker!=='function'?'Direct folder export needs Chrome or Edge.':'Choose the world folder containing msh, odf and world1.');
  dialog.querySelector('[data-world-folder-status]').title=worldFolder?.folder?.path??'';
  if(worldFolder&&!single&&!targetWorlds.length)dialog.querySelector('[data-world-folder-status]').textContent='No matching .wld and .ldx were found in world1. Choose the folder containing the existing world source files.';
  const needsMerge=direct()&&!single&&!assetsOnly()&&input('ai-navigation').checked&&!mergeActive();
  if(needsMerge)dialog.querySelector('[data-world-folder-status]').textContent='Merge with existing world planning to write AI files here, or turn off Generate AI planning and barriers.';
  dialog.querySelector('[data-merge-status]').textContent=mergeReading?'Reading world navigation…':mergeError|| (mergeSource()?`${mergeSource().planningFilename} + ${mergeSource().barrierFilename}${mergeSource().requests.length?' · '+mergeSource().requests.map(r=>r.filename).join(', '):' · No matching .req found'}. `+(direct()?'Merged files replace planning in world1, with backups.':'Originals stay untouched; merged copies go in the ZIP.'):'Choose the folder containing your existing .pln and .bar files. '+(direct()?'Choose the world root to use it for both assets and planning.':'Originals stay untouched; merged copies go in the ZIP.'));
  dialog.querySelector('[data-class-controls]').hidden=input('output').value!=='object';input('class-label').disabled=busy||input('output').value!=='object';
  const blocker=exportBlocker(),readiness=dialog.querySelector('.swbf2-export-readiness'),fix=dialog.querySelector('[data-export-fix]');
  button.disabled=!!blocker;button.title=blocker?.message||'';readiness.hidden=!blocker||busy;dialog.querySelector('[data-export-reason]').textContent=blocker?.message||'';fix.hidden=!blocker?.action;fix.textContent=blocker?.action||'';fix.onclick=blocker?.fix||null;dialog.dataset.waitingExport=String(!!blocker?.waiting);
  dialog.dataset.checkingCollision=String(analysisBusy||previewBusy);helperMessage();
  input('scope').querySelector('[value="selection"]').disabled=!selectedIds.length;
  button.textContent=direct()?'Export to world folder':single?(input('output').value==='mesh'?'Download MSH':'Download MSH + ODF'):assetsOnly()?'Download scene assets':'Download SWBF2 package';
  dialog.querySelector('[data-format-help]').textContent=single?'One combined mesh, with its origin at the bottom center. Textures and compiler options are included in the ZIP. MSH + ODF also keeps any required collision helpers.':'Object groups keep their scene placements. Routes are split into sections. Includes world files and optional AI navigation.';
  if(mergeActive())dialog.querySelector('[data-format-help]').textContent='Object groups keep their placements in an import layer. Existing world planning is merged into the download using its original filenames.';
  if(direct())dialog.querySelector('[data-format-help]').textContent=single?'Updates this asset in the world folder. Existing WorldEdit placements stay unchanged.':assetsOnly()?'Updates assets while retaining WorldEdit placements and planning.':'Updates this scene’s own layer. Other scene layers stay unchanged.';
 }
 async function refreshPreview({rename=false}={}){
  const version=++previewVersion;analysisController?.abort();analysisBusy=false;analysisError=false;recommendation=null;previewBusy=true;scopeError=false;syncControls();status.textContent='Preparing export preview…';
  try{
   const project=scoped();if(rename)input('export-name').value=project.name;refreshContents();
   dialog.querySelector('[data-preview-caption]').textContent=`${project.parts.length} of ${fullSnapshot.parts.filter(p=>p.type!=='character-reference').length} objects included${input('output').value!=='scene'?' · one combined asset':''}`;
   // Paint first when possible, but background tabs may suspend animation frames.
   await new Promise(resolve=>{let frame;const finish=()=>{clearTimeout(timer);if(frame!==undefined)cancelAnimationFrame(frame);resolve();},timer=setTimeout(finish,100);frame=requestAnimationFrame(()=>setTimeout(finish,0));});if(version!==previewVersion||!dialog.open)return;
   preview??=createExportPreview(previewContainer,{roots:previewRoots});const {dimensions}=preview.set(project,{output:input('output').value}),classRecommendation=recommendSceneryClass(project.parts,dimensions);if(!classTouched)input('class-label').value=classRecommendation.recommended;dialog.querySelector('[data-class-recommendation]').textContent='Recommended: '+(classRecommendation.recommended==='prop'?'Prop':'Building')+(classRecommendation.reason==='flora'?' · Trees and plants use Prop.':' · '+classRecommendation.largestDimension.toFixed(1)+' m largest dimension; 2 m cutoff.');preview.showContext(input('context').checked);
   status.textContent='';checkHelpers();
  }catch(error){if(version===previewVersion){scopeError=error.message;status.textContent=error.message;}}
  finally{if(version===previewVersion){previewBusy=false;syncControls();}}
 }
 input('scope').onchange=()=>{rememberProfile();classTouched=false;if(input('scope').value==='selection'&&input('output').value==='scene')input('output').value='object';loadProfile({reuseFolder:true});};
 input('output').onchange=()=>{rememberProfile();loadProfile({reuseFolder:true});};
 input('scene-update').onchange=()=>{syncControls();refreshContents();};
 input('cleanup-navigation').onchange=refreshContents;
 input('destination').onchange=()=>{if(direct()&&worldFolder&&mergeWorlds.length){input('merge-navigation').checked=true;const world=mergeSource()?.worldName;if(targetWorlds.some(w=>w.worldName===world))input('target-world').value=world;}if(!direct()&&!mergeSource()&&mergeWorlds.length)input('merge-world').value=mergeWorlds[0].id;syncTargetPlanning();syncControls();refreshContents();};
 input('export-name').oninput=()=>{syncControls();refreshContents();};
 input('unique-names').onchange=refreshContents;
 input('class-label').onchange=()=>{classTouched=true;};
 for(const name of ['shadows','low-detail'])input(name).onchange=refreshContents;
 for(const name of ['ai-navigation','merge-navigation','merge-world'])input(name).onchange=()=>{syncTargetPlanning();syncControls();refreshContents();};
 function syncTargetPlanning(){if(direct()&&input('target-world').value){const selected=mergeWorlds.find(w=>w.worldName.toLowerCase()===input('target-world').value.toLowerCase());input('merge-world').value=selected?.id||'';}}
 input('target-world').onchange=()=>{if(!knownLayerPath?.startsWith('world1/'+input('target-world').value+'_'))knownLayerPath=null;syncTargetPlanning();syncControls();refreshContents();};
 function setMergeWorlds(worlds,keepName=mergeSource()?.worldName){
  mergeWorlds=worlds;input('merge-world').replaceChildren(...worlds.map(w=>{const option=document.createElement('option');option.value=w.id;option.textContent=worlds.length>1?w.id:`${w.worldName} — ${w.planningFilename} / ${w.barrierFilename}`;return option;}));const kept=worlds.find(w=>w.worldName===keepName||w.id===keepName);if(kept)input('merge-world').value=kept.id;
 }
 async function useFolder(handle,keepName,autoMerge=true){
  const version=profileVersion,info=await inspectWorldFolder(handle),worlds=info.canWriteWorld?await worldFolderWorlds(handle):[];let navigation=[],error='',layerPath=null;
  try{navigation=await worldFolderNavigation(handle);}catch(issue){error=issue.message;}
  if(profile&&info.canWriteWorld)try{let dir=handle;for(const name of ['_wonderblocks','exports',profile.id])dir=await dir.getDirectoryHandle(name);const file=await(await dir.getFileHandle('export-report.json')).getFile();layerPath=JSON.parse(await file.text()).layerFile??null;}catch{}
  if(version!==profileVersion)return false;
  clearConflicts();lastFolder=handle;worldFolder=info.canWriteWorld?handle:null;sessionFolders.set(profile.id,handle);mergeError=error;folderError='';targetWorlds=worlds;knownLayerPath=layerPath;
  input('target-world').replaceChildren(...worlds.map(w=>{const option=document.createElement('option');option.value=w.worldName;option.textContent=w.worldName;return option;}));const preferred=worlds.find(w=>w.worldName===keepName)||worlds.find(w=>w.worldName.toLowerCase()===handle.name.toLowerCase());if(preferred)input('target-world').value=preferred.worldName;setMergeWorlds(navigation,keepName);
  if(autoMerge&&direct()&&navigation.length)input('merge-navigation').checked=true;syncTargetPlanning();return true;
 }
 async function chooseFolder(forExport=false){
  mergeReading=true;folderError='';syncControls();
  try{
   let handle;
   if(chooseFolderHandle)handle=await chooseFolderHandle({id:'wonderblocks-world',mode:forExport||direct()?'readwrite':'read',...(lastFolder?{startIn:lastFolder}:{})});
   else try{handle=await chooseLocalWorldFolder(lastFolder?.id);}catch(error){if(![404,501].includes(error.status)||typeof window.showDirectoryPicker!=='function')throw error;handle=await window.showDirectoryPicker({id:'wonderblocks-world',mode:forExport||direct()?'readwrite':'read'});}
   if(!handle)return;const info=await inspectWorldFolder(handle);if((forExport||direct())&&!info.canWriteWorld)throw Error('Choose the world folder containing msh, odf and world1, rather than world1 itself.');
   await useFolder(handle);rememberProfile();
  }catch(error){if(error.name!=='AbortError'){if(forExport||direct())folderError=error.message;else mergeError=error.message;}}
  finally{mergeReading=false;syncControls();refreshContents();rememberProfile();}
 }
 dialog.querySelector('[data-choose-world-folder]').onclick=()=>chooseFolder(true);
 dialog.querySelector('[data-choose-merge-folder]').onclick=()=>chooseFolder();
 input('merge-folder').onchange=async()=>{
  if(!input('merge-folder').files.length)return;const version=++mergeReadVersion;mergeReading=true;mergeError='';mergeWorlds=[];worldFolder=null;syncControls();
  try{const worlds=await readNavigationFolder(input('merge-folder').files);if(version!==mergeReadVersion)return;worldFolder=null;setMergeWorlds(worlds);}
  catch(error){if(version===mergeReadVersion)mergeError=error.message;}
  finally{if(version===mergeReadVersion){mergeReading=false;syncControls();refreshContents();rememberProfile();}}
 };
 input('collision').onchange=()=>{refreshContents();checkHelpers();};
 input('sections').oninput=()=>{
  clearTimeout(helperCheckTimer);analysisController?.abort();recommendation=null;
  if(analysisError&&status.textContent===analysisError)status.textContent='';analysisError=false;
  analysisBusy=input('collision').checked&&!routeSectionError(Number(input('sections').value));syncControls();refreshContents();
  if(analysisBusy)helperCheckTimer=setTimeout(checkHelpers,120);
 };
 input('sections').onchange=checkHelpers;
 input('collision-helpers').onchange=()=>{helpersTouched=true;syncControls();refreshContents();};
 input('context').onchange=()=>preview?.showContext(input('context').checked);
 dialog.querySelector('[data-frame="export"]').onclick=()=>preview?.frame();dialog.querySelector('[data-frame="scene"]').onclick=()=>preview?.frame(true);
 dialog.addEventListener('close',()=>{if(!dialog.open){rememberProfile();profileVersion++;clearTimeout(helperCheckTimer);helperCheckTimer=null;controller?.abort();analysisController?.abort();previewVersion++;previewBusy=false;preview?.clear();}});
 button.onclick=async()=>{
  if(busy||button.disabled)return;if(!rememberProfile()){status.textContent='Export choices contain an invalid value. Check them before exporting.';return;}busy=true;dialog.dataset.busy='true';status.setAttribute('aria-busy','true');button.disabled=true;syncControls();controller=new AbortController();status.textContent='Preparing your export...';progress.hidden=false;progress.removeAttribute('value');
  try{
   let navigationSource=mergeActive()?mergeSource():null;
   if(direct()){
    await allowWorldFolderWrite(worldFolder);
    if(mergeActive()){const worlds=await worldFolderNavigation(worldFolder),fresh=worlds.find(w=>w.worldName===navigationSource.worldName);if(!fresh)throw Error('The selected world planning file is no longer in world1. Choose the world folder again.');setMergeWorlds(worlds,fresh.worldName);navigationSource=fresh;}
   }
   const project=scoped();project.name=input('export-name').value.trim();if(!project.name)throw Error('Enter an export name.');
   const settings={...SWBF2_EXPORT_DEFAULTS,output:input('output').value,assetsOnly:assetsOnly(),classLabel:input('output').value==='object'?input('class-label').value:'auto',uniqueAssetNames:input('unique-names').checked,routeSections:Number(input('sections').value),maxTextureSize:Number(input('textures').value),includeCollision:input('collision').checked,separateCollisionHelpers:input('collision-helpers').checked,shadows:input('shadows').checked,lowDetail:input('low-detail').checked,aiNavigation:input('output').value==='scene'&&!assetsOnly()&&input('ai-navigation').checked};
   const prepared=await preparedCollision(project,controller.signal);
   const onProgress=({phase,label,completed,total})=>{status.textContent=phase+(label?' · '+label:'')+(total?' · '+completed+' / '+total:'');if(phase==='Estimating AI planning and barriers'||phase==='Merging existing world planning'||phase==='Packing download')progress.removeAttribute('value');else progress.value=total?completed/total:0;};
   const result=await createSWBF2PackageAsync(project,settings,{signal:controller.signal,collisionSource:prepared,navigationMerge:navigationSource,packZip:!direct(),onProgress});
   const saved=direct()?await writeWorldFolder(worldFolder,result,{signal:controller.signal,navigationSource,worldName:input('target-world').value||undefined,mode:assetsOnly()?'assets':'placements',cleanupNavigation:input('output').value==='scene'&&!assetsOnly()&&!input('ai-navigation').checked&&input('cleanup-navigation').value==='remove',allowOverwrite:input('allow-overwrite').checked,onProgress}):null;
   if(!saved)download(result.zip,result.filename,'application/zip');
   const triangles=result.manifest.assets.filter(a=>a.role!=='collision').reduce((n,a)=>n+(a.triangles??0),0);
   status.textContent=`Exported ${result.manifest.assetsOnly?result.manifest.assets.filter(a=>a.role!=='collision').length:result.manifest.objects} ${result.manifest.assetsOnly?'assets':result.manifest.asset?'asset':'scene objects'} · ${triangles.toLocaleString()} mesh triangles${result.manifest.navigation?' · '+result.manifest.navigation.hubs+' AI hubs':''}. ${saved?`Saved to ${worldFolder.name}. ${saved.registration?'Layer '+saved.registration.id+' registered. Reopen the world in WorldEdit. ':''}${saved.backup?'Originals: '+saved.backup+'. ':''}`:''}${result.manifest.warnings.length?'See the export report for '+result.manifest.warnings.length+' notes.':''}`;if(saved?.layer)knownLayerPath=saved.layer;
   if(saved)status.textContent=`Saved to ${worldFolder.name} · ${saved.updated} updated · ${saved.reused} unchanged · ${saved.archived} retired.`+(saved.registration?' Reopen the world in WorldEdit.':'');
   const notes=saved?.warnings??result.manifest.warnings??[],section=dialog.querySelector('[data-export-notes]'),list=dialog.querySelector('[data-notes-list]');list.replaceChildren(...notes.map(note=>{const li=document.createElement('li');li.textContent=note;return li;}));section.hidden=!notes.length;dialog.querySelector('[data-notes-title]').textContent=notes.length+' export note'+(notes.length===1?'':'s');
   const openButton=dialog.querySelector('[data-open-output]');openButton.hidden=!saved||!worldFolder?.open;const outputFolder=worldFolder;openButton.title=outputFolder?.folder?.path??'';openButton.onclick=()=>outputFolder.open().catch(error=>notify(error.message));dialog.querySelector('[data-overwrite-conflicts]').hidden=true;input('allow-overwrite').checked=false;
   notify(saved?'SWBF2 files saved to '+worldFolder.name+'.':'SWBF2 package downloaded.');
  }catch(error){if(error.name!=='AbortError'){if(error.name==='ExportOwnershipError'){dialog.querySelector('[data-overwrite-conflicts]').hidden=false;dialog.querySelector('[data-conflicting-names]').textContent=error.conflicts.slice(0,8).map(c=>c.path+' ('+c.owner+')').join(', ');}status.textContent=error.message;notify('SWBF2 export: '+error.message);}}
  finally{busy=false;delete dialog.dataset.busy;status.setAttribute('aria-busy','false');controller=null;button.disabled=false;syncControls();progress.hidden=true;}
 };
 for(const el of fields)if(el.name!=='allow-overwrite')el.addEventListener('change',()=>{if(!previewBusy&&!mergeReading)rememberProfile();});input('export-name').addEventListener('input',()=>{if(!previewBusy&&!mergeReading)rememberProfile();});
 return {open(){
  if(busy)controller?.abort();preparedSources.clear();helpersTouched=false;classTouched=false;document.activeElement?.blur();fullSnapshot=snapshot();selectedIds=selection().filter(id=>fullSnapshot.parts.some(p=>p.id===id&&p.type!=='character-reference'));
  if(!selectedIds.length&&fullSnapshot.swbf2Exports?.active?.startsWith('asset:')&&exportProfileKey(fullSnapshot,null,'object')===fullSnapshot.swbf2Exports.active)selectedIds=fullSnapshot.parts.filter(p=>p.type!=='character-reference').map(p=>p.id);
  input('scope').value=selectedIds.length?'selection':'scene';
  if(input('scope').value==='selection'&&!selectedIds.length){input('scope').value='scene';input('output').value='scene';}
  input('output').value=input('scope').value==='selection'?'object':'scene';initialized=true;
  if(!dialog.open)dialog.showModal();loadProfile();
 },dialog};
}
