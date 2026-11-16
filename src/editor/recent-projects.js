// File handles stay in IndexedDB, which can retain browser-granted access.
// Browsers without file handles reopen an explicitly labelled saved copy.
export function createRecentProjectStore(database=globalThis.indexedDB){
 let memory=[],connection;
 const open=()=>connection??=new Promise((resolve,reject)=>{if(!database)return reject(Error('Project history storage unavailable.'));const request=database.open('wonderblocks-project-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('recent');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 async function run(mode,operation){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('recent',mode),request=operation(tx.objectStore('recent'));tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error||request.error);});}
 return {
  async list(){try{return memory=(await run('readonly',s=>s.get('projects')))||[];}catch{return memory;}},
  async write(entries){memory=entries;try{await run('readwrite',s=>s.put(entries,'projects'));}catch{try{const snapshots=entries.map(({handle,...e})=>({...e,source:'snapshot'}));await run('readwrite',s=>s.put(snapshots,'projects'));}catch{}}}
 };
}
