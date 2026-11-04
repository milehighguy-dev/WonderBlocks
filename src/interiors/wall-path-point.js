import {curveMeshPoint,curvePanelCount} from '../routes/curved-route.js';
export function wallPointAt(l,t){if(!l.segment.curveAngle)return l.start.map((v,k)=>v+(l.end[k]-v)*t);const p=curveMeshPoint(0,0,l.segment.run*t,l.segment.run,l.segment.curveAngle),c=Math.cos(l.heading),s=Math.sin(l.heading);return [l.start[0]+c*p[0]+s*p[2],l.start[1],l.start[2]-s*p[0]+c*p[2]];}
export function wallSamples(l){const count=l.segment.curveAngle?curvePanelCount(l.segment):1;return Array.from({length:count+1},(_,i)=>({point:wallPointAt(l,i/count),t:i/count}));}
