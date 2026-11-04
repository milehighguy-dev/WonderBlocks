import {automaticStairConnection,stairConnection} from './interior-storeys.js';
import {validateInterior} from './interior.js';

// Offsets follow the automatic opening when the stairs move; dimensions stay editable.
export function editFloorOpening(plan,id,values){
 const next=structuredClone(plan),stair=next.stairs?.find(s=>s.id===id);
 if(!stair)throw Error('Select a floor opening.');
 if(values===null)delete stair.opening;
 else {const h=automaticStairConnection(plan,stair).hole;stair.opening={offsetX:0,offsetZ:0,width:h.w,depth:h.d,...stair.opening,...values};}
 validateInterior(next);return next;
}
export function dragFloorOpening(plan,id,mode,delta,{snap=true}={}){
 const stair=plan.stairs?.find(s=>s.id===id);if(!stair)throw Error('Select a floor opening.');
 const h=stairConnection(plan,stair).hole,auto=automaticStairConnection(plan,stair).hole,
 round=v=>snap?Math.round(v*4)/4:v;
 let x=h.x,z=h.z,right=x+h.w,back=z+h.d;
 if(mode==='move'){const dx=round(delta.x),dz=round(delta.z);x+=dx;right+=dx;z+=dz;back+=dz;}
 else if(mode==='left')x=Math.min(right-.25,round(x+delta.x));
 else if(mode==='right')right=Math.max(x+.25,round(right+delta.x));
 else if(mode==='front')z=Math.min(back-.25,round(z+delta.z));
 else if(mode==='back')back=Math.max(z+.25,round(back+delta.z));
 else throw Error('Unknown floor opening handle.');
 return editFloorOpening(plan,id,{offsetX:(x+right)/2-auto.x-auto.w/2,offsetZ:(z+back)/2-auto.z-auto.d/2,width:right-x,depth:back-z});
}
