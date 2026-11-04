import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import JSZip from 'jszip';

const {createServer}=createRequire(import.meta.url)('../../server.cjs');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const artifacts=await mkdtemp(path.join(tmpdir(),'wb-browser-'));
let browser,context,page;
const errors=[],renderErrors=[];
async function check(label,action){await action();console.log('PASS browser: '+label);}
try{
 browser=await chromium.launch({headless:true,channel:process.env.WONDERBLOCKS_BROWSER_CHANNEL||(existsSync(chromium.executablePath())?'chromium':'chrome'),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|shader error|VALIDATE_STATUS|WebGL: INVALID/i.test(message.text()))renderErrors.push(message.text());});
 await page.goto(origin);await waitForSceneReady();
 // Start from a retained scene through Open, so autosave/reload checks use a normal editing session.
 await page.locator('#file').setInputFiles({name:'classical-temple.building.json',mimeType:'application/json',buffer:await readFile(new URL('../../examples/projects/classical-temple.building.json',import.meta.url))});await waitForSceneReady();await page.reload();await waitForSceneReady();await page.waitForFunction(()=>document.querySelectorAll('#scene-outline .scene-select').length>0);
 const outline=page.locator('#scene-outline');
 async function waitForSceneReady(){await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open,null,{timeout:90000});}
 await waitForSceneReady();
 await check('View fog slider changes rendered fog, turns off, and survives framing without editing the project',async()=>{
  await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),original=T.Mesh.prototype.onBeforeRender;window.restoreFogRender=()=>{T.Mesh.prototype.onBeforeRender=original;};T.Mesh.prototype.onBeforeRender=function(renderer,scene,...args){if(renderer.domElement.parentElement?.id==='viewport')window.renderedFog=scene.fog?{near:scene.fog.near,far:scene.fog.far}:null;return original.call(this,renderer,scene,...args);};});
  try{
   const view=page.locator('.viewport-view-options'),slider=view.getByRole('slider',{name:'Fog',exact:true});await view.locator('summary').first().click();assert.equal(await slider.inputValue(),'50');
   await page.waitForFunction(()=>window.renderedFog?.far>0);const baseline=await page.evaluate(()=>window.renderedFog);
   await slider.press('End');await page.waitForFunction(near=>Math.abs(window.renderedFog.near-near/2)<1e-6,baseline.near);assert.equal(await page.locator('#fog-value').textContent(),'100%');
   await page.locator('#viewport').screenshot({path:path.join(artifacts,'view-fog.png')});
   await slider.press('Home');await page.waitForFunction(()=>window.renderedFog===null);assert.equal(await page.locator('#fog-value').textContent(),'Off');
   await view.getByRole('button',{name:'Frame all',exact:true}).click();await page.waitForFunction(()=>window.renderedFog===null);assert.equal(await slider.inputValue(),'0');
   await slider.press('End');await page.waitForFunction(()=>window.renderedFog?.far>window.renderedFog?.near);
   for(let i=0;i<50;i++)await slider.press('ArrowLeft');assert.equal(await slider.inputValue(),'50');
   await page.waitForFunction(near=>Math.abs(window.renderedFog.near-near)<1e-6,baseline.near);assert.equal(await page.locator('#undo').isDisabled(),true);
   await view.locator('summary').first().click();
  }finally{await page.evaluate(()=>window.restoreFogRender());}
 });
 await check('actual scene selection, duplicate, undo and redo',async()=>{
  await outline.locator('.scene-select').first().click();
  await page.locator('#properties').waitFor({state:'visible'});
  const before=await outline.locator('.scene-count').textContent();
  await page.locator('#duplicate').click();
  assert.notEqual(await outline.locator('.scene-count').textContent(),before);
  await page.locator('#undo').click();assert.equal(await outline.locator('.scene-count').textContent(),before);
  await page.locator('#redo').click();assert.notEqual(await outline.locator('.scene-count').textContent(),before);
  await page.locator('#undo').click();
 });
 await check('palette placement adds one object and keyboard Undo restores the scene',async()=>{
  const before=await outline.locator('.scene-count').textContent();
  await page.locator('#search').fill('Body');
  await page.locator('#parts').getByRole('button',{name:'Place Body',exact:true}).click();
  await page.locator('.editing-context[data-mode="placement"]').waitFor({state:'visible'});
  const canvas=page.locator('#viewport > canvas'),box=await canvas.boundingBox();assert.ok(box);
  await canvas.click({position:{x:box.width*.7,y:box.height*.72}});
  assert.notEqual(await outline.locator('.scene-count').textContent(),before);
  await page.keyboard.press('Control+z');assert.equal(await outline.locator('.scene-count').textContent(),before);
  await page.locator('#search').fill('');
 });
 await check('object group rename, search, hide and reveal use the real scene outline',async()=>{
  await outline.locator('.scene-select').nth(0).click();
  await outline.locator('.scene-select').nth(1).click({modifiers:['Shift']});
  await page.locator('#inspector-group > summary').click();
  await page.getByRole('button',{name:'Group objects',exact:true}).click();
  const group=outline.locator('.scene-group-row').first();
  await group.locator('.scene-rename').click();
  await outline.getByRole('textbox',{name:'Object group name',exact:true}).fill('Browser test group');
  await outline.getByRole('textbox',{name:'Object group name',exact:true}).press('Enter');
  await outline.getByRole('searchbox').fill('Browser test group');
  assert.equal(await outline.locator('.scene-group-row').count(),1);
  await outline.getByRole('button',{name:'Select object group Browser test group',exact:true}).click();
  await outline.getByRole('button',{name:'Hide Browser test group',exact:true}).click();
  assert.equal(await outline.getByRole('button',{name:'Select object group Browser test group',exact:true}).isDisabled(),true);
  await outline.locator('[data-action=show-all]').click();
  assert.equal(await outline.getByRole('button',{name:'Select object group Browser test group',exact:true}).isEnabled(),true);
  await outline.getByRole('searchbox').fill('');
 });
 let saved;
 async function downloadProject(){
  await waitForSceneReady();
  const pending=page.waitForEvent('download');
  const contextSave=page.locator('[data-context-action=save]');
  if(await contextSave.isVisible())await contextSave.click();else await page.locator('#save').click();
  const download=await pending;
  const file=path.join(artifacts,download.suggestedFilename());await download.saveAs(file);
  return {file,project:JSON.parse(await readFile(file,'utf8'))};
 }
 await check('Save downloads the current scene; Open and reload retain the edits',async()=>{
  await page.locator('#title').fill('Browser roundtrip');await page.locator('#title').press('Tab');
  saved=await downloadProject();assert.equal(saved.project.name,'Browser roundtrip');
  assert.ok(saved.project.parts.some(p=>p.assemblyName==='Browser test group'));
  await page.locator('#title').fill('Temporary title');await page.locator('#title').press('Tab');
  await page.locator('#file').setInputFiles(saved.file);await waitForSceneReady();
  await page.waitForFunction(()=>document.querySelector('#title').value==='Browser roundtrip');
  await page.reload();await waitForSceneReady();await page.waitForFunction(()=>document.querySelector('#title')?.value==='Browser roundtrip'&&document.querySelectorAll('#scene-outline .scene-select').length>0);
  assert.deepEqual((await downloadProject()).project,saved.project);
  const malformed=path.join(artifacts,'invalid.json');await writeFile(malformed,'{"format":"bad"}');await page.locator('#file').setInputFiles(malformed);await waitForSceneReady();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Not a supported building project'));
  assert.deepEqual((await downloadProject()).project,saved.project);
 });
 await check('Flora editor can finish a draft and save while remaining open',async()=>{
  await page.locator('[data-workspace-mode="flora"]').click();
  // Use an actual current preset, imported through the same Open flow as user data.
  const project=await page.evaluate(async()=>{
   const {makePart}=await import('/src/core/model.js');
   const {defaultFlora,addFloraAsset}=await import('/src/flora/flora.js');
   const flora=defaultFlora();addFloraAsset(flora,flora.branches[0].id,'curled-fern-fiddlehead');
   return {format:'open-building-studio',version:1,name:'Fern browser test',parts:[makePart('flora',{flora})]};
  });
  const file=path.join(artifacts,'fern.building.json');await writeFile(file,JSON.stringify(project));
  await page.locator('#file').setInputFiles(file);await waitForSceneReady();
  await outline.locator('.scene-select').first().click();
  await page.locator('[data-flora-edit]').click();
  const curl=page.getByRole('slider',{name:'Curl',exact:true});await curl.waitFor({state:'visible'});
  await curl.focus();await curl.press('Home');for(let i=0;i<4;i++)await curl.press('ArrowRight');await curl.press('Tab');
  const draft=await downloadProject();assert.notEqual(draft.project.parts[0].flora.organs[0].morphs.curl,1);
  assert.equal(await curl.isVisible(),true);
  await page.locator('[data-context-action=done]').click();
  assert.equal(await page.locator('[data-workspace-mode="flora"]').getAttribute('aria-pressed'),'true','Done retains the Flora workspace');
  assert.equal(await page.locator('[data-workspace-mode="object"]').getAttribute('aria-pressed'),'false','Done does not switch to Object mode');
  assert.equal(await page.locator('.editing-context').getAttribute('data-mode'),'flora-browse');
  assert.equal(await page.locator('.flora-workspace').isVisible(),true,'plant tools stay available');
  assert.deepEqual((await downloadProject()).project,draft.project);
 });
 await check('route, platform and interior editors expose their scope and return without losing scene objects',async()=>{
  await page.locator('[data-workspace-mode="object"]').click();
  const project=await page.evaluate(async()=>{
   const {makePart}=await import('/src/core/model.js');
   return {format:'open-building-studio',version:1,name:'Editor scopes',parts:['stair-route','platform','interior'].map((type,i)=>makePart(type,{name:'Test '+type,position:[i*12,0,0]}))};
  });
  const file=path.join(artifacts,'scopes.building.json');await writeFile(file,JSON.stringify(project));await page.locator('#file').setInputFiles(file);await waitForSceneReady();
  for(const [type,mode] of [['stair-route','route'],['platform','platform'],['interior','interior']]){
   await outline.getByRole('button',{name:'Test '+type,exact:true}).click();
   await page.locator('#selection-action').click();
   await page.locator('.editing-context[data-mode="'+mode+'"]').waitFor({state:'visible'});
   const snapshot=await downloadProject();assert.equal(snapshot.project.parts.length,3);assert.ok(snapshot.project.parts.some(p=>p.name==='Test '+type));
   if(type==='interior'){
    const editor=page.locator('.interior-3d');
    for(const mode of ['object','material','flora'])assert.equal(await page.locator('[data-workspace-mode="'+mode+'"]').isVisible(),false,'scene mode hidden during room editing');
    assert.equal(await page.locator('.floor-workspace [data-floor]').isVisible(),true);
    assert.equal(await page.locator('.floor-workspace summary').isVisible(),true);
    await editor.locator('[data-wall-thickness]').fill('0.35');await editor.locator('[data-wall-thickness]').press('Tab');
    await editor.getByText('Curved walls',{exact:true}).click();
    await editor.locator('[data-select-all-faces]').click();
    await editor.locator('[data-curve-amount]').focus();await editor.locator('[data-curve-amount]').press('End');await editor.locator('[data-curve-amount]').press('ArrowLeft');await editor.locator('[data-curve-amount]').press('Tab');
    const changed=(await downloadProject()).project.parts.find(p=>p.type==='interior');
    assert.equal(changed.interior.thickness,0.35);assert.ok(changed.interior.rooms[0].curve.amount<1);
   }
   await page.locator('[data-context-action=cancel]').click();
   await page.locator('.editing-context[data-mode="object"]').waitFor({state:'visible'});
   if(type==='interior'){for(const mode of ['object','material','flora'])assert.equal(await page.locator('[data-workspace-mode="'+mode+'"]').isVisible(),true,'scene modes return after cancelling rooms');assert.equal((await downloadProject()).project.parts.find(p=>p.type==='interior').interior.thickness,project.parts.find(p=>p.type==='interior').interior.thickness);}
   await page.locator('#selection-action').click();
   await page.locator('.editing-context[data-mode="'+mode+'"]').waitFor({state:'visible'});
   await page.locator('[data-context-action=done]').click();
   await page.locator('.editing-context[data-mode="object"]').waitFor({state:'visible'});
   if(type==='interior')for(const mode of ['object','material','flora'])assert.equal(await page.locator('[data-workspace-mode="'+mode+'"]').isVisible(),true,'scene modes return after finishing rooms');
   assert.equal((await downloadProject()).project.parts.length,3);
  }
 });
 await check('Meridian tenement section selection and hover reuse geometry while real edits and Undo still rebuild',async()=>{
  await page.goto(origin+'/index.html?demo=coruscant-residential');await waitForSceneReady();await page.getByRole('searchbox',{name:'Find in scene',exact:true}).fill('East continuous tenement mass');await outline.getByRole('button',{name:'East continuous tenement mass',exact:true}).click();
  await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),dispose=T.BufferGeometry.prototype.dispose,setMatrix=T.InstancedMesh.prototype.setMatrixAt,add=T.Object3D.prototype.add,beforeRender=T.Mesh.prototype.onBeforeRender;window.routePerformance={renderDisposals:0,guideMeshes:new Set()};T.BufferGeometry.prototype.dispose=function(){if(this.type==='BufferGeometry')window.routePerformance.renderDisposals++;return dispose.call(this);};T.InstancedMesh.prototype.setMatrixAt=function(...args){if(this.geometry.type==='RingGeometry'&&this.count>=200)window.routePerformance.guideMeshes.add(this.uuid);return setMatrix.apply(this,args);};T.Object3D.prototype.add=function(...children){const result=add.apply(this,children);if(children.some(c=>c.userData.routeControl))window.routePerformance.root=this;return result;};T.Mesh.prototype.onBeforeRender=function(...args){if(this.geometry.type==='RingGeometry')window.routePerformance.camera=args[2];return beforeRender.apply(this,args);};});
  const start=Date.now();await page.locator('#selection-action').click();await page.locator('.editing-context[data-mode=route]').waitFor({state:'visible'});console.log('Meridian route open: '+(Date.now()-start)+' ms');
  assert.equal(await page.locator('#route-segments > button').count(),13);await page.evaluate(()=>window.routePerformance.renderDisposals=0);
  const selectionTimes=[];for(const index of [1,2,3,0]){const started=Date.now();await page.locator('#route-segments > button').nth(index).click();selectionTimes.push(Date.now()-started);}
  assert.equal(await page.evaluate(()=>window.routePerformance.renderDisposals),0,'changing the selected section must retain route and background geometry');
  const box=await page.locator('#viewport > canvas').boundingBox();assert.ok(box);for(const [x,y] of [[.3,.6],[.5,.65],[.7,.55]])await page.mouse.move(box.x+box.width*x,box.y+box.height*y);
  assert.equal(await page.evaluate(()=>window.routePerformance.renderDisposals),0,'hovering must update handles without rebuilding model geometry');assert.equal(await page.evaluate(()=>window.routePerformance.guideMeshes.size),1,'the 250 rings share one instance batch');
  const run=page.locator('#route-run'),before=Number(await run.inputValue());await run.fill(String(before+.5));await run.press('Tab');assert.equal(Number(await run.inputValue()),before+.5);assert.ok(await page.evaluate(()=>window.routePerformance.renderDisposals)>0,'changing dimensions still rebuilds the route');
  await page.locator('#route-back').click();assert.equal(Number(await run.inputValue()),before);await page.locator('#route-redo').click();assert.equal(Number(await run.inputValue()),before+.5);await page.locator('#route-back').click();
  await page.locator('#viewport').screenshot({path:path.join(artifacts,'meridian-before-drag.png')});
  const drag=await page.evaluate(async()=>{const T=await import('/vendor/three.module.js'),{root,camera}=window.routePerformance,handle=root.children.find(m=>m.userData.routeHandle);if(!handle||!camera)throw Error('Missing live route handle');const world=handle.getWorldPosition(new T.Vector3()),next=world.clone().add(new T.Vector3(0,0,2).transformDirection(root.matrixWorld)),box=document.querySelector('#viewport > canvas').getBoundingClientRect(),screen=p=>{p.project(camera);return [box.left+(p.x+1)*box.width/2,box.top+(1-p.y)*box.height/2];};return {from:screen(world),to:screen(next)};});
  await page.keyboard.down('Alt');try{await page.mouse.move(...drag.from);await page.mouse.down();await page.mouse.move(...drag.to,{steps:3});await page.mouse.up();}finally{await page.keyboard.up('Alt');}
  assert.notEqual(Number(await run.inputValue()),before,'the gold endpoint must remain pickable and resize the actual route');await page.locator('#route-back').click();assert.equal(Number(await run.inputValue()),before);
  await page.locator('#viewport').screenshot({path:path.join(artifacts,'meridian-route-editor.png')});console.log('Meridian section selection milliseconds: '+selectionTimes.join(', '));
  await page.locator('[data-context-action=cancel]').click();await page.locator('.editing-context[data-mode=object]').waitFor({state:'visible'});assert.equal(await page.locator('#title').inputValue(),'Coruscant · Meridian rim district');await page.goto(origin);await waitForSceneReady();await page.waitForFunction(()=>document.querySelectorAll('#scene-outline .scene-select').length>0);
 });
 await check('Japanese wall styles retain their roof option and expose independent roof painting',async()=>{
  const fixture=await page.evaluate(async()=>{const {makePart}=await import('/src/core/model.js');const wall=makePart('wall-route',{name:'Japanese builder wall'});wall.route.segments[0].run=8;wall.route.segments.push({...structuredClone(wall.route.segments[0]),run:4,pathStart:{point:[0,0,8],heading:Math.PI/2}});return {format:'open-building-studio',version:1,name:'Wall builder browser',parts:[wall]};});
  const file=path.join(artifacts,'wall-builder.building.json');await writeFile(file,JSON.stringify(fixture));await page.locator('#file').setInputFiles(file);await waitForSceneReady();await page.waitForFunction(()=>document.querySelector('#title').value==='Wall builder browser');
  await outline.getByRole('button',{name:'Japanese builder wall',exact:true}).click();await page.locator('#selection-action').click();
  const style=page.getByRole('combobox',{name:'Wall style',exact:true});await style.selectOption('japanese-open');
  assert.equal(await page.locator('#route-rail-height').inputValue(),'2.4');assert.equal(await page.locator('#route-rail-postWidth').inputValue(),'0.16');assert.equal(await page.locator('#route-rail-spacing').inputValue(),'4');assert.equal(await page.locator('#route-rail-panelThickness').isEnabled(),true);
  await page.locator('#route-back').click();assert.equal(await style.inputValue(),'solid');await page.locator('#route-redo').click();assert.equal(await style.inputValue(),'japanese-open');
  await style.selectOption('japanese-roofed');assert.equal(await page.locator('#route-rail-height').inputValue(),'2.4');
  await page.screenshot({path:path.join(artifacts,'japanese-wall-builder.png'),fullPage:true});
  await page.locator('[data-context-action=done]').click();await page.locator('.editing-context[data-mode="object"]').waitFor({state:'visible'});
  const saved=await downloadProject();assert.ok(saved.project.parts[0].route.segments.every(s=>s.railing.style==='japanese-roofed'));
  await outline.locator('[data-action=frame]').click();await page.getByRole('button',{name:'Deselect',exact:true}).click();await page.locator('#viewport').screenshot({path:path.join(artifacts,'japanese-wall.png')});
  await page.locator('#file').setInputFiles(saved.file);await waitForSceneReady();await outline.getByRole('button',{name:'Japanese builder wall',exact:true}).click();await page.locator('#selection-action').click();assert.equal(await style.inputValue(),'japanese-roofed');await page.locator('[data-context-action=done]').click();
  await page.locator('[data-workspace-mode=material]').click();await page.locator('[data-material-target]').selectOption('roof');
  assert.equal(await page.locator('[data-material-color]').inputValue(),'#61958b');await page.locator('[data-material-color]').fill('#4455aa');await page.locator('[data-material-color]').dispatchEvent('change');
  const painted=(await downloadProject()).project.parts[0];assert.ok(painted.route.segments.every(s=>s.componentFinishes.roof.color==='#4455aa'&&!s.componentFinishes.walls));
  await page.locator('[data-workspace-mode=object]').click();
 });
 await check('export dialog validates settings and can close and reopen without locking controls',async()=>{
  await page.locator('#export-swbf2').click();
  const dialog=page.getByRole('dialog',{name:'Export to SWBF2',exact:true});await dialog.waitFor({state:'visible'});
  await dialog.locator('[name=scope]').selectOption('scene');await dialog.locator('[name=output]').selectOption('scene');
  await dialog.locator('[name=sections]').fill('0');assert.equal(await dialog.locator('[data-action=export]').isDisabled(),true);
  await page.waitForFunction(()=>document.querySelector('[data-export-reason]')?.textContent.includes('1–24 sections'));
  await dialog.locator('[name=sections]').fill('6');await page.waitForFunction(()=>!document.querySelector('.swbf2-export [data-action=export]').disabled);
  await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();
  await page.locator('#export-swbf2').click();await page.waitForFunction(()=>!document.querySelector('.swbf2-export [data-action=export]').disabled);assert.equal(await dialog.locator('[data-action=export]').isEnabled(),true);
  await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();
 });
 await check('export collision and AI switches independently control downloaded packages',async()=>{
  const fixture=await page.evaluate(async()=>{
   const {makePart}=await import('/src/core/model.js');
   const {defaultRoute}=await import('/src/routes/stair-route.js');
   return {format:'open-building-studio',version:1,name:'Navigation toggle',parts:[makePart('stair-route',{route:defaultRoute()})]};
  });
  const file=path.join(artifacts,'navigation-toggle.building.json');await writeFile(file,JSON.stringify(fixture));
  await page.locator('#file').setInputFiles(file);await waitForSceneReady();
  await page.waitForFunction(()=>document.querySelector('#title').value==='Navigation toggle');
  const before=(await downloadProject()).project;
  await page.locator('#export-swbf2').click();
  const dialog=page.getByRole('dialog',{name:'Export to SWBF2',exact:true}),toggle=dialog.getByRole('checkbox',{name:'Generate AI planning and barriers',exact:true});
  const collision=dialog.getByRole('checkbox',{name:'Include collision',exact:true}),contents=dialog.getByRole('region',{name:'Files in this download',exact:true});
  const expectedTypes=enabled=>['.lyr','.wld','.ldx','.odf','.msh','.tga','.msh.option','.tga.option',...(enabled?['.pln','.bar','.req']:[])];
  assert.deepEqual(await contents.locator('[data-file-types] code').allTextContents(),expectedTypes(true));
  await dialog.getByRole('textbox',{name:'Export name',exact:true}).fill('My scene / files');assert.match(await contents.locator('[data-download-name]').textContent(),/^my_scene_files.swbf2.zip/);assert.match(await contents.locator('[data-file-paths]').textContent(),/world1\/my_scene_files_wonderblocks.lyr/);
  await dialog.getByRole('textbox',{name:'Export name',exact:true}).fill(before.name);
  assert.equal(await collision.isChecked(),true);
  assert.equal(await toggle.isChecked(),true);
  await dialog.locator('[name=sections]').fill('6');
  await dialog.screenshot({path:path.join(artifacts,'export-file-summary.png')});
  const packages=[];
  for(const [includeCollision,enabled] of [[true,false],[true,true],[false,false],[false,true]]){
   await toggle.setChecked(enabled);await collision.setChecked(includeCollision);
   assert.deepEqual(await contents.locator('[data-file-types] code').allTextContents(),expectedTypes(enabled));
   if(!enabled)assert.match(await contents.locator('[data-file-types]').textContent(),/Off — no .pln, .bar or .req/);
   assert.equal((await contents.locator('[data-embedded-files]').textContent()).includes('Collision is excluded.'),!includeCollision);
   // Closing and reopening must retain this export choice.
   await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();
   await page.locator('#export-swbf2').click();assert.equal(await toggle.isChecked(),enabled);assert.equal(await collision.isChecked(),includeCollision);
   const pending=page.waitForEvent('download',{timeout:120000});await dialog.locator('[data-action=export]').click();
   const download=await pending,destination=path.join(artifacts,'navigation-'+enabled+'-collision-'+includeCollision+'.zip');await download.saveAs(destination);
   const zip=await JSZip.loadAsync(await readFile(destination),{checkCRC32:true}),report=JSON.parse(await zip.file('export-report.json').async('string'));
   assert.ok((await contents.locator('[data-download-name]').textContent()).startsWith(download.suggestedFilename()));
   for(const extension of expectedTypes(enabled))assert.ok(Object.keys(zip.files).some(name=>name.endsWith(extension)),extension+' advertised by the dialog must be in the ZIP');
   for(const name of Object.keys(zip.files).filter(n=>n.endsWith('.msh')||n.endsWith('.tga')))assert.ok(zip.file(name+'.option'),name+' companion option file');
   assert.equal(report.settings.includeCollision,includeCollision);
   assert.equal(report.assets.some(a=>a.collisionBodies.length>0),includeCollision);
   if(!includeCollision){
    assert.equal(report.primitiveBudget.native,0);assert.equal(report.primitiveBudget.nativeCollisionMeshes,0);
    assert.ok(report.assets.every(a=>a.role!=='collision'));
    for(const name of Object.keys(zip.files).filter(name=>name.endsWith('.msh')))assert.match(await zip.file(name+'.option').async('string'),/^-nocollision$/m);
   }
   assert.equal(report.settings.aiNavigation,enabled);assert.equal(Boolean(report.navigation),enabled);
   for(const suffix of ['.pln','.bar','.req'])assert.equal(Object.keys(zip.files).some(name=>name.startsWith('world1/')&&name.endsWith(suffix)),enabled);
   for(const name of ['source/ai-navigation.json','ai-navigation-preview.html','merge-ai-navigation.ps1'])assert.equal(Boolean(zip.file(name)),enabled);
   if(enabled){assert.ok(report.navigation.hubs>0);assert.ok(report.navigation.connections>0);assert.ok(report.navigation.barriers>0);}
   const physical={};for(const [name,entry] of Object.entries(zip.files))if(/^(msh|odf)\//.test(name))physical[name]=await entry.async('nodebuffer');
   assert.ok(Object.keys(physical).length>0);packages.push(physical);
  }
  assert.deepEqual(packages[0],packages[1],'AI navigation must not change meshes, textures, collision or ODFs');
  assert.deepEqual(packages[2],packages[3],'AI navigation is independent when physical collision is excluded');
  await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();
  {const saved=(await downloadProject()).project,original=structuredClone(before);assert.ok(saved.swbf2Exports?.profiles);delete saved.swbf2Exports;delete original.swbf2Exports;assert.deepEqual(saved,original);}
 });
 await check('selected object group preview and standalone MSH/ODF downloads match the chosen objects',async()=>{
  const fixture=await page.evaluate(async()=>{
   const {makePart}=await import('/src/core/model.js');
   const a=makePart('block',{name:'Dock base',position:[2,0,0],scale:[3,1,3]}),b=makePart('stair-route',{name:'Dock stairs',position:[2,1,0]});
   for(const p of [a,b]){p.assemblyId='dock';p.assemblyName='Dock';}
   return {format:'open-building-studio',version:1,name:'Asset browser test',parts:[a,b,makePart('orb',{name:'Unselected sphere',position:[12,0,0],scale:[3,3,3]})]};
  });
  const file=path.join(artifacts,'asset.building.json');await writeFile(file,JSON.stringify(fixture));await page.locator('#file').setInputFiles(file);await waitForSceneReady();
  await page.waitForFunction(()=>document.querySelector('#title').value==='Asset browser test');
  await outline.getByRole('button',{name:'Select object group Dock',exact:true}).click();await outline.locator('[data-action=frame]').click();
  const before=(await downloadProject()).project;
  await page.locator('#viewport').screenshot({path:path.join(artifacts,'selection-highlight.png')});
  await page.locator('#export-swbf2').click();await page.getByRole('dialog',{name:'Export to SWBF2',exact:true}).locator('[name=scope]').selectOption('selection');
  const dialog=page.getByRole('dialog',{name:'Export to SWBF2',exact:true}),preview=dialog.locator('.swbf2-export-preview');
  await dialog.locator('[name=output]').selectOption('object');
  assert.equal(await dialog.locator('[name=scope]').inputValue(),'selection');assert.equal(await dialog.locator('[name=output]').inputValue(),'object');
  const contents=dialog.getByRole('region',{name:'Files in this download',exact:true});
  assert.deepEqual(await contents.locator('[data-file-types] code').allTextContents(),['.odf','.msh','.tga','.msh.option','.tga.option']);
  assert.deepEqual(JSON.parse(await preview.getAttribute('data-part-ids')),fixture.parts.slice(0,2).map(p=>p.id));
  assert.match(await dialog.locator('[data-preview-caption]').textContent(),/2 of 3 objects included/);assert.ok(await preview.locator('canvas').isVisible());
  await dialog.locator('[data-frame=scene]').click();await dialog.locator('[data-frame=export]').click();
  await dialog.screenshot({path:path.join(artifacts,'asset-export-preview.png')});
  const readDownload=async()=>{const pending=page.waitForEvent('download',{timeout:120000});await dialog.locator('[data-action=export]').click();const download=await pending,destination=path.join(artifacts,download.suggestedFilename());await download.saveAs(destination);return JSZip.loadAsync(await readFile(destination),{checkCRC32:true});};
  await dialog.locator('[name=collision]').check();
  const object=await readDownload(),report=JSON.parse(await object.file('export-report.json').async('string'));
  for(const name of Object.keys(object.files).filter(n=>n.endsWith('.msh')||n.endsWith('.tga')))assert.ok(object.file(name+'.option'),name+' companion option file');
  assert.equal(report.objects,1);assert.ok(object.file(report.asset.mesh));assert.ok(object.file(report.asset.odf));assert.equal(Object.keys(object.files).some(n=>n.startsWith('world1/')),false);
  assert.deepEqual(new Set(report.assets.flatMap(a=>a.sourcePartIds)),new Set(fixture.parts.slice(0,2).map(p=>p.id)));
  assert.ok(report.asset.collisionHelpers.length>0);
  await dialog.locator('[name=scope]').selectOption('scene');await page.waitForFunction(()=>document.querySelector('.swbf2-export-preview').dataset.objectCount==='3');assert.equal(await preview.getAttribute('data-object-count'),'3');
  await dialog.locator('[name=scope]').selectOption('selection');await dialog.locator('[name=output]').selectOption('mesh');
  assert.deepEqual(await contents.locator('[data-file-types] code').allTextContents(),['.msh','.tga','.msh.option','.tga.option']);
  await page.waitForFunction(()=>document.querySelector('.swbf2-export').dataset.checkingCollision==='false');
  assert.equal(await dialog.locator('[data-action=export]').isDisabled(),true);assert.match(await dialog.locator('[data-helper-recommendation]').textContent(),/Choose MSH \+ ODF/);
  await dialog.locator('[name=collision]').uncheck();
  const mesh=await readDownload();assert.equal(Object.keys(mesh.files).filter(n=>n.endsWith('.msh')).length,1);assert.equal(Object.keys(mesh.files).filter(n=>n.endsWith('.odf')).length,0);
  await page.setViewportSize({width:620,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await preview.screenshot({path:path.join(artifacts,'asset-export-mobile.png')});
  await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();await page.setViewportSize({width:1440,height:1000});
  {const saved=(await downloadProject()).project,original=structuredClone(before);assert.ok(saved.swbf2Exports?.profiles);delete saved.swbf2Exports;delete original.swbf2Exports;assert.deepEqual(saved,original);}assert.equal(await outline.getByRole('button',{name:'Select object group Dock',exact:true}).getAttribute('aria-pressed'),'true');
  await outline.getByRole('button',{name:'Unselected sphere',exact:true}).click();await outline.locator('[data-action=frame]').click();
  await page.locator('#viewport').screenshot({path:path.join(artifacts,'selection-single.png')});
 });
 await check('tree selection and static asset preview render leaf cutouts without shader errors',async()=>{
  const fixture=await page.evaluate(async()=>{const {makePart}=await import('/src/core/model.js');const {instantiateFloraTreePreset}=await import('/src/flora/flora-tree-presets.js');return {format:'open-building-studio',version:1,name:'Tree selection',parts:[makePart('flora',{...instantiateFloraTreePreset('endor-woodland-tree'),name:'Preview tree',position:[30,0,-20],scale:[-1,1,1]})]};});
  const file=path.join(artifacts,'tree-preview.building.json');await writeFile(file,JSON.stringify(fixture));await page.locator('#file').setInputFiles(file);await waitForSceneReady();await page.waitForFunction(()=>document.querySelector('#title').value==='Tree selection');
  await outline.getByRole('button',{name:'Preview tree',exact:true}).click();await outline.locator('[data-action=frame]').click();
  await page.locator('#viewport').screenshot({path:path.join(artifacts,'selection-tree.png')});await page.locator('#export-swbf2').click();await page.getByRole('dialog',{name:'Export to SWBF2',exact:true}).locator('[name=scope]').selectOption('selection');
  const dialog=page.getByRole('dialog',{name:'Export to SWBF2',exact:true});await dialog.locator('[name=output]').selectOption('mesh');
  await dialog.locator('.swbf2-export-preview').screenshot({path:path.join(artifacts,'tree-asset-preview.png')});
  await dialog.getByRole('button',{name:'Close exporter',exact:true}).click();
 });
 await check('blocked autosave warns without losing downloadable changes',async()=>{
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked for test','QuotaExceededError');};});
  await page.locator('#title').fill('Still downloadable');await page.locator('#title').press('Tab');
  assert.match(await page.locator('#toast').textContent(),/Autosave unavailable/);
  assert.equal((await downloadProject()).project.name,'Still downloadable');
 });
 await check('narrow viewport has no page overflow and top controls remain reachable',async()=>{
  await page.setViewportSize({width:760,height:800});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const box=await page.locator('#save').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=760);
 });
 await page.setViewportSize({width:1440,height:1000});
 await check('actual worker entrypoints clone jobs, transfer buffers and process subsequent edits',async()=>{
  const result=await page.evaluate(async()=>{
   const request=(worker,data)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Worker response timeout')),30000);
    worker.onmessage=e=>{clearTimeout(timer);resolve(e.data);};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.postMessage(data);
   });
   const collision=new Worker('/src/collision/collision-worker.js',{type:'module'}),floraWorker=new Worker('/src/flora/flora-weld-worker.js',{type:'module'});
   try{
    const {defaultFlora,addFloraAsset,floraWeldGeometry}=await import('/src/flora/flora.js');
    const matches=(reply,flora)=>{const geometry=floraWeldGeometry(flora);try{return ['position','normal','uv'].every(key=>reply[key]?.length===geometry.attributes[key].array.length&&reply[key].every((v,i)=>v===geometry.attributes[key].array[i]))&&reply.index?.length===geometry.index.array.length&&reply.index.every((v,i)=>v===geometry.index.array[i]);}finally{geometry.dispose();}};
    const flora=defaultFlora(),branch=addFloraAsset(flora,flora.branches[0].id,'flora-elbow-branch');addFloraAsset(flora,branch.id,'flora-stepped-branch',1);flora.detail='swbf2';
    const original=JSON.stringify(flora),first=await request(floraWorker,{key:'first',flora});
    if(first.error)throw Error(first.error);
    const firstMatches=matches(first,flora),inputUnchanged=JSON.stringify(flora)===original,saved=first.position.slice();
    flora.branches[1].points[1][0]+=.3;
    const second=await request(floraWorker,{key:'second',flora}),secondMatches=matches(second,flora);
    const changed=second.position.length!==saved.length||second.position.some((v,i)=>v!==saved[i]);
    const error=await request(floraWorker,{key:'bad',flora:{}});
    const recovered=await request(floraWorker,{key:'recovered',flora});
    const job={body:{id:'box',partId:'box',kind:'mesh',mask:23,maximumError:0,surface:{positions:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]]}},target:100};
    const physical=await request(collision,{id:17,jobs:[job]});
    const bad=await request(collision,{id:18,jobs:[{}]});
    const again=await request(collision,{id:19,jobs:[job]});
    return {firstMatches,secondMatches,inputUnchanged,changed,recovered:recovered.key==='recovered'&&matches(recovered,flora),first:first.key,second:second.key,positions:first.position.length,secondPositions:second.position?.length,retained:saved.every((v,i)=>v===first.position[i]),typed:first.position instanceof Float32Array,indexTyped:ArrayBuffer.isView(first.index),error:error.key==='bad'&&!!error.error,physical:physical.id===17&&physical.results?.[0]?.[0]?.surface.triangles.length===1,bad:bad.id===18&&!!bad.error,again:again.id===19&&!!again.results};
   }finally{collision.terminate();floraWorker.terminate();}
  });
  assert.equal(result.first,'first');assert.equal(result.second,'second');assert.ok(result.positions>0&&result.secondPositions>0);
  for(const key of ['firstMatches','secondMatches','inputUnchanged','changed','recovered','retained','typed','indexTyped','error','physical','bad','again'])assert.equal(result[key],true,key);
 });
 await check('rebuilt castle opens native wall, platform and room editors without changing its saved scene',async()=>{
  await page.goto(origin+'/?demo=castle-compound');await waitForSceneReady();await page.waitForFunction(()=>document.querySelector('#title')?.value==='Shirogane · Gate, Garden & Keep');
  const before=(await downloadProject()).project;assert.equal(before.parts.length,310);
  const ascent=before.parts.find(p=>p.name.startsWith('Audience approach'));assert.deepEqual(ascent.route.segments.filter(s=>s.kind==='stairs').map(s=>s.steps),[6,6]);
  for(const [name,mode] of [['Outer curtain · roofed defensive wall','route'],['03 · Keep court · courtyard','platform']]){
   await outline.getByRole('searchbox').fill(name);await outline.getByRole('button',{name,exact:true}).click();await page.locator('#selection-action').click();
   await page.locator('.editing-context[data-mode="'+mode+'"]').waitFor({state:'visible'});
   if(mode==='route')assert.equal(await page.locator('#route-rail-style').inputValue(),'japanese-roofed');
   await page.locator('[data-context-action=cancel]').click();
  }
  await outline.getByRole('searchbox').fill('Audience hall');
  await outline.getByRole('button',{name:'Audience hall · inhabited hall',exact:true}).click();await page.locator('#selection-action').click();
  await page.locator('.editing-context[data-mode="interior"]').waitFor({state:'visible'});await page.locator('[data-context-action=cancel]').click();
  await outline.getByRole('searchbox').fill('');await page.getByRole('button',{name:'Deselect',exact:true}).click();assert.deepEqual((await downloadProject()).project,before);
  await page.locator('.viewport-view-options > summary').click();await page.locator('#frame').click();await page.locator('.viewport-view-options > summary').click();await page.locator('#toast.show').waitFor({state:'hidden'});
  const box=await page.locator('#viewport > canvas').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-160);
  await page.locator('#viewport').screenshot({path:path.join(artifacts,'castle-compound.png')});
  await outline.getByRole('searchbox').fill(ascent.name);await outline.getByRole('button',{name:ascent.name,exact:true}).click();await outline.locator('[data-action=frame]').click();await page.getByRole('button',{name:'Deselect',exact:true}).click();
  await page.locator('#viewport').screenshot({path:path.join(artifacts,'castle-stair-steps.png')});
 });
 await check('Asterfall opens as an editable native scene and its presentation uses the saved project',async()=>{
  await page.goto(origin+'/?demo=asterfall',{timeout:90000});await waitForSceneReady();
  await page.waitForFunction(()=>document.querySelector('#title')?.value==='Asterfall · City of the Tide Engine',null,{timeout:90000});
  await outline.locator('.scene-count').filter({hasText:'369 parts'}).waitFor({state:'visible',timeout:90000});
  const before=(await downloadProject()).project;assert.equal(before.parts.length,369);
  for(const [name,mode] of [['North bridge · ascent beneath the wheel','route'],['Garden promenade','platform'],['Chart archive · through hall','interior']]){
   await outline.getByRole('searchbox').fill(name);await outline.getByRole('button',{name,exact:true}).click();await page.locator('#selection-action').click();
   await page.locator('.editing-context[data-mode="'+mode+'"]').waitFor({state:'visible'});await page.locator('[data-context-action=cancel]').click();
  }
  assert.deepEqual((await downloadProject()).project,before,'inspection preserves the project');
  await page.goto(origin+'/previews/asterfall-preview.html');await waitForSceneReady();await page.locator('#hint').filter({hasText:'369 editable parts'}).waitFor({state:'visible',timeout:90000});
  for(const [name,text] of [['Tide engine','68-metre'],['Harbor','Lantern Harbor'],['Gardens','Hanging Gardens'],['Market','Saffron Exchange'],['Acropolis','Observatory Acropolis'],['Skyline','City of the Tide Engine']]){
   await page.getByRole('button',{name,exact:true}).click();assert.ok((await page.locator('#caption').textContent()).includes(text));
   if(name==='Harbor')await page.screenshot({path:path.join(artifacts,'asterfall-harbor.png')});
  }
  assert.equal(await page.getByRole('link',{name:'Open in Wonderblocks ↗'}).getAttribute('href'),'../index.html?demo=asterfall');
  await page.screenshot({path:path.join(artifacts,'asterfall-skyline.png')});
 });
 await check('Cinderlock native room and route inspection preserves the three-tier scene',async()=>{
  await page.goto(origin+'/?demo=cinderlock',{timeout:90000});await waitForSceneReady();
  await page.waitForFunction(()=>document.querySelector('#title')?.value==='Cinderlock · Foundry Crossfire',null,{timeout:90000});
  const before=(await downloadProject()).project;assert.equal(before.parts.length,224);
  for(const [name,mode] of [[before.parts.find(p=>p.interior).name,'interior'],[before.parts.find(p=>p.route).name,'route']]){
   await outline.getByRole('searchbox').fill(name);await outline.getByRole('button',{name,exact:true}).click();await page.locator('#selection-action').click();
   await page.locator('.editing-context[data-mode="'+mode+'"]').waitFor({state:'visible'});await page.locator('[data-context-action=cancel]').click();
  }
  assert.deepEqual((await downloadProject()).project,before);
  await page.goto(origin+'/previews/cinderlock-preview.html');await waitForSceneReady();await page.locator('#hint').filter({hasText:'224 editable parts'}).waitFor({state:'visible',timeout:90000});
  for(const [name,text] of [['Tactical','4.8 m'],['District','terraced'],['Foundry','Eight entrances'],['Cooling','four-door'],['Freight','sunken'],['Spawn exits','three ways']]){
   await page.getByRole('button',{name,exact:true}).click();assert.ok((await page.locator('#caption').textContent()).includes(text));
   if(['Tactical','District','Foundry'].includes(name))await page.screenshot({path:path.join(artifacts,'cinderlock-'+name.toLowerCase()+'.png')});
  }
  await page.locator('#blockout').click();assert.equal(await page.locator('#blockout').getAttribute('aria-pressed'),'true');
  await page.locator('#cutaway').click();assert.equal(await page.locator('#cutaway').getAttribute('aria-pressed'),'false');
  await page.locator('#blockout').click();await page.locator('#cutaway').click();await page.getByRole('button',{name:'District',exact:true}).click();
 });
 await check('Vesper Rift opens natively and its saved city renders all six review views',async()=>{
  await page.goto(origin+'/?demo=vesper-rift',{timeout:90000});await waitForSceneReady();
  await page.waitForFunction(()=>document.querySelector('#title')?.value==='Vesper Rift · City of the Hollow Moon',null,{timeout:90000});
  const before=(await downloadProject()).project;assert.ok(before.parts.length>=300&&before.parts.length<500);
  for(const [name,mode] of [[before.parts.find(p=>p.interior).name,'interior'],[before.parts.find(p=>p.type==='stair-route').name,'route']]){
   await outline.getByRole('searchbox').fill(name);await outline.getByRole('button',{name,exact:true}).click();await page.locator('#selection-action').click();
   await page.locator('.editing-context[data-mode="'+mode+'"]').waitFor({state:'visible'});await page.locator('[data-context-action=cancel]').click();
  }
  assert.deepEqual((await downloadProject()).project,before);
  await page.goto(origin+'/previews/vesper-rift-preview.html');await waitForSceneReady();await page.locator('#hint').filter({hasText:'editable parts'}).waitFor({state:'visible',timeout:90000});
  for(const [name,text] of [['Player view','1.7 m eye height'],['Tactical','continuous cliff streets'],['Rotunda','projects from the east cliff'],['Market','carved into the canyon'],['Cascades','lower cliff dwellings'],['Street','continuous cliff avenue']]){
   await page.getByRole('button',{name,exact:true}).click();assert.ok((await page.locator('#caption').textContent()).includes(text));
   await page.screenshot({path:path.join(artifacts,'vesper-'+name.toLowerCase()+'.png')});
  }
  await page.locator('#blockout').click();assert.equal(await page.locator('#blockout').getAttribute('aria-pressed'),'true');
  await page.locator('#cutaway').click();assert.equal(await page.locator('#cutaway').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Tactical',exact:true}).click();await page.screenshot({path:path.join(artifacts,'vesper-blockout.png')});
 });
 assert.deepEqual(errors,[],'uncaught browser errors');assert.deepEqual(renderErrors,[],'WebGL shader errors');
 console.log('Browser integration passed; isolated downloads: '+artifacts);
}catch(error){
 if(page)await page.screenshot({path:path.join(artifacts,'failure.png'),fullPage:true}).catch(()=>{});
 console.error('Browser artifacts: '+artifacts);throw error;
}finally{
 await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));
}
