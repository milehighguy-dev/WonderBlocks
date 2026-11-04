import {interiorWalls} from './interior.js';
import * as T from '../../vendor/three.module.js';
import {partMatrix} from './entrances.js';
import {levelsOf,stairConnection,roofLevel} from './interior-storeys.js';
import {defaultRoute,routeLayout,validateRoute} from '../routes/stair-route.js';
import {inside,pointsOf,wallBasis,wallPoint} from './polygon-plan.js';
export function interiorRouteSeed(part,fromId,point,existing){
 const levels=levelsOf(part.interior),index=levels.findIndex(l=>l.id===fromId),from=levels[index],to=levels[index+1]||roofLevel(part.interior);if(!from||!to)throw Error('Add a floor above this level first.');
 let start={x:point.x,z:point.z},wallYaw=0;if(!existing){let nearest;for(const w of interiorWalls(from.plan)){const b=wallBasis(w),a=wallPoint(w,w.start),along=(point.x-a.x)*b.tx+(point.z-a.z)*b.tz,distance=(point.x-a.x)*b.nx+(point.z-a.z)*b.nz;if(along<0||along>w.end-w.start||Math.abs(distance)>1.1)continue;if(!nearest||Math.abs(distance)<Math.abs(nearest.distance))nearest={b,a,distance};}if(nearest){const {b,a,distance}=nearest,sign=distance<0?-1:1,target=sign*(defaultRoute({width:1.5}).width/2+from.plan.thickness/2+.1);start={x:point.x+b.nx*(target-distance),z:point.z+b.nz*(target-distance)};wallYaw=Math.atan2(b.tx,b.tz);}}const s=existing,route=s?stairConnection(part.interior,s).route:defaultRoute({width:1.5}),yaw=s?stairConnection(part.interior,s).yaw:wallYaw,local=new T.Vector3(s?.x??start.x,from.elevation+(part.interior.shell?part.interior.slab:0),s?.z??start.z),matrix=partMatrix(part),position=local.applyMatrix4(matrix);
 return {id:crypto.randomUUID(),type:'stair-route',name:'Interior stairs',position:position.toArray(),rotation:[0,part.rotation[1]+yaw,0],scale:[...part.scale],color:part.interior.finishes.floor.color,surface:{preset:part.interior.finishes.floor.preset,scale:part.interior.finishes.floor.scale},route};
}
export function interiorRouteStair(part,fromId,routePart,id=crypto.randomUUID()){
 const levels=levelsOf(part.interior),index=levels.findIndex(l=>l.id===fromId),from=levels[index],to=levels[index+1]||roofLevel(part.interior);if(!from||!to)throw Error('Choose a floor with another floor above it.');const local=new T.Vector3(...routePart.position).applyMatrix4(partMatrix(part).invert());validateRoute(routePart.route);
 return {id,from:from.id,to:to.id,x:local.x,z:local.z,width:routePart.route.width,run:routePart.route.segments[0].run,direction:'south',...(part.interior.stairs?.find(s=>s.id===id)?.roofGuards===false?{roofGuards:false}:{}),...(part.interior.stairs?.find(s=>s.id===id)?.opening?{opening:structuredClone(part.interior.stairs.find(s=>s.id===id).opening)}:{}),angle:routePart.rotation[1]-part.rotation[1],route:structuredClone(routePart.route)};
}
// The floor is a mathematical target: it stays available while its mesh is ghosted or cut.
export function snapInteriorRouteFloor(part,fromId,routePart,index,values,{tolerance=.35}={}){
 const levels=levelsOf(part.interior),from=levels.find(l=>l.id===fromId),to=levels[levels.indexOf(from)+1]||roofLevel(part.interior);if(!from||!to)return null;const route=structuredClone(routePart.route);Object.assign(route.segments[index],values);const entry=routeLayout(route)[index],matrix=partMatrix(routePart),localEnd=new T.Vector3(...entry.end).applyMatrix4(matrix).applyMatrix4(partMatrix(part).invert()),floor=to.elevation+(part.interior.shell?part.interior.slab:0),scale=routePart.scale[1]/part.scale[1];if(Math.abs(localEnd.y-floor)>tolerance||route.segments[index].kind==='landing')return null;
 const width=entry.width/2,angle=routePart.rotation[1]-part.rotation[1]+entry.endHeading;for(const side of [-1,0,1])if(!to.plan.rooms.some(r=>inside({x:localEnd.x+Math.cos(angle)*width*side,z:localEnd.z-Math.sin(angle)*width*side},pointsOf(r))))return null;
 const rise=values.rise+(floor-localEnd.y)/scale;if(rise<-10||rise>10)return null;const world=new T.Vector3(localEnd.x,floor,localEnd.z).applyMatrix4(partMatrix(part));return {...values,rise,surfaceSnap:to.name,surfacePoint:world.toArray(),locked:false};
}
