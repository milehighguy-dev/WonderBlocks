import {DEFAULT_ROUTE_WIDTH} from '../routes/route-defaults.js';
import {DEFAULT_DOOR_WIDTH,DEFAULT_DOOR_HEIGHT} from './interior-defaults.js';
import {controlPointsOf} from './room-curves.js';
import {pointsOf,polygonRoom,wallPoint,wallAlong,wallDistance,snapWallPoint} from './polygon-plan.js';
import {validateInterior,interiorWalls,openingLine,wallSpan} from './interior.js';
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<1e-6;
export function roomEdgeAt(plan,wall,point){
 let best=null;for(const room of plan.rooms){const points=pointsOf(room);for(let edge=0;edge<points.length;edge++){const a=points[edge],b=points[(edge+1)%points.length];if(Math.abs(wallDistance(wall,a))>2e-5||Math.abs(wallDistance(wall,b))>2e-5)continue;const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),t=((point.x-a.x)*dx+(point.z-a.z)*dz)/(length*length);if(t< -1e-5||t>1+1e-5)continue;const distance=Math.abs((point.x-a.x)*dz-(point.z-a.z)*dx)/length;if(!best||distance<best.distance)best={roomId:room.id,edge,t:Math.max(0,Math.min(1,t)),a,b,length,distance};}}
 return best;
}
export function cornerPlacement(edge,point,{snap=true,interval=1,tolerance=.2}={}){
 const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,length=Math.hypot(dx,dz),along=((point.x-edge.a.x)*dx+(point.z-edge.a.z)*dz)/length;
 let at=Math.max(.1,Math.min(length-.1,along)),snapped=false;
 if(snap){const candidates=[length/2,Math.round(at/interval)*interval].filter(v=>v>=.1&&v<=length-.1).sort((a,b)=>Math.abs(a-at)-Math.abs(b-at));if(candidates.length&&Math.abs(candidates[0]-at)<=tolerance){at=candidates[0];snapped=true;}}
 return {point:{x:edge.a.x+dx*at/length,z:edge.a.z+dz*at/length},t:at/length,snapped};
}
export function setRoomOutline(plan,id,points,{mapEdges=null}={}){
 const next=structuredClone(plan),index=next.rooms.findIndex(r=>r.id===id);if(index<0)throw Error('Select a room.');const old=plan.rooms[index],before=pointsOf(old),room=polygonRoom(id,points,old);next.rooms[index]=room;if(before.length===points.length)for(const divider of next.partitions||[])for(const key of ['a','b']){const at=before.findIndex(p=>near(p,divider[key]));if(at>=0)divider[key]={x:points[at].x,z:points[at].z};}
 const oldWalls=interiorWalls(plan),walls=interiorWalls(next);
 for(const door of next.doors){const line=openingLine(door,oldWalls);if(!line)continue;const point=wallPoint(line,door.offset),edge=roomEdgeAt({rooms:[old]},line,point);if(!edge)continue;
 if(wallSpan(walls,line.axis,line.line,door.offset))continue;
 const targetEdge=mapEdges?.[edge.edge]??edge.edge;if(targetEdge>=room.points.length)throw Error('Move or remove the opening before removing this corner.');
 const a=room.points[targetEdge],b=room.points[(targetEdge+1)%room.points.length],target={x:a.x+(b.x-a.x)*edge.t,z:a.z+(b.z-a.z)*edge.t},w=walls.filter(w=>Math.abs(wallDistance(w,a))<2e-5&&Math.abs(wallDistance(w,b))<2e-5).find(w=>wallAlong(w,target)>=w.start-1e-5&&wallAlong(w,target)<=w.end+1e-5);
 if(!w||w.end-w.start<door.width+2*next.thickness)throw Error('Keep enough wall length for the door or window.');delete door.wall;door.axis=w.axis;door.line=w.line;door.offset=Math.max(w.start+next.thickness+door.width/2,Math.min(w.end-next.thickness-door.width/2,wallAlong(w,target)));
 }
 validateInterior(next);return next;
}
export function insertRoomCorner(plan,id,edge,t){if(plan.rooms.find(r=>r.id===id)?.curve)throw Error('Straighten this room before inserting a new control corner.');const room=plan.rooms.find(r=>r.id===id),points=controlPointsOf(room).map(p=>({...p}));if(points.length>=32)throw Error('Use at most 32 corners per room.');const a=points[edge],b=points[(edge+1)%points.length];if(!a||!b||t<=0||t>=1)throw Error('Place the corner along a wall.');points.splice(edge+1,0,{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});return setRoomOutline(plan,id,points);}
export function moveRoomCorner(plan,id,index,delta,{snap=true,angleStep=15}={}){const room=plan.rooms.find(r=>r.id===id),points=controlPointsOf(room).map(p=>({...p})),original=points[index];let point={x:original.x+delta.x,z:original.z+delta.z};if(snap){point={x:Math.round(point.x*4)/4,z:Math.round(point.z*4)/4};const prev=points[(index+points.length-1)%points.length],dx=point.x-prev.x,dz=point.z-prev.z,angle=Math.atan2(dz,dx),step=angleStep*Math.PI/180;if(angleStep&&Math.abs(angle-Math.round(angle/step)*step)<Math.PI/60)point=snapWallPoint(prev,point,angleStep);}points[index]=point;return setRoomOutline(plan,id,points);}
export function moveRoomWall(plan,id,index,delta,{snap=true}={}){const room=plan.rooms.find(r=>r.id===id),points=controlPointsOf(room).map(p=>({...p})),a=points[index],b=points[(index+1)%points.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;let distance=delta.x*nx+delta.z*nz;if(snap)distance=Math.round(distance*4)/4;for(const i of [index,(index+1)%points.length]){points[i].x+=nx*distance;points[i].z+=nz*distance;}return setRoomOutline(plan,id,points);}
export function removeRoomCorner(plan,id,index){if(plan.rooms.find(r=>r.id===id)?.curve)throw Error('Straighten this room before removing a control corner.');const r=plan.rooms.find(r=>r.id===id),points=controlPointsOf(r).map(p=>({...p}));if(points.length<=3)throw Error('Keep at least three corners.');points.splice(index,1);const mapEdges=Array.from({length:points.length+1},(_,i)=>index===0?(i===0?points.length-1:i-1):i>=index?i-1:i);return setRoomOutline(plan,id,points,{mapEdges});}

export function extendRoomEdge(plan,id,index,distance,newId,{kind='room',snap=true}={}){
 const old=plan.rooms.find(r=>r.id===id),points=pointsOf(old),a=points[index],b=points[(index+1)%points.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length,run=Math.max(2,Math.min(30,snap?Math.round(distance*4)/4:distance)),width=kind==='hallway'?Math.min(length,DEFAULT_ROUTE_WIDTH):length;
 const mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2},start={x:mid.x-dx/length*width/2,z:mid.z-dz/length*width/2},end={x:mid.x+dx/length*width/2,z:mid.z+dz/length*width/2},next=structuredClone(plan);
 next.rooms.push(polygonRoom(newId,[end,start,{x:start.x+nx*run,z:start.z+nz*run},{x:end.x+nx*run,z:end.z+nz*run}],{wallHeight:old.wallHeight??plan.height,ceilingHeight:old.ceilingHeight??old.wallHeight??plan.height}));
 const wall=interiorWalls(next).find(w=>Math.abs(wallDistance(w,mid))<2e-5&&wallAlong(w,mid)>w.start&&wallAlong(w,mid)<w.end&&w.shared);if(!wall)throw Error('Choose a free wall edge to extend.');
 if(!next.doors.some(d=>{const line=openingLine(d,interiorWalls(next));return d.kind!=='window'&&line?.axis===wall.axis&&Math.abs(line.line-wall.line)<1e-5&&Math.abs(d.offset-wallAlong(wall,mid))<.1;}))next.doors.push({id:crypto.randomUUID(),axis:wall.axis,line:wall.line,offset:wallAlong(wall,mid),width:Math.min(DEFAULT_DOOR_WIDTH,width-2*plan.thickness),height:Math.min(DEFAULT_DOOR_HEIGHT,(old.wallHeight??plan.height)-.1),kind:'door'});
 validateInterior(next);return {plan:next,room:next.rooms.at(-1),run};
}

export function curveRoomFaces(plan,id,faces,amount=1){const next=structuredClone(plan),room=next.rooms.find(r=>r.id===id);if(!room)throw Error('Select a room.');const cage=controlPointsOf(room),chosen=new Set(faces);if(!faces.some(i=>chosen.has((i+cage.length-1)%cage.length)))throw Error('Select adjacent wall faces to form a curve.');Object.assign(room,polygonRoom(id,cage,room),{curve:{faces:[...new Set(faces)].sort((a,b)=>a-b),amount}});validateInterior(next);return next;}
export function straightenRoom(plan,id){const next=structuredClone(plan),room=next.rooms.find(r=>r.id===id);delete room.curve;validateInterior(next);return next;}
