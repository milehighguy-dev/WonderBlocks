async function request(body){
 const response=await fetch('/api/world-folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();
 if(!response.ok){const error=Error(data.error||'World folder access failed.');error.name=data.code==='ENOENT'?'NotFoundError':'Error';error.status=response.status;throw error;}return data;
}
const decode=base64=>Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
function encode(data){let result='';for(let at=0;at<data.length;at+=32768)result+=String.fromCharCode(...data.subarray(at,at+32768));return btoa(result);}
class LocalDirectory{
 constructor(folder,path=''){this.folder=folder;this.path=path;this.id=folder.id;this.name=path.split('/').at(-1)||folder.name;this.kind='directory';}
 call(action,path=this.path,extra={}){return request({action,id:this.id,path,...extra});}
 async getDirectoryHandle(name,{create=false}={}){const child=this.path?this.path+'/'+name:name;if(create)await this.call('mkdir',child);else{const stat=await this.call('stat',child);if(stat.kind!=='directory')throw Error('Expected a directory.');}return new LocalDirectory(this.folder,child);}
 fileHandle(name,cached=null,create=false){
  const path=this.path?this.path+'/'+name:name;
  return {name,kind:'file',getFile:async()=>{let data=cached;cached=null;if(!data)try{data=decode((await this.call('read',path)).base64);}catch(error){if(!create||error.name!=='NotFoundError')throw error;await this.call('touch',path);data=new Uint8Array();}return {name,size:data.length,text:async()=>new TextDecoder().decode(data),arrayBuffer:async()=>data.buffer};},createWritable:async()=>{let data;return {write:async value=>{data=typeof value==='string'?new TextEncoder().encode(value):value instanceof ArrayBuffer?new Uint8Array(value):value;},close:async()=>{if(data)await this.call('write',path,{base64:encode(data)});},abort:async()=>{data=null;}};}};
 }
 async getFileHandle(name,{create=false}={}){
  // Most calls immediately read or replace the file. Avoid a separate existence
  // round trip and defer empty-file creation until a write actually commits.
  const path=this.path?this.path+'/'+name:name,data=create?null:decode((await this.call('read',path)).base64);return this.fileHandle(name,data,create);
 }
 async *values(){for(const entry of await this.call('list'))yield entry.kind==='directory'?new LocalDirectory(this.folder,this.path?this.path+'/'+entry.name:entry.name):this.fileHandle(entry.name);}
 async removeEntry(name){await this.call('remove',this.path?this.path+'/'+name:name);}
 async queryPermission(){return 'granted';}
 async requestPermission(){return 'granted';}
 async open(){await this.call('open');}
}
export async function chooseLocalWorldFolder(id){const folder=await request({action:'choose',id});return folder?new LocalDirectory(folder):null;}
export async function restoreLocalWorldFolder(id){return new LocalDirectory(await request({action:'restore',id}));}
