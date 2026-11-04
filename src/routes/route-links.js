import {platformPort as resolvePlatformPort} from '../platforms/platform.js';
import {roomPorts} from '../interiors/room-route.js';
import {entrancePort} from '../interiors/entrances.js';
import * as T from '../../vendor/three.module.js';
import {routeLayout,validateRoute,stepDepth} from './stair-route.js';
import {junctionPort,junctionSides,landingBounds} from './route-junctions.js';
const matrix=p=>new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion().setFromEuler(new T.Euler(...p.rotation)),new T.Vector3(...p.scale));
const upright=p=>!p.rotation[0]&&!p.rotation[2]&&p.scale[1]>0&&p.scale[2]>0;
function fitCurve(section,across,forward){
 if(!section.curveAngle)return {run:forward,across,angle:0};
 const angle=2*Math.atan2(across,forward),chord=Math.hypot(across,forward),run=Math.abs(angle)<1e-6?chord:chord*angle/(2*Math.sin(angle/2));
 section.curveAngle=angle;return {run,across:0,angle};
}
// Capture pitch before fitting the run: absent treadDepth means run / steps,
// not a default pitch. Otherwise only the attached flight silently changes size.
function fitSectionEnd(section,run,rise){
 const depth=stepDepth(section);
 Object.assign(section,{run,rise,turn:'straight'});
 if(section.kind==='stairs'){section.steps=Math.max(1,Math.min(64,Math.round(run/depth)));section.treadDepth=run/section.steps;}
}
export function resolveRouteLinks(parts){
 const result=structuredClone(parts),byId=new Map(result.map(p=>[p.id,p])),done=new Set(),visiting=new Set();
 for(const p of result)if(p.route)delete p.route.externalOpenings;
 function resolve(p){if(done.has(p.id))return;if(visiting.has(p.id))throw Error('Route connections cannot depend on each other in a cycle.');visiting.add(p.id);
  const links=p.route?.links||{};if(p.route){if(typeof links!=='object'||Array.isArray(links)||Object.keys(links).some(k=>!['start','end'].includes(k)))throw Error('Invalid route connections.');
   if((Object.values(links).some(Boolean)||p.route.attachments?.length)&&!upright(p))throw Error('Connected routes must remain upright.');
   for(const attachment of [...['start','end'].filter(end=>links[end]).map(end=>({end,index:end==='start'?0:p.route.segments.length-1,ref:links[end],root:true})),...(p.route.attachments||[])]){const {end,index,ref}=attachment;if(!['start','end'].includes(end)||!Number.isInteger(index)||!p.route.segments[index]||!ref)throw Error('Invalid route attachment.');const target=byId.get(ref.partId);
    if(ref.entranceId||ref.roomDoorId||ref.platformSection){
     if(p.type==='wall-route'&&!ref.platformSection)throw Error('Wall paths attach to walls or platform edges, not doorway routes.');
     const platformPort=ref.platformSection&&target?resolvePlatformPort(target,ref):null;
     const roomPort=platformPort||(ref.roomDoorId&&target?roomPorts(target).find(p=>p.ref.roomDoorId===ref.roomDoorId&&p.ref.levelId===ref.levelId&&p.ref.spaceId===ref.spaceId):null);const entrance=roomPort||target?.entrances?.find(e=>e.id===ref.entranceId);if(!entrance)throw Error('The connected entrance no longer exists.');
     const port=roomPort||entrancePort(target,entrance),section=p.route.segments[index];
     if(section.hallway&&!platformPort&&routeLayout(p.route)[index].width*Math.abs(p.scale[0])>port.width+1e-5)throw Error('The connected doorway is too narrow for this route. Widen the opening or narrow the route.');
     if((end==='start'&&section.branchFrom)||(end==='end'&&section.joinTo))throw Error('Disconnect this endpoint’s internal junction first.');
     if(platformPort&&(!upright(target)||(section.width??p.route.width)*Math.abs(p.scale[0])>platformPort.width))throw Error('The platform must be upright and wide enough for this route.');
     if(end==='start'){if(attachment.root){p.position=port.point.toArray();p.rotation[1]=port.angle;}else section.pathStart={point:port.point.clone().applyMatrix4(matrix(p).invert()).toArray(),heading:Math.sign(p.scale[0])*(port.angle-p.rotation[1])};}
     else{const own=routeLayout(p.route)[index],local=port.point.clone().applyMatrix4(matrix(p).invert()),dx=local.x-own.start[0],dz=local.z-own.start[2],fit=fitCurve(section,dx*Math.cos(own.heading)-dz*Math.sin(own.heading),dx*Math.sin(own.heading)+dz*Math.cos(own.heading)),run=fit.run,across=fit.across,rise=local.y-own.start[1],angle=p.rotation[1]+Math.sign(p.scale[0])*(own.heading+fit.angle)-port.angle-Math.PI;
      if(Math.abs(across)>(ref.edge!==undefined?1e-4:entrance.width/2-.1)||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>(ref.edge!==undefined?Math.PI/2-.05:1e-4)||run<.2||run>30||Math.abs(rise)>10)throw Error('Aim the final section at the entrance.');
      if(section.kind==='landing'&&Math.abs(rise)>1e-4)throw Error('Use stairs or a ramp to reach this entrance.');fitSectionEnd(section,run,rise);
     }continue;
    }
    if(!target?.route||target.id===p.id||!Number.isInteger(ref.segment)||!junctionSides.includes(ref.side))throw Error('Choose a landing on another route.');resolve(target);
    if((p.type==='wall-route')!==(target.type==='wall-route'))throw Error('Connect wall paths to other walls, and walking routes to walking routes.');
    if(!upright(target))throw Error('The target route must remain upright.');
    const layout=routeLayout(target.route),landing=layout[ref.segment];if(!landing||landing.segment.kind!=='landing')throw Error('The connected section must remain a flat landing.');
    if(landing.segment.turnAngle!==undefined||landing.segment.curveAngle)throw Error('Branch from the straight section beside this angled corner.');
    const port=junctionPort(layout,ref),point=new T.Vector3(...port.point).applyMatrix4(matrix(target));
    const section=p.route.segments[index];if((end==='start'&&section.branchFrom)||(end==='end'&&section.joinTo))throw Error('Disconnect this endpoint’s internal junction first.');
    const portAngle=target.rotation[1]+Math.sign(target.scale[0])*port.angle,width=routeLayout(p.route)[index].width*Math.abs(p.scale[0]),along=['left','right'].includes(ref.side)?Math.abs(target.scale[2]):Math.abs(target.scale[0]),available=(['left','right'].includes(ref.side)?landing.segment.run:landingBounds(target.route,ref.segment).width)*along;
    if(width>available+1e-5)throw Error('The target landing is too small for this route width.');
    if(end==='start'){if(attachment.root){p.position=point.toArray();p.rotation[1]=portAngle;}else section.pathStart={point:point.clone().applyMatrix4(matrix(p).invert()).toArray(),heading:Math.sign(p.scale[0])*(portAngle-p.rotation[1])};}
    else {const own=routeLayout(p.route)[index],local=point.applyMatrix4(matrix(p).invert()),dx=local.x-own.start[0],dz=local.z-own.start[2],fit=fitCurve(section,dx*Math.cos(own.heading)-dz*Math.sin(own.heading),dx*Math.sin(own.heading)+dz*Math.cos(own.heading)),run=fit.run,across=fit.across,rise=local.y-own.start[1];
     const angle=p.rotation[1]+Math.sign(p.scale[0])*(own.heading+fit.angle)-(portAngle+Math.PI);
     if(Math.abs(across)>1e-4||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>1e-4||run<.2||run>30||Math.abs(rise)>10)throw Error('Aim the final section at the target landing side (within 30 metres).');
     if(section.kind==='landing'&&Math.abs(rise)>1e-4)throw Error('Use stairs or a ramp to connect different heights.');
     fitSectionEnd(section,run,rise);
    }
    (target.route.externalOpenings??=[]).push({segment:ref.segment,side:ref.side,width:width/along});
   }
   validateRoute(p.route);
  }
  visiting.delete(p.id);done.add(p.id);
 }
 for(const p of result)resolve(p);return result;
}
export function cleanResolvedRoutes(parts){return resolveRouteLinks(parts).map(p=>{if(p.route)delete p.route.externalOpenings;return p;});}

// A snap probe only depends on its destination and that destination's ancestors.
// Keep the full-scene resolver for committed geometry and external openings;
// cloning every building for every possible connection stalls large editors.
export function routeConnectionResolver(parts){
 const byId=new Map(parts.map(p=>[p.id,p]));
 return candidate=>{
  const needed=new Map([[candidate.id,candidate]]);
  function visit(part){for(const ref of [...Object.values(part.route?.links||{}),...(part.route?.attachments||[]).map(a=>a.ref)]){const target=ref&&byId.get(ref.partId);if(target&&!needed.has(target.id)){needed.set(target.id,target);visit(target);}}}
  visit(candidate);return resolveRouteLinks([...needed.values()]);
 };
}
