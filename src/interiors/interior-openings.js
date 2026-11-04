import {interiorWalls,openingLine,wallSpan} from './interior.js';
// Work from the gesture's original plan so resize and movement never accumulate drift.
export function adjustOpening(plan,index,mode,delta){
 const next=structuredClone(plan),d=next.doors[index];if(!d)throw Error('Select an opening.');
 const line=openingLine(d,interiorWalls(plan)),span=line&&wallSpan(interiorWalls(plan),line.axis,line.line,d.offset);
 if(!span)throw Error('This opening needs a continuous wall.');
 const min=span.start+plan.thickness,max=span.end-plan.thickness;
 let a=d.offset-d.width/2,b=d.offset+d.width/2;
 if(mode==='move'){const shift=Math.max(min-a,Math.min(max-b,delta));a+=shift;b+=shift;}
 else if(mode==='start')a=Math.max(min,Math.min(b-.2,a+delta));
 else if(mode==='end')b=Math.min(max,Math.max(a+.2,b+delta));
 else throw Error('Unknown opening handle.');
 d.width=b-a;d.offset=(a+b)/2;return next;
}
