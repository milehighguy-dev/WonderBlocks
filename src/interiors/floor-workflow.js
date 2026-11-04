import {levelsOf,plainLevel} from './interior-storeys.js';
import {validateInterior,roomWallHeight,roomCeilingHeight} from './interior.js';
import {pointsOf,polygonRoom,shellInner,containsPolygon} from './polygon-plan.js';

export function addWorkflowFloor(plan,sourceId='ground',duplicate=false){
 const next=structuredClone(plan),levels=levelsOf(next),source=levels.find(l=>l.id===sourceId);
 if(!source)throw Error('Select an interior floor first.');
 const top=levels.at(-1),copy=plainLevel(source.plan);
 if(!duplicate){const points=source.plan.rooms.flatMap(pointsOf),xs=points.map(p=>p.x),zs=points.map(p=>p.z);const outer=source.plan.rooms.find(r=>source.plan.rooms.every(o=>containsPolygon(pointsOf(r),pointsOf(o))));
 copy.rooms=[outer?structuredClone(outer):{id:crypto.randomUUID(),x:Math.min(...xs),z:Math.min(...zs),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...zs)-Math.min(...zs)}];
 if(next.shell?.points)copy.rooms=[polygonRoom(crypto.randomUUID(),shellInner(next.shell))];
 copy.rooms.forEach(r=>{delete r.wallHeight;delete r.ceilingHeight;});copy.doors=[];copy.partitions=[];
 }
 if(duplicate)for(const door of copy.doors)delete door.entranceId;
 const elevation=top.elevation+Math.max(top.plan.height,...top.plan.rooms.map(r=>Math.max(roomWallHeight(top.plan,r),roomCeilingHeight(top.plan,r))))+copy.slab;
 const floor={id:crypto.randomUUID(),name:'Floor '+(levels.length+1),elevation:Math.round(elevation*1000)/1000,plan:copy};
 (next.storeys??=[]).push(floor);
 if(next.shell)next.shell.height=Math.max(next.shell.height,floor.elevation+Math.max(copy.height,...copy.rooms.map(r=>Math.max(roomWallHeight(copy,r),roomCeilingHeight(copy,r))))+2*next.slab);
 validateInterior(next);return {plan:next,levelId:floor.id};
}
export function editWorkflowFloor(plan,id,{elevation,height}){
 const next=structuredClone(plan),floor=id==='ground'?{plan:next}:next.storeys?.find(l=>l.id===id);
 if(!floor)throw Error('Select an interior floor first.');
 if(elevation!==undefined){if(id==='ground'&&elevation!==0)throw Error('Move the building to change ground-floor elevation.');if(id!=='ground')floor.elevation=elevation;}
 if(height!==undefined){floor.plan.height=height;for(const room of floor.plan.rooms){delete room.wallHeight;delete room.ceilingHeight;}for(const wall of floor.plan.partitions||[])delete wall.height;}
 validateInterior(next);return next;
}
export function createFloorSelection(){const remembered=new Map();return {read(part,space,plan){const key=part+' / '+space;const old=remembered.get(key)||{levelId:'ground',peek:false};const ids=['ground',...(plan.storeys||[]).map(l=>l.id),...(plan.shell?['roof']:[]),'all'];const value={...old,levelId:ids.includes(old.levelId)?old.levelId:'ground',spaceId:space};remembered.set(key,value);return value;},set(part,space,value){remembered.set(part+' / '+space,{...value,spaceId:space});}};}

export function removeWorkflowFloor(plan,id){
 if(id==='ground')throw Error('The ground floor cannot be removed.');const next=structuredClone(plan);if(!next.storeys?.some(l=>l.id===id))throw Error('Select an interior floor first.');next.storeys=next.storeys.filter(l=>l.id!==id);next.stairs=(next.stairs||[]).filter(s=>s.from!==id&&s.to!==id);validateInterior(next);return next;
}
