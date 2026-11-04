import {DEFAULT_ROUTE_WIDTH} from '../routes/route-defaults.js';
import {DEFAULT_DOOR_WIDTH,DEFAULT_DOOR_HEIGHT} from './interior-defaults.js';
import {validateInterior,roomWallHeight,roomCeilingHeight,interiorWalls,openingLine} from './interior.js';
export const roomSides={left:{axis:'x',along:'z',size:'w',span:'d',sign:-1},right:{axis:'x',along:'z',size:'w',span:'d',sign:1},front:{axis:'z',along:'x',size:'d',span:'w',sign:-1},back:{axis:'z',along:'x',size:'d',span:'w',sign:1}};
export function extendRoomPreview(plan,roomId,side,distance,{kind='room',snap=true,id='extension-preview'}={}){
 const next=structuredClone(plan),r=next.rooms.find(r=>r.id===roomId),s=roomSides[side];if(!r||r.points||!s)throw Error('Choose a rectangular room wall.');
 const edge=r[s.axis]+(s.sign>0?r[s.size]:0),width=kind==='hallway'?Math.min(DEFAULT_ROUTE_WIDTH,r[s.span]):r[s.span],start=r[s.along]+(r[s.span]-width)/2,end=start+width;
 let run=snap?Math.round(distance*4)/4:distance,joined=null;
 const targets=next.rooms.filter(o=>o.id!==r.id&&!o.points).map(o=>({room:o,gap:(o[s.axis]+(s.sign<0?o[s.size]:0)-edge)*s.sign,overlap:Math.min(end,o[s.along]+o[s.span])-Math.max(start,o[s.along])})).filter(t=>t.gap>=-1e-5&&t.overlap>=1+2*plan.thickness);
 if(snap){const target=targets.filter(t=>Math.abs(t.gap-distance)<.4).sort((a,b)=>Math.abs(a.gap-distance)-Math.abs(b.gap-distance))[0];if(target){run=target.gap;joined=target.room;}}
 if(run<2&&!joined)throw Error('Drag at least 2 metres to create a room.');if(run>100)throw Error('Keep an extension within 100 metres.');
 let added=null;if(run>1e-5){if(run<2)throw Error('There is less than 2 metres for a room here. Join with a route instead.');added={id,x:r.x,z:r.z,w:r.w,d:r.d,wallHeight:roomWallHeight(plan,r),ceilingHeight:roomCeilingHeight(plan,r)};added[s.along]=start;added[s.span]=width;added[s.axis]=s.sign<0?edge-run:edge;added[s.size]=run;if(next.rooms.some(o=>o.id!==r.id&&!o.points&&Math.min(added.x+added.w,o.x+o.w)-Math.max(added.x,o.x)>1e-5&&Math.min(added.z+added.d,o.z+o.d)-Math.max(added.z,o.z)>1e-5))throw Error("The extension would overlap another room. Snap to its near wall instead.");next.rooms.push(added);}
 function door(line,lo,hi,height){const offset=(lo+hi)/2;if(next.doors.some(d=>{const existing=openingLine(d,interiorWalls(next));return d.kind!=='window'&&existing?.axis===(s.axis==='x'?'z':'x')&&Math.abs(existing.line-line)<1e-5&&Math.abs(d.offset-offset)<.1;}))return;next.doors.push({id:crypto.randomUUID(),axis:s.axis==='x'?'z':'x',line,offset,width:Math.min(DEFAULT_DOOR_WIDTH,hi-lo-2*plan.thickness),height:Math.min(DEFAULT_DOOR_HEIGHT,height-.1),kind:'door'});}
 door(edge,joined&&run<1e-5?Math.max(start,joined[s.along]):start,joined&&run<1e-5?Math.min(end,joined[s.along]+joined[s.span]):end,joined&&run<1e-5?Math.min(roomWallHeight(plan,r),roomWallHeight(plan,joined)):roomWallHeight(plan,r));if(joined&&run>1e-5)door(edge+s.sign*run,Math.max(start,joined[s.along]),Math.min(end,joined[s.along]+joined[s.span]),Math.min(roomWallHeight(plan,r),roomWallHeight(plan,joined)));
 validateInterior(next);return {plan:next,room:added||joined,joined:joined?.id,run};
}
