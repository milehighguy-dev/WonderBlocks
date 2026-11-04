import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,stat,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {_electron} from 'playwright';
import JSZip from 'jszip';
const root=fileURLToPath(new URL('../../',import.meta.url)),argument=process.argv.slice(2).find(a=>a!=='--'),requested=argument?path.resolve(argument):undefined;let executable=requested;
// Windows runners may expose TEMP through an 8.3 name; match the folder service's canonical paths.
const artifacts=await realpath(await mkdtemp(path.join(tmpdir(),'wb-desktop-'))),profile=path.join(artifacts,'profile'),world=path.join(artifacts,'WON'),downloads=path.join(artifacts,'downloads');
if(requested?.endsWith('.zip')){
 const folder=path.join(artifacts,'extracted'),archive=await JSZip.loadAsync(await readFile(requested));await mkdir(folder);
 for(const entry of Object.values(archive.files)){const target=path.resolve(folder,entry.name);if(!target.startsWith(folder+path.sep))throw Error('Archive path leaves application folder.');if(entry.dir)await mkdir(target,{recursive:true});else{await mkdir(path.dirname(target),{recursive:true});await writeFile(target,await entry.async('nodebuffer'));}}
 executable=path.join(folder,'Wonderblocks.exe');
}
for(const name of ['msh','odf','world1'])await mkdir(path.join(world,name),{recursive:true});await mkdir(downloads);
await writeFile(path.join(world,'world1/WON.wld'),'// existing authored world\n');
await writeFile(path.join(world,'world1/WON.ldx'),'Version(1);\nNextID(1);\nLayer("[Base]",0,0) { Description(""); }\nGameMode("Common") { Layer(0); }\n');
await writeFile(path.join(world,'world1/WON.req'),'ucft { REQN { "world" "WON" } }');
const reserve=net.createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
const errors=[];let application,page,folderId;const processErrors=[];
async function launch(){
 application=await _electron.launch({...(executable?{executablePath:executable}:{}),args:[...(executable?[]:[root]),'--use-angle=swiftshader','--enable-unsafe-swiftshader'],env:{...process.env,NODE_PATH:'',PATH:process.platform==='win32'?process.env.SystemRoot+'\\System32;'+process.env.SystemRoot:process.env.PATH,WONDERBLOCKS_SMOKE_TEST:'1',WONDERBLOCKS_TEST_DATA:profile,WONDERBLOCKS_TEST_PORT:String(port)},timeout:90000});
 application.process().stderr.on('data',data=>{const text=data.toString();if(/Uncaught Exception|ReferenceError|TypeError/.test(text))processErrors.push(text);});page=await application.firstWindow();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await page.waitForFunction(()=>!document.getElementById('scene-loading')?.open&&document.querySelector('#parts button'),null,{timeout:90000});
 await application.evaluate(({dialog,session},{world,downloads})=>{
  dialog.showOpenDialog=async()=>({canceled:false,filePaths:[world]});
  globalThis.desktopDownloads=[];session.defaultSession.on('will-download',(_event,item)=>{const file=downloads+'/'+item.getFilename().replace(/^.*[\\/]/,'');item.setSavePath(file);item.once('done',(_event,state)=>globalThis.desktopDownloads.push({file,state}));});
 },{world,downloads});
}
async function api(body){return page.evaluate(async body=>{const response=await fetch('/api/world-folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};},body);}
try{
 await launch();
 const info=await application.evaluate(({app,BrowserWindow})=>({packaged:app.isPackaged,path:app.getAppPath(),data:app.getPath('userData'),node:process.versions.node,preferences:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()}));
 if(executable)assert.equal(info.packaged,true);assert.equal(info.data,profile);assert.ok(info.node);assert.equal(info.preferences.nodeIntegration,false);assert.equal(info.preferences.contextIsolation,true);assert.equal(info.preferences.sandbox,true);
 const library=await page.evaluate(async()=>{const r=await fetch('/api/material-library');if(!r.ok)throw Error(await r.text());return r.json();});
 assert.ok(library.surfaces.length>20,'packaged sharp and source textures must load');assert.ok(library.categories.length>3);
 const defaults=await page.evaluate(async()=>{const {defaultRoute}=await import('/src/routes/stair-route.js'),{EXAMPLE_SCENES}=await import('/src/editor/example-scenes.js');return {width:defaultRoute().width,examples:EXAMPLE_SCENES.map(s=>s.id)};});assert.equal(defaults.width,3.75);assert.ok(!defaults.examples.includes('wroshyr'));
 await page.evaluate(()=>localStorage.setItem('desktop-relaunch-check','retained'));
 const chosen=await api({action:'choose'});assert.equal(chosen.status,200);folderId=chosen.data.id;
 assert.equal((await api({action:'write',id:folderId,path:'odf/desktop-check.odf',base64:Buffer.from('[GameObjectClass]\nClassLabel = "prop"\n').toString('base64')})).status,200);
 assert.ok((await readFile(path.join(world,'odf/desktop-check.odf'),'utf8')).includes('prop'));
 assert.equal((await api({action:'write',id:folderId,path:'world1/WON.wld',base64:''})).status,400);
 const project=await page.evaluate(async()=>{const {makePart}=await import('/src/core/model.js');return {format:'open-building-studio',version:1,name:'Desktop smoke test',parts:[makePart('block',{name:'Packaged block'})]};});
 await page.locator('#file').setInputFiles({name:'desktop.building.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForFunction(()=>document.querySelector('#title')?.value==='Desktop smoke test');
 await page.locator('#save').click();let download;for(let i=0;i<100;i++){download=await application.evaluate(()=>globalThis.desktopDownloads[0]);if(download)break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(download?.state,'completed','project download must complete through Electron');
 const saved=JSON.parse(await readFile(download.file,'utf8'));assert.equal((saved.project||saved).name,'Desktop smoke test');
 await page.locator('#export-swbf2').click();const exporter=page.getByRole('dialog',{name:'Export to SWBF2',exact:true});await exporter.waitFor({state:'visible'});
 const exportButton=exporter.locator('[data-action=export]');await exportButton.waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('.swbf2-export [data-action=export]').disabled);await exportButton.click();
 let archive;for(let i=0;i<200;i++){archive=await application.evaluate(()=>globalThis.desktopDownloads.find(d=>d.file.endsWith('.zip')));if(archive)break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(archive?.state,'completed');
 const zip=await JSZip.loadAsync(await readFile(archive.file));assert.ok(Object.keys(zip.files).some(n=>n.endsWith('.msh')));assert.ok(Object.keys(zip.files).some(n=>n.endsWith('.odf')));
 await exporter.getByRole('checkbox',{name:'Generate AI planning and barriers',exact:true}).uncheck();await exporter.locator('[name=destination]').selectOption('folder');await exporter.locator('[data-choose-world-folder]').click();
 await page.waitForFunction(()=>!document.querySelector('.swbf2-export [data-action=export]').disabled);await exportButton.click();
 await exporter.locator('[role=status]').filter({hasText:'Saved to WON'}).waitFor();const output=await api({action:'list',id:folderId,path:'msh'});assert.ok(output.data.some(f=>f.name.endsWith('.msh')),'native folder export must write actual meshes');

 await page.screenshot({path:path.join(artifacts,'packaged-export.png')});await page.keyboard.press('Escape');
 if(executable){await assert.rejects(stat(path.join(info.path,'assets/character')),{code:'ENOENT'});}
 await application.close();application=null;
 await launch();assert.equal(await page.evaluate(()=>localStorage.getItem('desktop-relaunch-check')),'retained');
 assert.equal((await api({action:'restore',id:folderId})).data.path,world);assert.equal(await readFile(path.join(world,'world1/WON.wld'),'utf8'),'// existing authored world\n');
 assert.deepEqual(errors,[]);assert.deepEqual(processErrors,[]);console.log('PASS desktop: packaged runtime, textures, folder export, project and SWBF2 downloads, direct scene export, persistent data, and sandbox. Artifacts: '+artifacts);
}catch(error){await page?.screenshot({path:path.join(artifacts,'failure.png')}).catch(()=>{});console.error('Desktop test artifacts: '+artifacts);throw error;}finally{await application?.close();}
