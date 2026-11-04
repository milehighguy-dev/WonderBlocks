import {polygonWalls,pointsOf,inside,wallPoint,shellOutline,area} from './polygon-plan.js';
const key=p=>[p.x,p.z].map(n=>Math.round(n*1e4)).join(':');
// Trace only exposed walls. Shared room boundaries never receive exterior trim.
export function buildingContours(plan){
 if(plan.shell){const points=[...shellOutline(plan.shell)];if(area(points)<0)points.reverse();return [points.map((p,i,poly)=>({a:p,b:poly[(i+1)%poly.length],height:plan.shell.height,wall:null}))];}
 const occupied=p=>plan.rooms.some(r=>inside(p,pointsOf(r),false));
 const edges=polygonWalls(plan).filter(w=>!w.shared).map(w=>{
  let a=wallPoint(w,w.start),b=wallPoint(w,w.end);const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
  if(!occupied({x:mid.x-dz/len*1e-4,z:mid.z+dx/len*1e-4}))[a,b]=[b,a];
  return {a,b,height:w.height+plan.slab,wall:w};
 });
 const loops=[];
 while(edges.length){const loop=[edges.shift()];while(key(loop.at(-1).b)!==key(loop[0].a)){
   const i=edges.findIndex(e=>key(e.a)===key(loop.at(-1).b));if(i<0)break;loop.push(edges.splice(i,1)[0]);
  }if(loop.length>=3&&key(loop.at(-1).b)===key(loop[0].a))loops.push(loop);
 }
 return loops;
}
export function offsetContour(loop,distance,scale){
 const p=loop.map(e=>({x:e.a.x*scale[0],z:e.a.z*scale[2]}));
 return p.map((v,i)=>{const a=p[(i+p.length-1)%p.length],b=p[(i+1)%p.length],l1=Math.hypot(v.x-a.x,v.z-a.z),l2=Math.hypot(b.x-v.x,b.z-v.z),n1={x:(v.z-a.z)/l1,z:-(v.x-a.x)/l1},n2={x:(b.z-v.z)/l2,z:-(b.x-v.x)/l2},den=Math.max(.001,1+n1.x*n2.x+n1.z*n2.z),dx=(n1.x+n2.x)*distance/den,dz=(n1.z+n2.z)*distance/den,limit=Math.min(1,Math.abs(distance)*8/Math.max(1e-9,Math.hypot(dx,dz)));return {x:(v.x+dx*limit)/scale[0],z:(v.z+dz*limit)/scale[2]};});
}
