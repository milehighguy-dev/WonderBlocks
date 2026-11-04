const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{randomUUID}=require('node:crypto');
function nativePicker(initial=''){
 if(process.platform!=='win32')return Promise.reject(Object.assign(Error('Native folder picker is unavailable.'),{status:501}));
 const script=`[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)\nAdd-Type -AssemblyName System.Windows.Forms\n[Windows.Forms.Application]::EnableVisualStyles()\n$d=New-Object System.Windows.Forms.FolderBrowserDialog\nif($d.PSObject.Properties['AutoUpgradeEnabled']){$d.AutoUpgradeEnabled=$true}\nif($d.PSObject.Properties['UseDescriptionForTitle']){$d.UseDescriptionForTitle=$true}\n$d.Description='Choose the Mod Tools world folder containing msh, odf and world1'\n$d.ShowNewFolderButton=$false\n$d.SelectedPath=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(initial).toString('base64')}'))\nif($d.ShowDialog() -eq [Windows.Forms.DialogResult]::OK){[Console]::Write($d.SelectedPath)}\n$d.Dispose()`;
 const run=command=>new Promise((resolve,reject)=>{const child=spawn(command,['-NoProfile','-STA','-WindowStyle','Hidden','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true}),out=[],errors=[];child.stdout.on('data',chunk=>out.push(chunk));child.stderr.on('data',chunk=>errors.push(chunk));child.once('error',reject);child.once('close',code=>code?reject(Error(Buffer.concat(errors).toString()||'Could not choose folder.')):resolve(Buffer.concat(out).toString().trim()||null));});
 const bundled=path.resolve(path.dirname(process.execPath),'..','..','native','powershell','pwsh.exe');
 return fs.access(bundled).then(()=>run(bundled),()=>run('pwsh.exe')).catch(error=>error.code==='ENOENT'?run('powershell.exe'):Promise.reject(error));
}
const inside=(root,target)=>{if(process.platform==='win32'){root=root.toLowerCase();target=target.toLowerCase();}return target===root||target.startsWith(root+path.sep);};
function createWorldFolders({registryPath,choose=nativePicker,open}={}){
 let folders,choosing=false,saveQueue=Promise.resolve();
 async function registry(){if(!folders){try{folders=JSON.parse(await fs.readFile(registryPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;folders={};}}return folders;}
 const persist=()=>{saveQueue=saveQueue.catch(()=>{}).then(async()=>{await fs.writeFile(registryPath+'.tmp',JSON.stringify(folders,null,2));await fs.rename(registryPath+'.tmp',registryPath);});return saveQueue;};
 async function rootFor(id){const root=(await registry())[id];if(!root)throw Object.assign(Error('Choose the world folder again.'),{status:404});const real=await fs.realpath(root);if(real!==root||!(await fs.stat(root)).isDirectory())throw Error('The remembered world folder has moved. Choose it again.');return root;}
 async function locate(root,relative='',{write=false}={}){
  if(typeof relative!=='string'||relative.length>1000||relative.split('/').some(part=>part&&!/^[a-z0-9_][a-z0-9_. -]{0,159}$/i.test(part)||part==='.'||part==='..'||/[. ]$/.test(part)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))throw Error('Invalid world folder path.');
  if(write&&!/^(msh|odf|world1|_wonderblocks)(\/|$)/i.test(relative))throw Error('Writes are limited to the selected world source folders.');
  if(write&&/\.wld$/i.test(relative))throw Error('The base world is read only.');
  const target=path.resolve(root,...relative.split('/'));if(!inside(root,target))throw Error('Path leaves the selected world folder.');
  let probe=target;for(;;){try{if(!inside(root,await fs.realpath(probe)))throw Error('A linked folder leaves the selected world.');break;}catch(error){if(error.code!=='ENOENT')throw error;const parent=path.dirname(probe);if(parent===probe)throw error;probe=parent;}}
  return target;
 }
 return {async handle(body){
  if(body.action==='choose'){
   if(choosing)throw Object.assign(Error('A folder picker is already open.'),{status:409});choosing=true;
   try{const previous=body.id?await rootFor(body.id).catch(()=>''):'',picked=await choose(previous);if(!picked)return null;const root=await fs.realpath(picked);const directories=await fs.readdir(root,{withFileTypes:true}),world=['msh','odf','world1'].every(name=>directories.some(entry=>entry.name.toLowerCase()===name&&entry.isDirectory()));if(!world&&!directories.some(entry=>entry.isFile()&&/\.pln$/i.test(entry.name)))throw Error('Choose the world folder containing msh, odf and world1, or its planning source folder.');const entries=await registry(),existing=Object.keys(entries).find(id=>entries[id].toLowerCase()===root.toLowerCase()),id=existing??randomUUID();entries[id]=root;await persist();return {id,name:path.basename(root),path:root};}finally{choosing=false;}
  }
  const root=await rootFor(body.id);
  if(body.action==='restore')return {id:body.id,name:path.basename(root),path:root};
  if(body.action==='open'){await open(root);return {opened:true};}
  const target=await locate(root,body.path??'',{write:['mkdir','touch','write','remove'].includes(body.action)});
  switch(body.action){
   case 'stat':{const stat=await fs.stat(target);return {kind:stat.isDirectory()?'directory':'file',size:stat.size};}
   case 'list':return (await fs.readdir(target,{withFileTypes:true})).map(entry=>({name:entry.name,kind:entry.isDirectory()?'directory':'file'}));
   case 'read':{const stat=await fs.stat(target);if(stat.size>128*1024*1024)throw Error('World source file exceeds 128 MB.');return {base64:(await fs.readFile(target)).toString('base64')};}
   case 'mkdir':await fs.mkdir(target,{recursive:true});return {};
   case 'touch':{const file=await fs.open(target,'a');await file.close();return {};}
   case 'write':{
    if(typeof body.base64!=='string'||body.base64.length>180*1024*1024||!/^[a-z0-9+/]*={0,2}$/i.test(body.base64))throw Error('Invalid world source data.');
    const temporary=target+'.wbwriting-'+randomUUID();try{await fs.writeFile(temporary,Buffer.from(body.base64,'base64'));await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true});}return {};
   }
   case 'remove':await fs.unlink(target);return {};
   default:throw Error('Unknown world folder action.');
  }
 }};
}
module.exports={createWorldFolders};
