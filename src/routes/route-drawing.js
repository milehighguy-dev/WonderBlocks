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

export function fitCurvedEndpoint(across,along,snap=true){
 const angle=Math.max(-Math.PI*1.5,Math.min(Math.PI*1.5,snapDirection(2*Math.atan2(across,along),snap))),chord=Math.hypot(across,along);
 return {angle,run:Math.abs(angle)<1e-5?chord:chord*angle/(2*Math.sin(angle/2))};
}

// Edit from the captured route, so moving sideways can reshape the bend without
// drifting its start, inserting sections, or accumulating changes each frame.
export function dragCurvedEndpoint(route,index,delta,{snap=true,lockAngle=true,referenceAngle}={}){
 const entry=routeLayout(route)[index],s=entry.segment,target=entry.end.map((v,i)=>v+delta[i]),dx=target[0]-entry.start[0],dz=target[2]-entry.start[2];
 const {angle,run}=fitCurvedEndpoint(dx*Math.cos(entry.heading)-dz*Math.sin(entry.heading),dx*Math.sin(entry.heading)+dz*Math.cos(entry.heading),snap),candidate=structuredClone(route);
 Object.assign(candidate.segments[index],{curveAngle:angle,turn:'straight'});delete candidate.segments[index].turnAngle;delete candidate.segments[index].joinTo;
 return {...dragDimensions(candidate,index,run,s.rise+delta[1],referenceAngle??Math.atan2(s.rise,s.run),lockAngle),curveAngle:angle,turn:'straight',turnAngle:undefined};
}

// Fit the exposed beginning in reverse, then restore the section's direction.
// This fixes the far endpoint and tangent, so the surviving path stays put.
export function dragRouteStart(route,index,delta,{reshapeCurve=true,snap=true,lockAngle=true,referenceAngle}={}){
 const entry=routeLayout(route)[index],s=entry.segment,reverse=structuredClone(route),section=structuredClone(s);
 delete section.branchFrom;delete section.joinTo;delete section.wallJoinTo;delete section.turnAngle;
 Object.assign(section,{turn:'straight',rise:-s.rise,pathStart:{point:[...entry.end],heading:entry.endHeading+Math.PI}});
 if(s.curveAngle!==undefined)section.curveAngle=-s.curveAngle;
 reverse.segments=[section];delete reverse.links;delete reverse.attachments;
 const angle=referenceAngle??Math.atan2(-s.rise,s.run),mid=section.pathStart.heading+(section.curveAngle??0)/2,factor=s.curveAngle?s.curveAngle/(2*Math.sin(s.curveAngle/2)):1;
 const values=reshapeCurve&&s.curveAngle!==undefined?dragCurvedEndpoint(reverse,0,delta,{snap,lockAngle,referenceAngle:angle}):dragDimensions(reverse,0,s.run+(delta[0]*Math.sin(mid)+delta[2]*Math.cos(mid))*factor,-s.rise+delta[1],angle,lockAngle);
 Object.assign(section,values);const fitted=routeLayout(reverse)[0],heading=fitted.endHeading+Math.PI;
 return {...values,endpoint:'start',rise:-values.rise,...(s.curveAngle!==undefined?{curveAngle:-section.curveAngle}:{}),pathStart:{point:[...fitted.end],heading:Math.atan2(Math.sin(heading),Math.cos(heading))}};
}

function drawCurvedSection(route,anchor,dx,dz,kind,snap){
 let next=structuredClone(route),index,heading;
 if(anchor.type==='start'){index=0;heading=0;next.segments[0].kind=kind;}
 else if(anchor.type==='branch'){next=branchRoute(next,anchor.index,anchor.side,kind);index=next.segments.length-1;heading=routeLayout(next)[index].heading;}
 else{const result=continueSelectedPath(next,anchor.index,kind,kind);next=result.route;index=result.index;heading=routeLayout(next)[index].heading;}
 const s=next.segments[index],across=dx*Math.cos(heading)-dz*Math.sin(heading),along=dx*Math.sin(heading)+dz*Math.cos(heading);
 const {angle,run}=fitCurvedEndpoint(across,along,snap),reference=[...route.segments].reverse().find(q=>q.kind===kind&&q.rise)||{rise:kind==='stairs'?1.5:0,run:3};
 delete s.turnAngle;delete s.joinTo;s.turn='straight';s.curveAngle=angle;if(kind==='landing')s.rise=0;
 Object.assign(s,dragDimensions(next,index,Math.max(curveMinimum(segmentWidth(next,s),angle),run),kind==='landing'?0:run*reference.rise/reference.run,Math.atan2(reference.rise,reference.run),false));
 return {route:next,index,heading:0};
}
