const {app,BrowserWindow,dialog,Menu,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {createServer}=require('../server.cjs');
const {prepareTextureLibrary}=require('./user-data.cjs');

app.setName('Wonderblocks');
const testing=process.env.WONDERBLOCKS_SMOKE_TEST==='1';
if(testing){
 if(!process.env.WONDERBLOCKS_TEST_DATA)throw Error('The desktop test needs an isolated data folder.');
 fs.mkdirSync(process.env.WONDERBLOCKS_TEST_DATA,{recursive:true});
 app.setPath('userData',process.env.WONDERBLOCKS_TEST_DATA);
}
let window,server,origin;
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.on('window-all-closed',()=>app.quit());
 app.on('will-quit',()=>{server?.closeAllConnections();server?.close();});
 app.whenReady().then(start).catch(error=>{
  const message=error.code==='EADDRINUSE'?'Wonderblocks cannot start because its local port (4179) is already in use. Close the other copy and try again.':error.message;
  fs.appendFileSync(path.join(app.getPath('userData'),'startup.log'),new Date().toISOString()+' '+error.stack+'\n');
  dialog.showErrorBox('Could not start Wonderblocks',message);app.exit(1);
 });
}

async function start(){
 app.setAppUserModelId('org.wonderblocks.studio');Menu.setApplicationMenu(null);
 const data=app.getPath('userData');await fs.promises.mkdir(data,{recursive:true});
 const defaults=app.isPackaged?path.join(process.resourcesPath,'textures'):path.join(__dirname,'../textures');
 const textures=await prepareTextureLibrary(defaults,data);
 const openFolder=async folder=>{const error=await shell.openPath(folder);if(error)throw Error(error);};
 server=createServer({textureRoot:textures,folderRegistry:path.join(data,'world-folders.json'),openTexturesFolder:openFolder,openExportFolder:openFolder,
  chooseExportFolder:async initial=>{const result=await dialog.showOpenDialog(window,{title:'Choose the Mod Tools world folder',defaultPath:initial||undefined,properties:['openDirectory']});return result.canceled?null:result.filePaths[0];}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(testing?Number(process.env.WONDERBLOCKS_TEST_PORT||0):4179,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+server.address().port;
 window=new BrowserWindow({title:'Wonderblocks',width:1440,height:1000,minWidth:960,minHeight:650,show:false,backgroundColor:'#232426',icon:path.join(__dirname,'icon.png'),
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 window.once('ready-to-show',()=>window.show());
 window.on('closed',()=>{window=null;});
 const session=window.webContents.session;
 session.setPermissionRequestHandler((_contents,_permission,answer)=>answer(false));
 session.setPermissionCheckHandler(()=>false);
 session.on('will-download',(_event,item)=>item.setSaveDialogOptions({defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))}));
 const local=url=>{try{return new URL(url).origin===origin;}catch{return false;}};
 window.webContents.on('will-navigate',(event,url)=>{if(!local(url))event.preventDefault();});
 window.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url);return {action:'deny'};});
 await window.loadURL(origin);
}
