import {flaredLandingGeometry} from './flared-landing.js';
import {wallPointAt} from '../interiors/wall-path-point.js';
import {DEFAULT_ROUTE_WIDTH} from './route-defaults.js';
import {validateRouteFinishes} from './route-finishes.js';
import {curveMinimum,curvePoint,curveMeshPoint,bendRouteMeshes,curvedFloorGeometry} from './curved-route.js';
import {angledTurn,angleMinimum,angledLanding,angledFloor} from './angled-landing.js';
import {enclosedLandingFloor} from './landing-floor.js';
import {validateJunctions,junctionPort} from './route-junctions.js';
import {filledFlightGeometry} from './filled-flight.js';
import {routeBacking,enclosedRouteSide} from './route-profile.js';
import {validateHallway} from './hallway.js';
import {validateRailing} from './railings.js';
import * as THREE from '../../vendor/three.module.js';
export const defaultRoute=({width=DEFAULT_ROUTE_WIDTH}={})=>({width,thickness:.18,gap:.15,segments:[{kind:'stairs',run:3,rise:1.5,steps:8,turn:'straight'}]});
export const isFlatSegment=s=>s.kind==='landing'||s.rise===0;
export const segmentWidth=(r,s)=>s.width??r.width;
export const segmentThickness=(r,s)=>s.thickness??r.thickness;
export const minimumRun=(r,index)=>{const s=r.segments[index];return s.curveAngle?curveMinimum(segmentWidth(r,s)*(s.railing?.style==='yavin-aqueduct'?Math.max(s.fillToGround?2.2:1.3,s.railing.enclosed?1+2*(s.railing.postWidth??.5)/segmentWidth(r,s):1):s.railing?.style==='yavin-temple-bridge'?1.6:1),s.curveAngle):angledTurn(s)?angleMinimum(Math.max(segmentWidth(r,s),segmentWidth(r,r.segments[index+1]||s)),s.turnAngle):s.kind==='landing'&&s.turn!=='straight'?Math.max(...[s,(s.branchFrom||s.pathStart?s:r.segments[index-1])||s,((r.segments[index+1]?.branchFrom||r.segments[index+1]?.pathStart)?s:r.segments[index+1])||s].map(q=>segmentWidth(r,q))):.2;};
export const stepDepth=s=>s.treadDepth??s.run/s.steps;
export const stepThickness=(r,s)=>s.treadThickness??Math.min(.08,segmentThickness(r,s));
export function dragDimensions(route,index,run,rise,referenceAngle,snap=true){
 const s=route.segments[index],minRun=minimumRun(route,index);
 let steps=s.steps;const treadDepth=stepDepth(s);if(s.kind==='stairs'){const minimumSteps=Math.max(1,Math.ceil(minRun/treadDepth)),maximumSteps=Math.min(64,Math.floor(30/treadDepth));if(minimumSteps>maximumSteps)throw Error('This curve needs more room than 64 steps allow. Reduce its width or bend, or increase tread depth.');steps=Math.max(minimumSteps,Math.min(maximumSteps,Math.round(run/treadDepth)));run=steps*treadDepth;}
 run=Math.max(minRun,Math.min(30,run));rise=Math.max(-10,Math.min(10,rise));if(Math.abs(rise)<.015)rise=0;let locked=false;
 if(s.kind!=='landing'&&rise!==0&&snap&&Math.abs(Math.atan2(rise,run)-referenceAngle)<Math.PI/60){const target=run*Math.tan(referenceAngle);if(target>=-10&&target<=10){rise=target;locked=true;}}
 return {steps,...(s.kind==='stairs'?{treadDepth,treadThickness:stepThickness(route,s)}:{}),run,rise:s.kind==='landing'?s.rise:rise,locked};
}
export function validateRoute(r){
 if(!r||!Number.isFinite(r.width)||r.width<.5||r.width>10||!Number.isFinite(r.thickness)||r.thickness<.05||r.thickness>1||!Number.isFinite(r.gap)||r.gap<0||r.gap>5||!Array.isArray(r.segments)||!r.segments.length||r.segments.length>256)throw Error('Invalid stair route.');
 for(const s of r.segments)if(!['stairs','ramp','landing'].includes(s.kind)||!Number.isFinite(s.run)||s.run<minimumRun(r,r.segments.indexOf(s))||s.run>30||!Number.isFinite(s.rise)||s.rise<-10||s.rise>10||!Number.isInteger(s.steps)||s.steps<1||s.steps>64||!['straight','left','right','return-left','return-right'].includes(s.turn)||s.kind!=='landing'&&s.turn!=='straight')throw Error('Invalid route segment.');
 for(const s of r.segments){if(s.treadDepth!==undefined&&(!Number.isFinite(s.treadDepth)||s.treadDepth<.05||s.treadDepth>3)||s.treadThickness!==undefined&&(!Number.isFinite(s.treadThickness)||s.treadThickness<.02||s.treadThickness>1))throw Error('Invalid individual step dimensions.');if(s.width!==undefined&&(!Number.isFinite(s.width)||s.width<.5||s.width>10)||s.thickness!==undefined&&(!Number.isFinite(s.thickness)||s.thickness<.05||s.thickness>1))throw Error('Invalid segment width or thickness.');}
 for(const s of r.segments)if(s.turnAngle!==undefined&&(!Number.isFinite(s.turnAngle)||s.kind!=='landing'||Math.abs(s.turnAngle)<.001||Math.abs(s.turnAngle)>Math.PI*175/180||s.turn!==(s.turnAngle>0?'left':'right')))throw Error('Turn angle must be between 0.06° and 175°.');
 for(const s of r.segments)if(s.curveAngle!==undefined&&(!Number.isFinite(s.curveAngle)||Math.abs(s.curveAngle)>Math.PI*1.5||s.turn!=='straight'||s.turnAngle!==undefined||s.joinTo))throw Error('Curved sections need a straight exit setting and a bend between -270° and 270°.');
 for(const s of r.segments){validateRailing(s.railing);validateHallway(s.hallway);validateRouteFinishes(s.componentFinishes);if(s.floorFinish!==undefined)validateRouteFinishes({deck:s.floorFinish});}
 for(const s of r.segments)if(s.groundFlare!==undefined&&(!Number.isFinite(s.groundFlare)||s.groundFlare<-.8||s.groundFlare>2))throw Error('Base flare must be between -80% and 200%.');
 if(r.cutThroughSolids!==undefined&&typeof r.cutThroughSolids!=='boolean')throw Error('Invalid route solid cutting.');
 if(r.cutHeight!==undefined&&(!Number.isFinite(r.cutHeight)||r.cutHeight<2.4||r.cutHeight>12))throw Error('Cut clearance must be between 2.4 and 12 metres.');
 for(const s of r.segments)if(s.fillToGround!==undefined&&typeof s.fillToGround!=='boolean')throw Error('Invalid segment ground fill.');
 for(const s of r.segments){if(s.cutThroughSolids!==undefined&&typeof s.cutThroughSolids!=='boolean')throw Error('Invalid section solid cutting.');if(s.cutHeight!==undefined&&(!Number.isFinite(s.cutHeight)||s.cutHeight<2.4||s.cutHeight>12))throw Error('Invalid section cut clearance.');}
 if(r.groundHeight!==undefined&&(!Number.isFinite(r.groundHeight)||Math.abs(r.groundHeight)>1000))throw Error('Invalid ground fill.');
 for(const s of r.segments)if(s.pathStart&&(!Array.isArray(s.pathStart.point)||s.pathStart.point.length!==3||!s.pathStart.point.every(Number.isFinite)||!Number.isFinite(s.pathStart.heading)))throw Error('Invalid path origin.');
 for(let i=0;i<r.segments.length;i++){const j=r.segments[i].wallJoinTo;if(j&&(!Number.isInteger(j.segment)||j.segment<0||j.segment>=i||!Number.isFinite(j.t)||j.t<0||j.t>1||r.segments[i].kind!=='landing'))throw Error('Choose an earlier wall for this weld.');}
 validateJunctions(r);if(r.segments.some(s=>s.joinTo))routeLayout(r,true);return structuredClone(r);
}
export function routeLayout(route,validated=false){
 if(!validated)validateRoute(route);let x=0,y=0,z=0,angle=0;const built=[];
 return route.segments.map((original,i)=>{let s=original;
  if(s.pathStart){[x,y,z]=s.pathStart.point;angle=s.pathStart.heading;}
  if(s.branchFrom){const port=junctionPort(built,s.branchFrom);[x,y,z]=port.point;angle=port.angle;}
  if(s.wallJoinTo){const target=built[s.wallJoinTo.segment],point=wallPointAt(target,s.wallJoinTo.t),dx=point[0]-x,dz=point[2]-z,run=Math.hypot(dx,dz);if(run<.2||run>30||Math.abs(point[1]-y)>.05)throw Error('Keep welded walls level and within 30 metres.');angle=Math.atan2(dx,dz);s={...s,run,turn:'straight'};}
  if(s.joinTo){const port=junctionPort(built,s.joinTo),target=port.point,dx=target[0]-x,dz=target[2]-z,run=Math.hypot(dx,dz),rise=target[1]-y;
   if(run<.2||run>30||Math.abs(rise)>10)throw Error('The join must be between 0.2 and 30 metres long, with at most 10 metres height change.');
   if(s.kind==='landing'&&Math.abs(rise)>1e-5)throw Error('Use a ramp or stairs to join different heights.');
   const aim=Math.atan2(dx,dz),difference=a=>Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));
   if(difference(aim-angle)>1e-5||difference(aim-port.angle-Math.PI)>1e-5)throw Error('Aim this section straight at the chosen landing side. Add a turn or adjust the preceding section first.');
   angle=aim;s={...s,run,rise,turn:'straight',...(s.kind==='stairs'?{steps:Math.max(1,Math.min(64,Math.round(run/stepDepth(s))))}: {})};
  }
  const own=segmentWidth(route,s),next=segmentWidth(route,((route.segments[i+1]?.branchFrom||route.segments[i+1]?.pathStart)?s:route.segments[i+1])||s),prior=segmentWidth(route,(s.branchFrom||s.pathStart?s:route.segments[i-1])||s),w=s.kind==='landing'?Math.max(own,prior,next):own;const start=[x,y,z],heading=angle;let dx=0,dz=s.run;
  if(isFlatSegment(s)){
   if(angledTurn(s)){[dx,dz]=angledLanding({segment:s,width:w,nextWidth:next}).end;angle+=s.turnAngle;}else if(s.turn==='right'||s.turn==='left'){const sign=s.turn==='right'?-1:1;dx=sign*w/2;dz=s.run-next/2;angle+=sign*Math.PI/2;}
   if(s.turn.startsWith('return-')){dx=(s.turn==='return-right'?-1:1)*((w+next)/2+(s.gap??route.gap));dz=0;angle+=Math.PI;}
  }else y+=s.rise;
  if(s.curveAngle){[dx,,dz]=curvePoint(0,0,s.run,s.run,s.curveAngle);angle=heading+s.curveAngle;}
  x+=Math.cos(heading)*dx+Math.sin(heading)*dz;z+=-Math.sin(heading)*dx+Math.cos(heading)*dz;
  const item={segment:s,index:i,gap:s.gap??route.gap,width:w,nextWidth:next,start,heading,end:[x,y,z],endHeading:angle};built.push(item);return item;
 });
}
export function buildRoute(group,material,route=defaultRoute(),scale=[1,1,1]){

 for(const layout of routeLayout(route)){
  const {segment,index,width:w,nextWidth,start,heading}=layout,s=segment.railing?.style==='yavin-aqueduct'?{...segment,fillToGround:false}:segment;
  const t=segmentThickness(route,s);
  // Walls retain world-space thickness when the route is scaled. Measure the
  // perpendicular distance between its side planes, not the scaled X axis.
  const acrossScale=Math.abs(scale[0]*scale[2])/Math.max(1e-8,Math.hypot(scale[0]*Math.sin(heading),scale[2]*Math.cos(heading)));
  const wallThickness=s.hallway?.thickness??s.railing?.panelThickness??.1;
  let leftInset=enclosedRouteSide(s,'left')?wallThickness/Math.max(1e-8,acrossScale):0;
  let rightInset=enclosedRouteSide(s,'right')?wallThickness/Math.max(1e-8,acrossScale):0;
  // Degenerate clearances must not invert the flight mesh.
  const fit=Math.min(1,(w-.001)/Math.max(.001,leftInset+rightInset));leftInset*=fit;rightInset*=fit;
  const flightWidth=w-leftInset-rightInset,flightOffset=(rightInset-leftInset)/2;
  // Triangulate below BOTH ends before anchoring support vertices to world ground.
  const groundBase=Math.min(0,start[1],start[1]+(isFlatSegment(s)?0:s.rise))-1-start[1];
  let geometry,offsetX=0;
  if(s.curveAngle){geometry=curvedFloorGeometry(s,flightWidth,flightOffset,isFlatSegment(s)?t:routeBacking(route,s),groundBase,!enclosedRouteSide(s,'left'),!enclosedRouteSide(s,'right'));}
  else if(isFlatSegment(s)){
   const returning=s.turn.startsWith('return-'),width=returning?w+nextWidth+(s.gap??route.gap):w;
   offsetX=returning?(s.turn==='return-right'?-1:1)*(nextWidth+(s.gap??route.gap))/2:0;
   const height=s.fillToGround?-groundBase:t;
   if(s.fillToGround&&s.groundFlare&&!s.hallway&&!['solid','bespin','bespin-arches'].includes(s.railing?.style))geometry=flaredLandingGeometry(layout,groundBase);
   else if(angledTurn(s))geometry=angledFloor(layout,height,s.hallway||['solid','bespin','bespin-arches'].includes(s.railing?.style)?wallThickness:0,scale,s.hallway?'both':s.railing?.sides||'both');
   else if(s.hallway||['solid','bespin','bespin-arches'].includes(s.railing?.style))geometry=enclosedLandingFloor(route,layout,height,scale);
   else{geometry=new THREE.BoxGeometry(width,height,s.run);geometry.translate(offsetX,-height/2,s.run/2);}
  }else if(s.fillToGround){geometry=filledFlightGeometry(s,flightWidth,groundBase,routeBacking(route,s));geometry.translate(flightOffset,0,0);
  }else{
   // One closed stepped shell per flight: treads, solid risers, sides and soffit.
   // Dragging still repeats whole tread depths; only riser spacing changes with angle.
   const shape=new THREE.Shape(),backing=routeBacking(route,s);
   if(s.kind==='stairs'){
    const offset=s.rise<0?0:1;shape.moveTo(0,offset*s.rise/s.steps);
    for(let i=0;i<s.steps;i++){shape.lineTo((i+1)*s.run/s.steps,(i+offset)*s.rise/s.steps);if(i<s.steps-1)shape.lineTo((i+1)*s.run/s.steps,(i+1+offset)*s.rise/s.steps);}
   }else{shape.moveTo(0,0);shape.lineTo(s.run,s.rise);}
   shape.lineTo(s.run,s.fillToGround?groundBase:s.rise-backing);shape.lineTo(0,s.fillToGround?groundBase:-backing);shape.closePath();
   geometry=new THREE.ExtrudeGeometry(shape,{depth:flightWidth,steps:1,bevelEnabled:false});
   // Profile X becomes route Z, extrusion Z becomes width X.
   geometry.rotateY(-Math.PI/2);geometry.translate(flightWidth/2+flightOffset,0,0);
   // Solid panels close these sides; retain treads, risers and underside only.
   const normals=geometry.attributes.normal,keep=[];
   for(let i=0;i<normals.count;i+=3){const nx=normals.getX(i);if(nx>.99&&enclosedRouteSide(s,'left')||nx<-.99&&enclosedRouteSide(s,'right'))continue;keep.push(i,i+1,i+2);}
   if(keep.length<normals.count){for(const [name,a] of Object.entries(geometry.attributes)){const values=new a.array.constructor(keep.length*a.itemSize);keep.forEach((old,i)=>{for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=a.array[old*a.itemSize+k];});geometry.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize,a.normalized));}geometry.clearGroups();}

  }
  if(s.fillToGround&&!geometry.userData.groundVertices){const positions=geometry.attributes.position;geometry.userData.groundVertices=Array.from({length:positions.count},(_,i)=>Math.abs(positions.getY(i)-groundBase)<1e-5);}
  if(s.fillToGround){geometry.userData.groundFlare=s.groundFlare??0;geometry.userData.groundCenter=isFlatSegment(s)&&!s.curveAngle?offsetX:flightOffset;geometry.userData.groundWidth=flightWidth;geometry.userData.groundCurve=s.curveAngle??0;geometry.userData.groundRun=s.run;geometry.userData.groundRise=isFlatSegment(s)?0:s.rise??0;}
  const mesh=new THREE.Mesh(geometry,material);mesh.position.fromArray(start);mesh.rotation.y=heading;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.routeSegment=index;mesh.userData.routeFloor=true;mesh.userData.routeCollision={route,scale,index};if(s.curveAngle)mesh.userData.routeCurved=true;group.add(mesh);
 }
}

// Anchor support bottoms to a world-space horizontal plane after sculpting.
export function anchorRouteGround(group,part){
 if(!part.route?.segments.some(s=>s.fillToGround))return;
 const partMatrix=new THREE.Matrix4().compose(new THREE.Vector3(...part.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)),new THREE.Vector3(...part.scale));
 group.traverse(m=>{const mask=m.geometry?.userData.groundVertices;if(!mask)return;m.updateMatrix();const matrix=partMatrix.clone().multiply(m.matrix),inverse=matrix.clone().invert(),a=m.geometry.attributes.position;
 for(let i=0;i<a.count;i++)if(mask[i]){const v=new THREE.Vector3().fromBufferAttribute(a,i),d=m.geometry.userData;let factor=1+(d.groundFlare??0);if(d.groundCustomFlare)factor=1;else if(d.groundFlare){const z=d.groundSources?.[i]?.[2]??v.z,ground=part.route.groundHeight??0,station=new THREE.Vector3(d.groundCenter,d.groundRise*z/d.groundRun,z),end0=new THREE.Vector3(d.groundCenter,0,0),end1=new THREE.Vector3(d.groundCenter,d.groundRise,d.groundRun);if(d.groundCurve){station.fromArray(curveMeshPoint(station.x,station.y,station.z,d.groundRun,d.groundCurve));end1.fromArray(curveMeshPoint(end1.x,end1.y,end1.z,d.groundRun,d.groundCurve));}const height=Math.max(0,station.applyMatrix4(matrix).y-ground),maximum=Math.max(.001,end0.applyMatrix4(matrix).y-ground,end1.applyMatrix4(matrix).y-ground);factor=1+d.groundFlare*Math.min(1,height/maximum);}if(d.groundCurve){const radius=Math.abs(d.groundRun/d.groundCurve);factor=Math.min(factor,Math.max(.2,(radius-Math.abs(d.groundCenter)-.05)*2/d.groundWidth));const source=d.groundSources?.[i];if(source){const p=curveMeshPoint(d.groundCenter+(source[0]-d.groundCenter)*factor,source[1],source[2],d.groundRun,d.groundCurve);const old=curveMeshPoint(source[0],source[1],source[2],d.groundRun,d.groundCurve);v.x+=p[0]-old[0];v.z+=p[2]-old[2];}}else v.x=d.groundCenter+(v.x-d.groundCenter)*factor;v.applyMatrix4(matrix);v.y=part.route.groundHeight??0;v.applyMatrix4(inverse);a.setXYZ(i,v.x,v.y,v.z);}a.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();});
}

