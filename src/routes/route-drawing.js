import {junctionPort} from './route-junctions.js';
import {curveMinimum} from './curved-route.js';
import {continueSelectedPath,continueSelectedAngle,branchRoute} from './route-actions.js';
import {routeLayout,dragDimensions,defaultRoute,segmentWidth} from './stair-route.js';
// Rebuild each preview from the gesture's original route, never from the last frame.
export function drawRouteSection(route,anchor,dx,dz,kind='landing',snap=true){
 if(kind.startsWith('curved-'))return drawCurvedSection(route,anchor,dx,dz,kind.slice(7),snap);
 let next=structuredClone(route),index=anchor.index??0,heading=0;
 if(anchor.type==='start'){
  const angle=Math.atan2(dx,dz);heading=snapDirection(angle,snap);
  delete next.segments[0].curveAngle;delete next.segments[0].turnAngle;next.segments[0].kind=kind;next.segments[0].turn='straight';
 }else if(anchor.type==='branch'){
  const portAngle=routeLayout(next)[index].heading+({left:Math.PI/2,right:-Math.PI/2,front:0,back:Math.PI}[anchor.side]),angle=snapDirection(Math.atan2(dx*Math.cos(portAngle)-dz*Math.sin(portAngle),dx*Math.sin(portAngle)+dz*Math.cos(portAngle)),snap);
  next=branchRoute(next,index,anchor.side,Math.abs(angle)<Math.PI/180?kind:'landing');index=next.segments.length-1;if(Math.abs(angle)>=Math.PI/180){const result=continueSelectedAngle(next,index,angle,kind);next=result.route;index=result.index;}
 }else{
  const entry=routeLayout(next)[index],forward=dx*Math.sin(entry.endHeading)+dz*Math.cos(entry.endHeading),side=dx*Math.cos(entry.endHeading)-dz*Math.sin(entry.endHeading);
  const angle=snapDirection(Math.atan2(side,forward),snap);
  const result=continueSelectedAngle(next,index,angle,kind);next=result.route;index=result.index;
 }
 const entry=routeLayout(next)[index],s=next.segments[index];if(kind==='landing')s.rise=0;
 if(anchor.type!=='start')heading=entry.heading;
 let along=dx*Math.sin(heading)+dz*Math.cos(heading);
 if(anchor.type==='end'||anchor.type==='branch'){const original=routeLayout(route),origin=anchor.type==='branch'?junctionPort(original,{segment:anchor.index,side:anchor.side}).point:original[anchor.index].end;along=(origin[0]+dx-entry.start[0])*Math.sin(heading)+(origin[2]+dz-entry.start[2])*Math.cos(heading);}
 const run=Math.max(.2,Math.min(30,along));
 const reference=route.segments[anchor.index??0]||defaultRoute().segments[0];
 const ratio=reference.kind!=='landing'&&reference.rise?reference.rise/reference.run:.5;
 Object.assign(s,dragDimensions(next,index,run,kind==='landing'?0:run*ratio,Math.atan(ratio),false));
 return {route:next,index,heading};
}

export function snapDirection(angle,enabled=true){const step=Math.PI/4;return enabled?Math.round(angle/step)*step:angle;}

function drawCurvedSection(route,anchor,dx,dz,kind,snap){
 let next=structuredClone(route),index,heading;
 if(anchor.type==='start'){index=0;heading=0;next.segments[0].kind=kind;}
 else if(anchor.type==='branch'){next=branchRoute(next,anchor.index,anchor.side,kind);index=next.segments.length-1;heading=routeLayout(next)[index].heading;}
 else{const result=continueSelectedPath(next,anchor.index,kind,kind);next=result.route;index=result.index;heading=routeLayout(next)[index].heading;}
 const s=next.segments[index],across=dx*Math.cos(heading)-dz*Math.sin(heading),along=dx*Math.sin(heading)+dz*Math.cos(heading);
 let angle=snapDirection(2*Math.atan2(across,along),snap);angle=Math.max(-Math.PI*1.5,Math.min(Math.PI*1.5,angle));
 const chord=Math.hypot(across,along),run=Math.abs(angle)<1e-5?chord:chord*angle/(2*Math.sin(angle/2)),reference=[...route.segments].reverse().find(q=>q.kind===kind&&q.rise)||{rise:kind==='stairs'?1.5:0,run:3};
 delete s.turnAngle;delete s.joinTo;s.turn='straight';s.curveAngle=angle;if(kind==='landing')s.rise=0;
 Object.assign(s,dragDimensions(next,index,Math.max(curveMinimum(segmentWidth(next,s),angle),run),kind==='landing'?0:run*reference.rise/reference.run,Math.atan2(reference.rise,reference.run),false));
 return {route:next,index,heading:0};
}
