import {prepareCollisionSurface} from './collision-surface.js';
self.onmessage=({data})=>{
 try{const results=data.jobs.map(job=>prepareCollisionSurface(job.body,{target:job.target}));self.postMessage({id:data.id,results});}
 catch(error){self.postMessage({id:data.id,error:error.message});}
};
