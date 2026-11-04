import * as T from '../../vendor/three.module.js';
import {createObjectCollision,COLLISION_RULE_VERSION,COLLISION_RULES} from './object-collision.js';
import {prepareCollisionSurface,COLLISION_CONTACT_TRIANGLES} from './collision-surface.js';

// Object-owned derived state is reusable across render rebuilds and exports.
// Geometry and semantic ownership determine the key; materials do not.
const cache=new Map(),latest=new Map(),stateKeys=new WeakMap(),maxEntries=512,maxTriangles=250000;
let worker=null,running=null,sequence=0,queue=[],cachedTriangles=0;
export const collisionServiceStats={builds:0,cacheHits:0,workerJobs:0,discardedJobs:0};
const physicalValue=value=>Array.isArray(value)?value.map(physicalValue):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).filter(k=>!['color','colors','finishes','componentFinishes','floorFinish','surface','pattern','faceFinishes'].includes(k)).sort().map(k=>[k,physicalValue(value[k])])):value;
export function collisionDefinition(part){
 const shape={};for(const key of ['type','scale','shape','parameters','interiorProp','interior','route','platform','highway','flora','metaballs','entrances','entranceInteriors'])if(part[key]!==undefined)shape[key]=part[key];
 if(part.route||part.platform||part.highway){shape.position=part.position;shape.rotation=part.rotation;}
 return JSON.stringify(physicalValue(shape));
}
function signature(part,group){
 let a=2166136261,b=0x9e3779b9;
 const hash=value=>{const n=Number.isFinite(value)?Math.round(value*1e6):0;a=Math.imul(a^n,16777619)>>>0;b=Math.imul(b^(n+(n>>>16)),2246822519)>>>0;};
 const text=s=>{for(let i=0;i<s.length;i++)hash(s.charCodeAt(i));};
 // Semantic boundaries affect collision, while paint, texture scale and plant
 // colours do not. Use the same physical definition as prepared export checks.
 text(part.type);text(JSON.stringify([part.scale,!!part.interiorProp]));
 text(JSON.stringify(physicalValue(part.route??part.platform??null)));
 group.updateMatrixWorld(true);
 const inverse=new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.scale)).invert();
 group.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.floraBillboard||mesh.userData.floraComponent&&mesh.userData.floraComponent!=='bark')return;
  text(JSON.stringify([!!mesh.userData.assemblySolid,mesh.userData.routeSegment,mesh.userData.highwayPath,mesh.userData.highwaySections,mesh.userData.interiorStair,mesh.userData.hallway,mesh.userData.railing,mesh.userData.routePost,mesh.userData.highwayRailing,mesh.userData.interiorFloor,mesh.userData.interiorCeiling,mesh.userData.connectedInteriorId,mesh.userData.floraComponent]));
  const role=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material)?.userData.interiorRole;text(role??'');
  for(const n of inverse.clone().multiply(mesh.matrixWorld).elements)hash(n);
  const positions=mesh.geometry.attributes.position?.array,index=mesh.geometry.index?.array;
  hash(positions?.length??0);if(positions)for(const n of positions)hash(n);
  hash(index?.length??0);if(index)for(const n of index)hash(n);
  if(mesh.userData.structuralVolume)text(JSON.stringify(mesh.userData.structuralVolume));
 });
 // Upright native supports and ordinary rail heights are world anchored.
 if(part.route||part.platform||part.highway)text(JSON.stringify([part.position,part.rotation]));
 return part.id+':'+COLLISION_RULE_VERSION+':'+a.toString(16)+':'+b.toString(16);
}
function count(state){return state.bodies.reduce((n,b)=>n+(b.surface?.triangles.length??0),0);}
function trim(){while(cache.size>maxEntries||cachedTriangles>maxTriangles&&cache.size>1){const [key,state]=cache.entries().next().value;cache.delete(key);cachedTriangles-=count(state);}}
function settle(state,results){
 let i=0;state.bodies=state.bodies.flatMap(body=>body.surface&&body.surface.triangles.length>COLLISION_CONTACT_TRIANGLES?results[i++]:[body]);
 state.status='ready';state.stats.triangles=count(state);state.stats.contactPartitions=state.bodies.filter(b=>b.contactPartition).length;state._resolve(state);delete state._resolve;
 cachedTriangles=[...cache.values()].reduce((n,s)=>n+count(s),0);trim();
}
function calculate(job){return job.jobs.map(j=>prepareCollisionSurface(j.body,{target:j.target}));}
function prepareSynchronously(state){
 for(const job of queue)if(job.state===state)job.canceled=true;queue=queue.filter(job=>job.state!==state);if(running?.state===state)running.canceled=true;
 state.bodies=state.bodies.flatMap(body=>body.surface?prepareCollisionSurface(body,{target:COLLISION_RULES.meshTarget}):[body]);state.status='ready';state.stats.triangles=count(state);state._resolve?.(state);delete state._resolve;
 cachedTriangles=[...cache.values()].reduce((n,s)=>n+count(s),0);trim();
}
function schedule(state,key,required=false){const bodies=state.bodies.filter(b=>b.surface&&b.surface.triangles.length>COLLISION_CONTACT_TRIANGLES);if(!bodies.length){state.status='ready';return;}state.status='updating';Object.defineProperty(state,'whenReady',{value:new Promise(resolve=>Object.defineProperty(state,'_resolve',{value:resolve,configurable:true})),enumerable:false,configurable:true});queue.push({id:++sequence,key,state,required,jobs:bodies.map(b=>({body:b,target:COLLISION_RULES.meshTarget}))});queueMicrotask(next);}
function next(){
 if(running)return;
 while(queue.length){const job=queue.shift();if(!job.required&&latest.get(job.state.partId)!==job.key){collisionServiceStats.discardedJobs++;job.state.status='unprepared';job.state._resolve(job.state);delete job.state._resolve;continue;}
  if(typeof Worker==='undefined'){settle(job.state,calculate(job));continue;}
  if(!worker){try{worker=new Worker(new URL('./collision-worker.js',import.meta.url),{type:'module'});}catch{settle(job.state,calculate(job));continue;}
   worker.onmessage=({data})=>{const job=running;if(!job||job.id!==data.id)return;running=null;if(!job.canceled)settle(job.state,data.error?calculate(job):data.results);next();};
   worker.onerror=()=>{const job=running;worker.terminate();worker=null;running=null;if(job&&!job.canceled)settle(job.state,calculate(job));next();};
  }
  running=job;collisionServiceStats.workerJobs++;worker.postMessage({id:job.id,jobs:job.jobs});return;
 }
}
export function attachObjectCollision(part,group,{parts=[],asynchronous=typeof Worker!=='undefined'}={}){
 const key=signature(part,group);latest.set(part.id,key);
 if(cache.has(key)){const state=cache.get(key);cache.delete(key);cache.set(key,state);state.definition=collisionDefinition(part);group.userData.collision=state;if(!asynchronous&&state.status!=='ready')prepareSynchronously(state);else if(state.status==='unprepared')schedule(state,key);collisionServiceStats.cacheHits++;return state;}
 collisionServiceStats.builds++;
 const state=createObjectCollision(part,group,{parts,simplify:!asynchronous});stateKeys.set(state,key);state.definition=collisionDefinition(part);group.userData.collision=state;cache.set(key,state);cachedTriangles+=count(state);
 if(asynchronous)schedule(state,key);
 trim();return state;
}
export async function readyObjectCollisions(roots,{signal}={}){
 const states=roots.map(root=>root.userData.collision).filter(Boolean);
 if(signal?.aborted)throw new DOMException('Canceled.','AbortError');
 for(const state of states){if(state.status==='unprepared')schedule(state,stateKeys.get(state),true);for(const job of queue)if(job.state===state)job.required=true;if(running?.state===state)running.required=true;}
 let abort;
 try{await Promise.race([Promise.all(states.map(state=>state.whenReady)),...(signal?[new Promise((_,reject)=>{abort=()=>reject(new DOMException('Canceled.','AbortError'));signal.addEventListener('abort',abort,{once:true});})]:[])]);}finally{if(abort)signal.removeEventListener('abort',abort);}
 if(signal?.aborted)throw new DOMException('Canceled.','AbortError');
 return new Map(states.map(state=>[state.partId,state]));
}
export function collisionCacheStats(){return {...collisionServiceStats,entries:cache.size,triangles:cachedTriangles,queued:queue.length,running:!!running};}
