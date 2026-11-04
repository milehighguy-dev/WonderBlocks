import {routeLayout,defaultRoute,segmentWidth,segmentThickness,isFlatSegment,minimumRun,validateRoute} from './stair-route.js';
import {defaultHallway} from './hallway.js';
// Add at the route end. Level circulation never silently inherits a stair rise.
export function appendRouteSegment(route,action,nextKind,preserveLanding=false){
 const next=structuredClone(route),current=next.segments.at(-1),last=[...next.segments].reverse().find(s=>!isFlatSegment(s))||defaultRoute().segments[0];
 const flight={...structuredClone(last),width:segmentWidth(next,current),thickness:segmentThickness(next,current),turn:'straight'};
 delete flight.pathStart;delete flight.curveAngle;delete flight.turnAngle;delete flight.branchFrom;delete flight.joinTo;delete flight.wallJoinTo;
 if(current.componentFinishes)flight.componentFinishes=structuredClone(current.componentFinishes);else delete flight.componentFinishes;
 if(current.railing)flight.railing=structuredClone(current.railing);else delete flight.railing;
 if(current.hallway)flight.hallway=structuredClone(current.hallway);else delete flight.hallway;
 for(const key of ['floorFinish','fillToGround','groundFlare','cutThroughSolids','cutHeight']){if(current[key]!==undefined)flight[key]=structuredClone(current[key]);else delete flight[key];}
 if(action==='hallway')next.segments.push({...flight,kind:'landing',run:4,rise:0,steps:1,hallway:structuredClone(current.hallway||defaultHallway())});
 else if(action==='ramp')next.segments.push({...flight,kind:'ramp',run:isFlatSegment(current)?current.run:last.run,rise:isFlatSegment(current)?0:last.rise});
 else if(action==='stairs'){const treadDepth=flight.kind==='stairs'?(flight.treadDepth??flight.run/flight.steps):.3,steps=Math.max(1,Math.min(64,Math.round(flight.run/treadDepth)));next.segments.push({...flight,kind:'stairs',treadDepth,steps,run:steps*treadDepth});}
 else if(action==='landing')next.segments.push({...flight,kind:'landing',run:segmentWidth(next,flight),rise:0});
 else if(['left','right','return-left','return-right'].includes(action)){
  const kind=nextKind??current.kind;
  if(!['stairs','ramp','landing'].includes(kind))throw Error('Invalid next floor shape.');
  const corner={...structuredClone(current),width:segmentWidth(next,current),thickness:segmentThickness(next,current),kind:'landing',run:segmentWidth(next,current),rise:0,turn:action};
  delete corner.curveAngle;delete corner.turnAngle;
  const reuse=!current.curveAngle&&isFlatSegment(current)&&current.turn==='straight'&&!current.joinTo&&!preserveLanding;
  if(!reuse){delete corner.pathStart;delete corner.branchFrom;delete corner.joinTo;delete corner.wallJoinTo;}
  if(reuse){corner.run=current.run;next.segments[next.segments.length-1]=corner;}else next.segments.push(corner);
  corner.run=Math.max(corner.run,minimumRun(next,next.segments.length-1));
  const continued=appendRouteSegment(next,kind);
  // A turn continues the chosen type, including zero-rise ramps and flat paths.
  if(kind===current.kind&&kind!=='landing')Object.assign(continued.segments.at(-1),structuredClone(current),{turn:'straight'});
  delete continued.segments.at(-1).pathStart;delete continued.segments.at(-1).curveAngle;delete continued.segments.at(-1).turnAngle;delete continued.segments.at(-1).branchFrom;delete continued.segments.at(-1).joinTo;delete continued.segments.at(-1).wallJoinTo;
  validateRoute(continued);return continued;
 }else throw Error('Unknown route continuation.');
 validateRoute(next);return next;
}

export function branchRoute(route,index,side,kind='landing'){
 const next=structuredClone(route),source=next.segments[index];if(!source||source.kind!=='landing')throw Error('Select a flat landing to branch from.');
 const s={...structuredClone(source),kind,turn:'straight',run:3,rise:kind==='stairs'?1.5:0,steps:kind==='stairs'?10:1,branchFrom:{segment:index,side}};delete s.pathStart;delete s.curveAngle;delete s.turnAngle;delete s.joinTo;delete s.wallJoinTo;delete s.treadDepth;
 next.segments.push(s);validateRoute(next);routeLayout(next);return next;
}
export function joinRoute(route,index,target,side){const next=structuredClone(route);next.segments[index].joinTo={segment:target,side};validateRoute(next);routeLayout(next);return next;}
export function removeRouteSegment(route,index){
 if(!route.segments[index]||route.segments.length===1)throw Error('Delete the route to remove its last section.');
 const next=structuredClone(route),layout=routeLayout(route);
 for(let i=0;i<next.segments.length;i++){
  const s=next.segments[i];
  if(i===index+1&&!s.branchFrom&&!s.pathStart||s.branchFrom?.segment===index){s.pathStart={point:[...layout[i].start],heading:layout[i].heading};delete s.branchFrom;}
  if(s.wallJoinTo?.segment===index){s.run=layout[i].segment.run;delete s.wallJoinTo;}
  if(s.joinTo?.segment===index){Object.assign(s,{run:layout[i].segment.run,rise:layout[i].segment.rise});delete s.joinTo;}
  for(const key of ['branchFrom','joinTo','wallJoinTo'])if(s[key]?.segment>index)s[key].segment--;
 }
 next.segments.splice(index,1);
 if(index===0&&next.links)delete next.links.start;
 if(index===route.segments.length-1&&next.links)delete next.links.end;
 next.attachments=(next.attachments||[]).filter(a=>a.index!==index).map(a=>({...a,index:a.index>index?a.index-1:a.index}));
 validateRoute(next);routeLayout(next);return next;
}

// A branch starts a new contiguous path; selection chooses which path to extend.
export function selectedPathEnd(route,index){
 if(!Number.isInteger(index)||!route.segments[index])throw Error('Select a route section first.');
 let end=index;while(end+1<route.segments.length&&!route.segments[end+1].branchFrom&&!route.segments[end+1].pathStart)end++;
 return end;
}
export function continueSelectedPath(route,index,action,kind){
 const end=selectedPathEnd(route,index),insert=end+1,prefix=structuredClone(route);
 if(route.segments[end].wallJoinTo||route.segments[end].joinTo||(end===route.segments.length-1&&route.links?.end)||route.attachments?.some(a=>a.index===end&&a.end==='end'))throw Error('This path is connected. Disconnect its end before extending it.');
 prefix.segments=prefix.segments.slice(0,insert);if(prefix.links)delete prefix.links.end;
 const preserve=route.segments.some(s=>s.branchFrom?.segment===end||s.joinTo?.segment===end);
 const extended=appendRouteSegment(prefix,action,kind,preserve),added=extended.segments.length-insert,next=structuredClone(route);
 next.segments=[...extended.segments,...next.segments.slice(insert)];
 for(const s of next.segments)for(const key of ['branchFrom','joinTo'])if(s[key]?.segment>=insert)s[key].segment+=added;
 for(const a of next.attachments||[])if(a.index>=insert)a.index+=added;
 validateRoute(next);routeLayout(next);return {route:next,index:insert+added-1,insert,added};
}

// Width is one editable property shared by every section of this route.
export function resizeRouteWidth(route,width){
 if(!Number.isFinite(width)||width<.5||width>10)throw Error('Route width must be between 0.5 and 10 metres.');
 const next=structuredClone(route);next.width=width;for(const s of next.segments)delete s.width;
 for(let i=0;i<next.segments.length;i++){
  const s=next.segments[i],oldMinimum=minimumRun(route,i);delete s.width;
  if(s.curveAngle||s.kind==='landing'&&s.turn!=='straight'){
   const required=minimumRun(next,i);s.run=Math.abs(s.run-oldMinimum)<1e-6?required:Math.max(s.run,required);
   if(s.kind==='stairs'){const depth=s.treadDepth??route.segments[i].run/route.segments[i].steps;s.steps=Math.max(1,Math.ceil(s.run/depth));if(s.steps>64)throw Error('This curve needs more than 64 steps at that width. Increase tread depth or reduce the width.');s.treadDepth=depth;s.run=s.steps*depth;}
  }
 }
 for(const s of next.segments)for(const key of ['branchFrom','joinTo']){const ref=s[key];if(ref&&['left','right'].includes(ref.side))next.segments[ref.segment].run=Math.max(next.segments[ref.segment].run,width);}
 validateRoute(next);routeLayout(next);return next;
}

export function continueSelectedAngle(route,index,angle,kind){
 if(Math.abs(angle)<Math.PI/180)return continueSelectedPath(route,index,kind,kind);
 if(Math.abs(Math.abs(angle)-Math.PI/2)<1e-7)return continueSelectedPath(route,index,angle>0?'left':'right',kind);
 if(Math.abs(angle)>Math.PI*175/180)return continueSelectedPath(route,index,angle>0?'return-left':'return-right',kind);
 const result=continueSelectedPath(route,index,angle>0?'left':'right',kind),corner=result.route.segments[result.index-1];
 corner.turnAngle=angle;corner.run=Math.max(corner.run,minimumRun(result.route,result.index-1));
 validateRoute(result.route);routeLayout(result.route);return result;
}
