import {angleMinimum} from './angled-landing.js';
import {drawRouteSection} from './route-drawing.js';
import {platformPorts,nearestPlatformEdge,platformPort,sectionPolygon} from '../platforms/platform.js';
import {roomPorts} from '../interiors/room-route.js';
import {entrancePort} from '../interiors/entrances.js';
import * as T from '../../vendor/three.module.js';
import {routeLayout} from './stair-route.js';
import {junctionPort,junctionSides,landingBounds} from './route-junctions.js';
import {routeConnectionResolver} from './route-links.js';
// Only advertise connections the resolver can actually make.
export function routeSnapTargets(parts,source,end,hidden=new Set()){
 const others=parts.filter(p=>p.id!==source.id),targets=[],resolveConnection=routeConnectionResolver(parts);
 for(const target of others){
  if(hidden.has(target.id))continue;
  for(const e of target.entrances||[]){const ref={partId:target.id,entranceId:e.id},candidate=structuredClone(source);(candidate.route.links??={})[end]=ref;try{const effective=resolveConnection(candidate).find(p=>p.id===source.id);targets.push({ref,point:entrancePort(target,e).point,effective,label:target.name+' entrance'});}catch{}}
  for(const port of [...roomPorts(target),...platformPorts(target)]){const candidate=structuredClone(source);(candidate.route.links??={})[end]=port.ref;try{const effective=resolveConnection(candidate).find(p=>p.id===source.id);targets.push({...port,effective,label:target.name+(port.ref.platformSection?' platform edge':' door')});}catch{}}
  if(!target.route)continue;
  for(const entry of routeLayout(target.route)){
   if(entry.segment.kind!=='landing'||(entry.segment.turnAngle!==undefined||entry.segment.curveAngle))continue;
   for(const side of junctionSides){
    const ref={partId:target.id,segment:entry.index,side},candidate=structuredClone(source);
    (candidate.route.links??={})[end]=ref;
    try{
     const resolved=resolveConnection(candidate),effective=resolved.find(p=>p.id===source.id),host=resolved.find(p=>p.id===target.id);
     const port=junctionPort(routeLayout(host.route),ref),matrix=new T.Matrix4().compose(new T.Vector3(...host.position),new T.Quaternion().setFromEuler(new T.Euler(...host.rotation)),new T.Vector3(...host.scale));
     targets.push({ref,point:new T.Vector3(...port.point).applyMatrix4(matrix),effective,label:target.name});
    }catch{} // Invalid size, direction, height or cyclic dependency: no bubble.
   }
  }
 }
 return targets;
}
export function nearestRouteBubble(targets,camera,rect,x,y,radius=22){
 let best=null,distance=radius;
 for(const target of targets){const p=target.point.clone().project(camera);if(p.z< -1||p.z>1)continue;
  const d=Math.hypot(rect.left+(p.x+1)*rect.width/2-x,rect.top+(1-p.y)*rect.height/2-y);
  if(d<distance){distance=d;best=target;}
 }
 return best;
}

export function platformEdgeRouteTarget(parts,source,end,hidden,camera,rect,x,y,bias=true){
 const others=parts.filter(p=>p.id!==source.id),resolveConnection=routeConnectionResolver(parts);let best=null,bestDistance=Infinity;
 for(const part of others){if(!part.platform||hidden.has(part.id))continue;let port=nearestPlatformEdge(part,camera,rect,x,y,{bias:end==='start'&&bias});if(!port)continue;
  if(end==='end'&&port.ref.edge!==undefined&&!source.route.segments.at(-1).curveAngle){const entry=routeLayout(source.route).at(-1),sm=new T.Matrix4().compose(new T.Vector3(...source.position),new T.Quaternion().setFromEuler(new T.Euler(...source.rotation)),new T.Vector3(...source.scale)),pm=new T.Matrix4().compose(new T.Vector3(...part.position),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.scale)),polygon=sectionPolygon(part.platform.sections.find(s=>s.id===port.ref.platformSection)),aa=polygon[port.ref.edge],bb=polygon[(port.ref.edge+1)%polygon.length],a=new T.Vector3(aa.x,0,aa.z).applyMatrix4(pm),b=new T.Vector3(bb.x,0,bb.z).applyMatrix4(pm),origin=new T.Vector3(...entry.start).applyMatrix4(sm),direction=new T.Vector3(Math.sin(entry.heading),0,Math.cos(entry.heading)).transformDirection(sm),v=b.clone().sub(a),den=v.x*direction.z-v.z*direction.x;if(Math.abs(den)<1e-8)continue;const t=((origin.x-a.x)*direction.z-(origin.z-a.z)*direction.x)/den;if(t<0||t>1)continue;port=platformPort(part,{...port.ref,edgeT:t});if(!port)continue;const screen=port.point.clone().project(camera);if(Math.hypot(rect.left+(screen.x+1)*rect.width/2-x,rect.top+(1-screen.y)*rect.height/2-y)>24)continue;}
  const candidate=structuredClone(source);(candidate.route.links??={})[end]=port.ref;
  try{const effective=resolveConnection(candidate).find(p=>p.id===source.id),screen=port.point.clone().project(camera),d=Math.hypot(rect.left+(screen.x+1)*rect.width/2-x,rect.top+(1-screen.y)*rect.height/2-y);if(d<bestDistance){bestDistance=d;best={...port,effective,label:part.name+' platform edge'};}}catch{}
 }return best;
}

// Build from the original gesture toward each anchor, rather than requiring the
// unsnapped mouse preview to already be exactly aligned with that anchor.
export function drawnRouteSnapTargets(parts,source,anchor,kind,hidden=new Set()){
 const matrix=new T.Matrix4().compose(new T.Vector3(...source.position),new T.Quaternion().setFromEuler(new T.Euler(...source.rotation)),new T.Vector3(...source.scale)),inverse=matrix.clone().invert(),layout=routeLayout(source.route);
 const origin=anchor.type==='start'?[0,0,0]:anchor.type==='branch'?junctionPort(layout,{segment:anchor.index,side:anchor.side}).point:layout[anchor.index].end;
 const ports=routeAnchorTargets(parts,source,hidden),targets=[],resolveConnection=routeConnectionResolver(parts);
 for(const port of ports){
  const local=port.point.clone().applyMatrix4(inverse),dx=local.x-origin[0],dz=local.z-origin[2],differentHeight=Math.abs(local.y-origin[1])>1e-4;
  // A flat draw gesture becomes a flight when its destination needs one.
  const preferred=[...source.route.segments].reverse().find(s=>s.kind!=='landing')?.kind;
  const connectionKind=differentHeight&&kind.endsWith('landing')?(kind.startsWith('curved-')?'curved-':'')+(preferred==='ramp'?'ramp':'stairs'):kind;
  const candidates=[];
  try{
   const result=drawRouteSection(source.route,anchor,dx,dz,connectionKind,true);
   if(result.index!==result.route.segments.length-1)continue;
   const candidate=structuredClone(source);candidate.route=result.route;
   if(anchor.type==='start')candidate.rotation[1]+=Math.sign(candidate.scale[0])*result.heading;
   (candidate.route.links??={}).end=port.ref;
   candidates.push(resolveConnection(candidate).find(p=>p.id===source.id));
  }catch{}
  candidates.push(...fitDrawnRouteToAnchor(parts,source,anchor,connectionKind,port));
  candidates.sort((a,b)=>connectionLength(a)-connectionLength(b));
  const effective=candidates[0];
  if(effective)targets.push({...port,effective,drawn:true,index:effective.route.segments.length-1,connectionKind});
 }
 return targets;
}

// Visible destination anchors do not depend on the current segment's aim or
// elevation. Their effective geometry is supplied only once a gesture can join.
export function routeAnchorTargets(parts,source,hidden=new Set()){
 if(source.rotation[0]||source.rotation[2]||source.scale[1]<=0||source.scale[2]<=0)return [];
 const probe=structuredClone(source);
 probe.route.segments=[{...probe.route.segments[0],kind:'landing',rise:0,turn:'straight'}];
 delete probe.route.links;
 for(const key of ['branchFrom','joinTo','curveAngle','turnAngle'])delete probe.route.segments[0][key];
 const width=routeLayout(probe.route)[0].width*Math.abs(probe.scale[0]),resolveConnection=routeConnectionResolver(parts),targets=[];
 // Guides advertise landing ports, not fitted routes. Resolve each host once
 // and test its available width instead of fitting a dummy route to every side.
 for(const part of parts){
  if(part.id===source.id||hidden.has(part.id)||!part.route||(part.type==='wall-route')!==(source.type==='wall-route')||part.rotation[0]||part.rotation[2]||part.scale[1]<=0||part.scale[2]<=0)continue;
  let resolved;try{resolved=resolveConnection(part);}catch{continue;}if(resolved.some(p=>p.id===source.id))continue;
  const host=resolved.find(p=>p.id===part.id),layout=routeLayout(host.route),matrix=new T.Matrix4().compose(new T.Vector3(...host.position),new T.Quaternion().setFromEuler(new T.Euler(...host.rotation)),new T.Vector3(...host.scale));
  for(const entry of layout){if(entry.segment.kind!=='landing'||entry.segment.turnAngle!==undefined||entry.segment.curveAngle)continue;
   for(const side of junctionSides){const along=['left','right'].includes(side)?Math.abs(host.scale[2]):Math.abs(host.scale[0]),available=(['left','right'].includes(side)?entry.segment.run:landingBounds(host.route,entry.index).width)*along;if(width>available+1e-5)continue;const ref={partId:host.id,segment:entry.index,side},port=junctionPort(layout,ref);targets.push({ref,point:new T.Vector3(...port.point).applyMatrix4(matrix),label:host.name,guide:true});}
  }
 }
 return targets;
}

// Fit the connecting pieces. A small exit corner
// lets an offset approach meet the destination squarely instead of rejecting it.
function fitDrawnRouteToAnchor(parts,source,anchor,kind,port){
 return [0,1,2].map(size=>fitAnchorApproach(parts,source,anchor,kind,port,size)).filter(Boolean);
}
function fitAnchorApproach(parts,source,anchor,kind,port,cornerSize){
 if(kind.startsWith('curved-'))return null;
 const matrix=new T.Matrix4().compose(new T.Vector3(...source.position),new T.Quaternion().setFromEuler(new T.Euler(...source.rotation)),new T.Vector3(...source.scale)),inverse=matrix.clone().invert(),local=port.point.clone().applyMatrix4(inverse),host=parts.find(p=>p.id===port.ref.partId);
 const targetPort=junctionPort(routeLayout(host.route),port.ref),worldAngle=host.rotation[1]+Math.sign(host.scale[0])*targetPort.angle+Math.PI,direction=new T.Vector3(Math.sin(worldAngle),0,Math.cos(worldAngle)).transformDirection(inverse),endAngle=Math.atan2(direction.x,direction.z),layout=routeLayout(source.route),origin=anchor.type==='branch'?junctionPort(layout,{segment:anchor.index,side:anchor.side}).point:anchor.type==='start'?[0,0,0]:layout[anchor.index].end;
 let theta=Math.atan2(local.x-origin[0],local.z-origin[2]),length=Math.hypot(local.x-origin[0],local.z-origin[2]);
 const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function build(angle,run){
  const drawn=drawRouteSection(source.route,anchor,Math.sin(angle)*20,Math.cos(angle)*20,kind,false);
  if(drawn.index!==drawn.route.segments.length-1)throw Error('Extend the final path.');
  const candidate=structuredClone(source);candidate.route=drawn.route;if(anchor.type==='start')candidate.rotation[1]+=Math.sign(candidate.scale[0])*drawn.heading;
  const entry=routeLayout(candidate.route).at(-1),flight=entry.segment;
  flight.run=run;flight.rise=local.y-entry.start[1];
  if(kind==='landing'&&Math.abs(flight.rise)>1e-4)throw Error('Use stairs or a ramp to connect different heights.');
  if(kind==='stairs'){flight.steps=Math.max(1,Math.min(64,Math.round(run/(flight.treadDepth??.3))));flight.treadDepth=run/flight.steps;}
  const turn=wrap(endAngle-entry.endHeading-(anchor.type==='start'?drawn.heading:0));
  if(Math.abs(turn)>.001){
   if(Math.abs(turn)>Math.PI*.94)throw Error('Approach the outside of this anchor.');
   const corner={...structuredClone(flight),kind:'landing',rise:0,turn:turn>0?'left':'right',turnAngle:turn,run:Math.max(angleMinimum(candidate.route.width,turn),candidate.route.width*cornerSize)};
   delete corner.branchFrom;delete corner.joinTo;delete corner.curveAngle;
   const tip={...structuredClone(corner),turn:'straight',run:.25};delete tip.turnAngle;
   candidate.route.segments.push(corner,tip);
  }
  const endpoint=routeLayout(candidate.route).at(-1).end;
  const actual=new T.Vector3(...endpoint);if(anchor.type==='start')actual.applyAxisAngle(new T.Vector3(0,1,0),drawn.heading);
  return {candidate,error:[actual.x-local.x,actual.z-local.z]};
 }
 try{
  for(let i=0;i<24;i++){
   const current=build(theta,length),[x,z]=current.error;
   if(Math.hypot(x,z)<1e-5){(current.candidate.route.links??={}).end=port.ref;return routeConnectionResolver(parts)(current.candidate).find(p=>p.id===source.id);}
   const a=build(theta+.0001,length).error,b=build(theta,length+.001).error,ax=(a[0]-x)/.0001,az=(a[1]-z)/.0001,bx=(b[0]-x)/.001,bz=(b[1]-z)/.001,det=ax*bz-az*bx;
   if(Math.abs(det)<1e-8)return null;
   theta-=Math.max(-.3,Math.min(.3,(x*bz-z*bx)/det));length-=Math.max(-5,Math.min(5,(ax*z-az*x)/det));
   if(length<.2||length>30)return null;
  }
 }catch{}
 return null;
}

// Compare fitted paths in world units, including rise and both legs of corners.
function connectionLength(part){
 const scale=part.scale;
 const leg=(heading,run,rise=0)=>Math.hypot(Math.sin(heading)*run*scale[0],Math.cos(heading)*run*scale[2],rise*scale[1]);
 return routeLayout(part.route).reduce((sum,l)=>sum+(l.segment.turnAngle!==undefined?leg(l.heading,l.segment.run/2)+leg(l.endHeading,l.segment.run/2):leg(l.heading,l.segment.run,l.segment.rise)),0);
}
