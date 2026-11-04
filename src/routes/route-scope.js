import {resizeRouteWidth} from './route-actions.js';
import {validateRoute,minimumRun} from './stair-route.js';
export function setRouteDimension(route,index,key,value,scope='route'){
 let next=structuredClone(route);if(!next.segments[index])throw Error('Select a route section.');const sections=scope==='section'?[next.segments[index]]:next.segments;
 if(key==='width'){if(scope==='route')next=resizeRouteWidth(next,value);else{const section=next.segments[index];section.width=value;if(section.kind==='stairs'&&section.curveAngle){const required=minimumRun(next,index);if(section.run<required){const depth=section.treadDepth??section.run/section.steps,steps=Math.ceil(required/depth);if(steps>64)throw Error('This curve needs more than 64 steps at that width. Increase tread depth or reduce the width.');section.steps=steps;section.treadDepth=depth;section.run=steps*depth;}}else if(section.curveAngle)section.run=Math.max(section.run,minimumRun(next,index));}}
 else if(key==='thickness'){if(scope==='route'){next.thickness=value;for(const s of sections)delete s.thickness;}else next.segments[index].thickness=value;}
 else if(key==='height'||key==='wallThickness'){for(const s of sections)if(s.hallway)s.hallway[key==='height'?'height':'thickness']=value;}
 else throw Error('Unknown route dimension.');
 for(let i=0;i<next.segments.length;i++)if(next.segments[i].kind==='landing')next.segments[i].run=Math.max(next.segments[i].run,minimumRun(next,i));validateRoute(next);return next;
}
