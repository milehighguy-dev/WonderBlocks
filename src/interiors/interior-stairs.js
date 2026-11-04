import {levelsOf,stairConnection} from './interior-storeys.js';
import {validateInterior,interiorWalls} from './interior.js';
// Find a legal placement using the same stairwell and headroom checks as edits.
export function addInteriorStairs(plan,levelId,roomId){
 const levels=levelsOf(plan);let index=levels.findIndex(l=>l.id===levelId);if(index===levels.length-1)index--;if(index<0)throw Error('Add a second floor before connecting stairs.');const from=levels[index],to=levels[index+1],steps=Math.ceil((to.elevation-from.elevation)/.18),rooms=[...from.plan.rooms].sort((a,b)=>(b.id===roomId)-(a.id===roomId));
 for(const layout of ['straight','return-left','return-right','left','right'])for(const depth of [.28,.24,.22])for(const room of rooms)for(const direction of ['south','east','north','west'])for(const [fx,fz] of [[.5,.5],[.25,.5],[.75,.5],[.5,.25],[.5,.75]]){
 const split=layout!=='straight',first=split?Math.floor(steps/2):steps,second=steps-first,width=1.2,s={id:crypto.randomUUID(),from:from.id,to:to.id,x:0,z:0,run:first*depth,width,direction,layout,secondRun:split?second*depth:first*depth,landing:width};
 const c=stairConnection(plan,s);s.x=room.x+room.w*fx-c.passage.x-c.passage.w/2;s.z=room.z+room.d*fz-c.passage.z-c.passage.d/2;const next=structuredClone(plan);(next.stairs??=[]).push(s);try{validateInterior(next);return {plan:next,stair:s};}catch{}
 }
 throw Error('No stair fits between these floors. Extend the rooms or clear a space on both levels, then try again.');
}

// Keep the stairwell clearance beside a wall, rather than centering it on the wall.
export function snapInteriorStair(plan,stair,{threshold=.65}={}){
 const c=stairConnection(plan,stair),axis=Math.abs(Math.sin(c.yaw))>.5?'z':'x',size=axis==='x'?'w':'d',walls=interiorWalls(c.from.plan),other=axis==='x'?'z':'x',otherSize=axis==='x'?'d':'w';let best=null;
 for(const w of walls){if(w.axis!==(axis==='x'?'z':'x'))continue;if(c.passage[other]+c.passage[otherSize]<w.start||c.passage[other]>w.end)continue;for(const sign of [-1,1]){const target=w.line+sign*(c.from.plan.thickness/2+.02),edge=c.passage[axis]+(sign<0?c.passage[size]:0),delta=target-edge;if(Math.abs(delta)<=threshold&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,axis,wall:w};}}
 return best?{stair:{...stair,[axis]:stair[axis]+best.delta},snapped:true,wall:best.wall}:{stair:{...stair},snapped:false};
}
// The mouse controls the bottom of the flight. Never search unrelated room positions.
export function previewInteriorStairs(plan,levelId,point,{direction,snap=true,id='stair-preview'}={}){
 const levels=levelsOf(plan);let index=levels.findIndex(l=>l.id===levelId);if(index===levels.length-1)index--;if(index<0)throw Error('Add a second floor before connecting stairs.');const from=levels[index],to=levels[index+1],steps=Math.ceil((to.elevation-from.elevation)/.18);
 let directions=direction?[direction]:['south','east','north','west'];if(!direction&&snap){let nearest=null;for(const w of interiorWalls(from.plan)){if(!['x','z'].includes(w.axis))continue;const coordinate=w.axis==='x'?point.z:point.x,along=w.axis==='x'?point.x:point.z,dist=Math.hypot(coordinate-w.line,Math.max(w.start-along,0,along-w.end));if(dist<1.4&&(!nearest||dist<nearest.dist))nearest={w,dist};}if(nearest)directions=nearest.w.axis==='x'?['east','west','south','north']:['south','north','east','west'];}
 let fallback;for(const layout of ['straight','return-left','return-right','left','right'])for(const depth of [.28,.24,.22])for(const heading of directions){const split=layout!=='straight',first=split?Math.floor(steps/2):steps,width=1.2;let stair={id,from:from.id,to:to.id,x:point.x,z:point.z,run:first*depth,width,direction:heading,layout,secondRun:(split?steps-first:first)*depth,landing:width};const snapped=snap?snapInteriorStair(plan,stair):{stair,snapped:false};stair=snapped.stair;const next=structuredClone(plan);(next.stairs??=[]).push(stair);const result={plan:next,stair,snapped:snapped.snapped,valid:false};try{validateInterior(next);return {...result,valid:true};}catch(error){result.error=error.message;fallback??=result;}}
 return fallback;
}
