import {mkdir,writeFile,readFile,stat,readdir,rm} from 'node:fs/promises';
import path from 'node:path';

export class Directory{
 constructor(folder,fail={}){this.folder=folder;this.name=path.basename(folder);this.kind='directory';this.fail=fail;}
 async getDirectoryHandle(name,{create=false}={}){const target=path.join(this.folder,name);try{if(create)await mkdir(target,{recursive:true});if(!(await stat(target)).isDirectory())throw Error('Not a directory');return new Directory(target,this.fail);}catch(error){if(error.code==='ENOENT')throw new DOMException('Missing','NotFoundError');throw error;}}
 async getFileHandle(name,{create=false}={}){const target=path.join(this.folder,name);try{if(create)await writeFile(target,'',{flag:'a'});await stat(target);}catch(error){if(error.code==='ENOENT')throw new DOMException('Missing','NotFoundError');throw error;}const fail=this.fail;return {kind:'file',name,getFile:async()=>{const data=await readFile(target);return {name,size:data.length,text:async()=>data.toString(),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};},createWritable:async()=>({write:async data=>{if(fail.path&&target.endsWith(fail.path)){fail.path=null;throw Error('Disk write failed');}await writeFile(target,data);},close:async()=>{},abort:async()=>{}})};}
 async *values(){for(const entry of await readdir(this.folder,{withFileTypes:true}))yield entry.isDirectory()?await this.getDirectoryHandle(entry.name):await this.getFileHandle(entry.name);}
 async removeEntry(name){await rm(path.join(this.folder,name));}
}
