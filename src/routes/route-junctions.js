// Junctions attach to any level landing, including corner and return platforms.
export const junctionSides=['left','right','front','back'];
export function validateJunctions(route){
 for(let i=0;i<route.segments.length;i++)for(const key of ['branchFrom','joinTo']){const ref=route.segments[i][key];if(ref===undefined)continue;
  if(!ref||!Number.isInteger(ref.segment)||ref.segment<0||ref.segment>=i||!junctionSides.includes(ref.side))throw Error('Choose an earlier landing for the junction.');
  const target=route.segments[ref.segment];if((target.turnAngle!==undefined||target.curveAngle))throw Error('Branch from the straight section beside this angled corner.');if(target.kind!=='landing')throw Error('Junctions need a flat landing.');
  const width=route.segments[i].kind==='landing'?landingWidth(route,i):route.segments[i].width??route.width,available=['left','right'].includes(ref.side)?target.run:landingBounds(route,ref.segment).width;
  if(width>available+1e-6)throw Error('Widen or lengthen the junction landing to fit this branch.');
 }
}
export function landingWidth(route,index){const s=route.segments[index],own=s.width??route.width,next=(route.segments[index+1]?.branchFrom||route.segments[index+1]?.pathStart)?own:route.segments[index+1]?.width??route.width,prior=(s.branchFrom||s.pathStart)?own:route.segments[index-1]?.width??route.width;return Math.max(own,next,prior);}
export function landingBounds(route,index){const s=route.segments[index],own=s.width??route.width,next=(route.segments[index+1]?.branchFrom||route.segments[index+1]?.pathStart)?own:route.segments[index+1]?.width??route.width;return bounds(s,landingWidth(route,index),next,s.gap??route.gap);}
function bounds(s,w,next,gap){const shift=s.turn.startsWith('return-')?(s.turn==='return-right'?-1:1)*((w+next)/2+gap):0;const min=s.turn.startsWith('return-')?Math.min(-w/2,shift-next/2):-w/2,max=s.turn.startsWith('return-')?Math.max(w/2,shift+next/2):w/2;return {min,max,width:max-min,center:(min+max)/2};}
export function junctionPort(layout,ref){const l=layout[ref.segment],s=l.segment;const box=bounds(s,l.width,l.nextWidth,l.gap??0);let x=box.center,z=s.run/2,angle=l.heading;
 if(ref.side==='left'){x=box.max;angle+=Math.PI/2;}if(ref.side==='right'){x=box.min;angle-=Math.PI/2;}if(ref.side==='front'){z=s.run;}if(ref.side==='back'){z=0;angle+=Math.PI;}
 return {point:[l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[1],l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z],angle};
}
export function junctionHoles(route,index,side){const s=route.segments[index];return [...(route.externalOpenings||[]).filter(o=>o.segment===index&&o.side===side).map(o=>{const center=['left','right'].includes(side)?s.run/2:landingBounds(route,index).center;return [center-o.width/2,center+o.width/2];}),...route.segments.flatMap(q=>['branchFrom','joinTo'].flatMap(key=>{const ref=q[key];if(ref?.segment!==index||ref.side!==side)return [];const center=['left','right'].includes(side)?s.run/2:landingBounds(route,index).center,width=q.kind==='landing'?landingWidth(route,route.segments.indexOf(q)):q.width??route.width;return [[center-width/2,center+width/2]];}))];}
