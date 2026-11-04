import {validateInterior} from '../interiors/interior.js';
export function setWindowSill(plan,index,sill){const next=structuredClone(plan),d=next.doors[index];if(d?.kind!=='window')throw Error('Select a window.');d.sill=sill;validateInterior(next);return next;}
export function levelWindowSills(plan,index){const next=structuredClone(plan),selected=next.doors[index];if(selected?.kind!=='window')throw Error('Select a window to set the sill height.');for(const d of next.doors)if(d.kind==='window')d.sill=selected.sill;validateInterior(next);return next;}
// The supplied plan is one floor; windows on other floors never become targets.
export function snapWindowSill(plan,opening,index=null,{enabled=true,threshold=.15,resizeBottom=false}={}){
 if(!enabled||opening.kind!=='window')return {opening,snapped:false};
 const targets=[...new Set(plan.doors.filter((d,i)=>i!==index&&d.kind==='window').map(d=>d.sill))].filter(s=>Math.abs(s-(opening.sill))<=threshold).sort((a,b)=>Math.abs(a-(opening.sill))-Math.abs(b-(opening.sill)));
 for(const sill of targets){const d={...opening,sill,...(resizeBottom?{height:opening.height+(opening.sill)-sill}:{})},next=structuredClone(plan);if(index===null)next.doors.push(d);else next.doors[index]=d;try{validateInterior(next);return {opening:d,snapped:true};}catch{ /* A short wall or overlapping opening cannot supply a valid snap. */ }}
 return {opening,snapped:false};
}
