import {routeLayout} from './stair-route.js';
import {junctionPort,junctionSides} from './route-junctions.js';
// One action per free edge. Continuation versus branching stays internal.
export function routeDrawHandles(route,visibleLandings=[]){
 const layout=routeLayout(route),visible=new Set(visibleLandings),handles=[];
 for(const entry of layout){const i=entry.index,s=entry.segment,following=layout[i+1],isEnd=!following||!!following.segment.branchFrom||!!following.segment.pathStart;
  const exitSide=s.turn==='straight'?'front':s.turn.startsWith('return-')?'back':s.turn;
  const exitTaken=s.kind==='landing'&&(route.segments.some(q=>['branchFrom','joinTo'].some(key=>q[key]?.segment===i&&q[key].side===exitSide))||(route.externalOpenings||[]).some(o=>o.segment===i&&o.side===exitSide));
  if(isEnd&&!exitTaken&&!s.joinTo&&!(i===layout.length-1&&route.links?.end))handles.push({point:entry.end,angle:entry.endHeading,anchor:{type:'end',index:i}});
  if(s.kind!=='landing'||(s.turnAngle!==undefined||s.curveAngle)||!visible.has(i))continue;
  const occupied=new Set([s.turn==='straight'?'front':s.turn.startsWith('return-')?'back':s.turn]);
  if(i>0&&!s.pathStart||s.branchFrom||i===0&&route.links?.start)occupied.add('back');
  for(const segment of route.segments)for(const key of ['branchFrom','joinTo'])if(segment[key]?.segment===i)occupied.add(segment[key].side);
  for(const opening of route.externalOpenings||[])if(opening.segment===i)occupied.add(opening.side);
  for(const side of junctionSides)if(!occupied.has(side)){const port=junctionPort(layout,{segment:i,side});handles.push({point:port.point,angle:port.angle,anchor:{type:'branch',index:i,side}});}
 }
 return handles;
}
