import * as T from '../../vendor/three.module.js';
import {makePart} from '../core/model.js';
import {defaultInterior} from '../interiors/interior.js';
import {routeLayout} from '../routes/stair-route.js';
import {curveMeshPoint} from '../routes/curved-route.js';
import {junctionPort} from '../routes/route-junctions.js';
import {platformPorts,platformPort,sectionPolygon} from '../platforms/platform.js';
import {roomPorts} from '../interiors/room-route.js';
import {partMatrix} from '../interiors/entrances.js';

// Existing route, wall and room objects form a winding inhabited traffic canyon.
export function addCoruscantUndercity(parts,tunnel,{origin:anchor=[-145,0,-290],bend=1,entryRef,freight=true}={}){
 const district='09 · Undercity / winding market streets',origin=new T.Vector3(...anchor),yaw=Math.PI;
 const add=(type,name,position,scale=[1,1,1],color='#647577',preset='cor-riveted-wall')=>{
  const p=makePart(type,{name,position,scale,color,surface:{preset,scale:.4},assemblyId:district,assemblyName:district});parts.push(p);return p;
 };
 const base=[...Array.from({length:3},()=>({kind:'landing',run:10,rise:0,steps:1,turn:'straight'})),...Array.from({length:5},(_,i)=>[{kind:'landing',run:20,rise:0,steps:1,turn:'straight',curveAngle:bend*[1,1,-1,-1,1][i]*Math.PI/8},{kind:'landing',run:10,rise:0,steps:1,turn:'straight'}]).flat()];
 const layout=routeLayout({width:10,thickness:.4,gap:0,segments:base});
 const local=(l,x,z=0,y=0)=>{const q=curveMeshPoint(x,0,z,l.segment.run,l.segment.curveAngle||0),c=Math.cos(l.heading),s=Math.sin(l.heading);return new T.Vector3(l.start[0]+c*q[0]+s*q[2],y,l.start[2]-s*q[0]+c*q[2]);};
 const world=v=>v.clone().applyAxisAngle(new T.Vector3(0,1,0),yaw).add(origin);
 const point=(l,x,z=0,y=0)=>world(local(l,x,z,y));
 const rail=(side,color='#65797a')=>({style:'posts',sides:side,height:1.1,spacing:3,postWidth:.09,railWidth:.1,railHeight:.1,color,surface:{preset:'plain',scale:1}});
 const platform=(name,position,rotation=0)=>{const p=add('platform',name,position);Object.assign(p.platform.sections[0],{width:48,depth:20});p.rotation[1]=rotation;p.platform.thickness=.6;return p;};
 const arrival=platform('Undercity arrival square',origin.clone().add(new T.Vector3(0,0,10)).toArray());
 const end=layout.at(-1),endHeading=yaw+end.endHeading,endPoint=world(new T.Vector3(...end.end));
 const forward=new T.Vector3(Math.sin(endHeading),0,Math.cos(endHeading));
 const exit=platform('Undercity far market square',endPoint.clone().addScaledVector(forward,10).toArray(),endHeading);
 const upperExit=platform('Undercity upper market square',endPoint.clone().addScaledVector(forward,10).add(new T.Vector3(0,8,0)).toArray(),endHeading);
 function platformRef(p,side,x=0){
  const ref=platformPorts(p).find(q=>q.ref.side===side).ref,poly=sectionPolygon(p.platform.sections[0]),z=side==='front'?-10:side==='back'?10:0,target={x:side==='right'?24:side==='left'?-24:x,z};let best;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((target.x-a.x)*dx+(target.z-a.z)*dz)/(dx*dx+dz*dz))),d=Math.hypot(a.x+t*dx-target.x,a.z+t*dz-target.z);if(!best||d<best.d)best={edge:i,edgeT:t,d};}
  return {...ref,edge:best.edge,edgeT:best.edgeT};
 }
 function port(ref){const p=parts.find(p=>p.id===ref.partId);if(ref.platformSection)return platformPort(p,ref);if(ref.roomDoorId)return roomPorts(p).find(q=>q.ref.roomDoorId===ref.roomDoorId);const q=junctionPort(routeLayout(p.route),ref);return {point:new T.Vector3(...q.point).applyMatrix4(partMatrix(p)),angle:p.rotation[1]+q.angle};}
 function connect(name,start,end,width=4,enclosed=false){
  const a=port(start),b=port(end),run=Math.hypot(b.point.x-a.point.x,b.point.z-a.point.z),rise=b.point.y-a.point.y,n=Math.max(1,Math.ceil(run/24),Math.ceil(Math.abs(rise)/6));
  const p=add('stair-route',name,a.point.toArray());p.rotation[1]=Math.atan2(b.point.x-a.point.x,b.point.z-a.point.z);
  p.route={width,thickness:.3,gap:0,links:{start,end},segments:Array.from({length:n},()=>({kind:rise?'stairs':'landing',run:run/n,rise:rise/n,steps:Math.max(1,Math.ceil(Math.abs(rise)/n/.18)),turn:'straight',railing:enclosed?{style:'none'}:rail('both'),...(enclosed?{hallway:{style:'plain',height:5.4,thickness:.25,ceiling:true,color:'#657777',surface:{preset:'cor-riveted-wall',scale:.4}}}:{})}))};return p;
 }
 connect('Buried service passage / undercity market connection',entryRef||{partId:tunnel.id,segment:1,side:'left'},platformRef(arrival,entryRef?'back':'right'),7.5,true);
 const banks=[],upperBanks=[];
 for(const offset of [-14,14]){
  const side=offset>0?'West':'East',start=point(layout[0],offset),p=add('stair-route',side+' winding undercity street',start.toArray());p.rotation[1]=yaw;
  const segments=(slice,width,elevation=0)=>slice.map(l=>({ ...l.segment,run:l.segment.run-offset*(l.segment.curveAngle||0),pathStart:{point:local(l,offset,0,elevation).sub(local(layout[0],offset)).toArray(),heading:l.heading},railing:rail(offset>0?'right':'left'),...(width===10?{fillToGround:true,groundFlare:0}:{}),componentFinishes:{deck:{color:'#788180',surface:{preset:'cor-angular-plating',scale:.4}}}}));
  p.route={width:10,thickness:.5,gap:0,groundHeight:-58,links:{start:platformRef(arrival,'front',-offset),end:platformRef(exit,'front',offset)},segments:segments(layout,10)};
  // Sidewalks follow parallel offset arcs, preserving a constant traffic gap.
  banks.push(p);
  const first=layout[2],upStart=point(first,offset,0,8),upper=add('stair-route',side+' upper gallery street',upStart.toArray());upper.rotation[1]=yaw;
  const upOrigin=local(first,offset,0,8);
  upper.route={width:10,thickness:.35,gap:0,links:{end:platformRef(upperExit,'front',offset)},segments:segments(layout.slice(2),3,8).map((s,i)=>({...s,pathStart:{point:local(layout[i+2],offset,0,8).sub(upOrigin).toArray(),heading:layout[i+2].heading}}))};upperBanks.push(upper);
  connect(side+' street / upper gallery stair',{partId:p.id,segment:0,side:'front'},{partId:upper.id,segment:0,side:'back'},3);
  // Continuous solids above the shops and below their floors replace detached bays.
  const buildingOffset=Math.sign(offset)*24;
  for(const [name,top,bottom,preset,color] of [['grounded frontage foundation',-.2,-58,'cor-riveted-wall','#4c6267'],['continuous tenement mass',21,6,'cor-window-ribs','#667777']]){
   const mass=add('stair-route',side+' '+name,point(layout[0],buildingOffset,0,top).toArray(),[1,1,1],color,preset);mass.rotation[1]=yaw;
   mass.route={width:10,thickness:.2,gap:0,groundHeight:bottom,segments:layout.map(l=>({...l.segment,run:l.segment.run-buildingOffset*(l.segment.curveAngle||0),pathStart:{point:local(l,buildingOffset).sub(local(layout[0],buildingOffset)).toArray(),heading:l.heading},fillToGround:true,groundFlare:0,railing:{style:'none'}}))};
  }
  // A narrow continuous forecourt fills the inset between the street and shop doors.
  const forecourt=add('stair-route',side+' continuous shop forecourt',point(layout[0],Math.sign(offset)*19.25).toArray());forecourt.rotation[1]=yaw;
  forecourt.route={width:.5,thickness:.2,gap:0,segments:layout.map(l=>({...l.segment,run:l.segment.run-Math.sign(offset)*19.25*(l.segment.curveAngle||0),pathStart:{point:local(l,Math.sign(offset)*19.25).sub(local(layout[0],Math.sign(offset)*19.25)).toArray(),heading:l.heading},railing:{style:'none'}}))};
  const facade=add('wall-route',side+' curved building frontage',origin.toArray());facade.rotation[1]=yaw;
  facade.route={width:.5,thickness:.2,gap:0,segments:[]};
  for(let y=0;y<6;y+=3)for(const l of layout.filter(l=>![1,4,6,8,10,12].includes(l.index)))facade.route.segments.push({...l.segment,run:l.segment.run-Math.sign(offset)*19.5*(l.segment.curveAngle||0),pathStart:{point:local(l,Math.sign(offset)*19.5,0,y).toArray(),heading:l.heading},railing:{style:'solid',sides:'left',height:3,panelThickness:.4,color:'#536466',surface:{preset:'cor-riveted-wall',scale:.35}}});
  for(const [number,index] of [1,4,6,8,10,12].entries()){
   const l=layout[index],center=point(l,Math.sign(offset)*24,l.segment.run/2),room=add('interior',side+' undercity storefront '+(number+1),center.toArray()),plan=defaultInterior();room.rotation[1]=yaw+l.heading;
   plan.height=6;plan.rooms=[{id:'shop',x:-4.5,z:-5,w:9,d:10}];plan.finishes={floor:{color:'#8b8270',preset:'tile',scale:.6},wall:{color:'#939888',preset:'cor-interior-panel',scale:.5},outside:{color:'#566c70',preset:'cor-riveted-wall',scale:.35},ceiling:{color:'#8e998f',preset:'plain',scale:1},roof:{color:'#8e998f',preset:'plain',scale:1}};
   const doorId=crypto.randomUUID();plan.doors=[{id:doorId,axis:'z',line:offset>0?-4.5:4.5,offset:0,width:4,height:4.2,kind:'door'}];room.interior=plan;
   connect(side+' storefront '+(number+1)+' entrance',{partId:p.id,segment:index,side:offset>0?'left':'right'},{partId:room.id,roomDoorId:doorId,levelId:'ground'},4);
   const signPos=point(l,Math.sign(offset)*20,l.segment.run/2,4.8),sign=add('block',side+' illuminated shop sign '+(number+1),signPos.toArray(),[.2,1.2,5],number%2?'#dda35f':'#95bb82','plain');sign.rotation[1]=room.rotation[1];
   const counter=add('block',side+' shop counter '+(number+1),center.clone().add(new T.Vector3(0,0,0)).toArray(),[1.5,1.1,3],'#8c806c','plain');counter.rotation[1]=room.rotation[1];counter.interiorProp=true;
  }
 }
 // Crossing bridges are real connections between the two elevated street routes.
 for(const i of [4,8,12])connect('Undercity upper crossbridge '+i,{partId:upperBanks[0].id,segment:i-2,side:'left'},{partId:upperBanks[1].id,segment:i-2,side:'right'},4);
 connect('Undercity ground market crossbridge',{partId:banks[0].id,segment:8,side:'left'},{partId:banks[1].id,segment:8,side:'right'},5);
 add('block','Undercity deep traffic canyon floor',origin.clone().lerp(endPoint,.5).add(new T.Vector3(0,-60,0)).toArray(),[100,2,200],'#293e43','cor-concrete');
 for(const i of [4,8,12]){
  const l=layout[i],center=point(l,0,l.segment.run/2,15),beam=add('block','Undercity overhead utility span '+i,center.toArray(),[40,.5,.6],'#435957','plain');beam.rotation[1]=yaw+l.heading;
  const sign=add('block','Undercity suspended traffic sign '+i,center.clone().add(new T.Vector3(0,-2,0)).toArray(),[7,1.5,.2],'#c7b866','plain');sign.rotation[1]=yaw+l.heading;
 }
 if(freight){const lower=parts.find(p=>p.name==='Sinkhole lower loading platform'),startRef=platformRef(exit,'left'),endRef=platformPorts(lower).find(p=>p.ref.side==='left').ref;
 const a=port(startRef),b=port(endRef),startAngle=a.angle,endAngle=b.angle+Math.PI,radius=30,delta=b.point.clone().sub(a.point);
 const arcDelta=(from,to)=>{const r=Math.sign(to-from)*radius;return new T.Vector3(r*(Math.cos(from)-Math.cos(to)),0,r*(Math.sin(to)-Math.sin(from)));};
 let lo=0,hi=Math.PI/2;for(let i=0;i<60;i++){const mid=(lo+hi)/2,rest=delta.clone().sub(arcDelta(startAngle,mid)).sub(arcDelta(mid,endAngle)),cross=rest.x*Math.cos(mid)-rest.z*Math.sin(mid);if(cross>0)lo=mid;else hi=mid;}
 const heading=(lo+hi)/2,firstAngle=heading-startAngle,lastAngle=endAngle-heading,firstRun=Math.abs(firstAngle)*radius,lastRun=Math.abs(lastAngle)*radius,straight=delta.clone().sub(arcDelta(startAngle,heading)).sub(arcDelta(heading,endAngle)).setY(0).length(),total=firstRun+straight+lastRun;
 const descent=add('stair-route','Undercity through-route / lower sinkhole freight yard',a.point.toArray());descent.rotation[1]=startAngle;
 const flight=(run,angle=0)=>{const rise=delta.y*run/total;return {kind:'stairs',run,rise,steps:Math.ceil(Math.abs(rise)/.18),turn:'straight',...(angle?{curveAngle:angle}:{}),railing:{style:'none'},hallway:{style:'plain',height:5.4,thickness:.25,ceiling:true,color:'#647375',surface:{preset:'cor-riveted-wall',scale:.4}}};};
 const count=Math.ceil(straight/24);descent.route={width:7.5,thickness:.3,gap:0,links:{start:startRef,end:endRef},segments:[flight(firstRun,firstAngle),...Array.from({length:count},()=>flight(straight/count)),flight(lastRun,lastAngle)]};
 }
 return {arrival,exit,upperExit,banks,upperBanks};
}
