import * as T from '../../vendor/three.module.js';

// Neutral branches are editable pieces of one limb. Fair their end spans to
// their neighbours' tangents, while keeping every saved joint in place.
// Shaping only a short neck and then returning to a straight piece introduces
// a second bend (and a visible shoulder) at each connection.
export function joinedBranchCurve(points,{startTangent,endTangent}={}){
 const vectors=points.map(p=>new T.Vector3(...p));
 // Catmull-Rom needs neighbouring spans. With only two points its extrapolated
 // endpoints alias the same scratch vector and yield an eased, degenerate span.
 const base=points.length===2?new T.LineCurve3(vectors[0],vectors[1]):new T.CatmullRomCurve3(vectors,false,'centripetal');
 base.arcLengthDivisions=Math.max(200,(points.length-1)*16);
 if(!startTangent&&!endTangent)return base;
 const count=points.length-1,spans=new Map();
 const derivative=t=>{
  const lo=Math.max(0,t-1e-5),hi=Math.min(1,t+1e-5);
  return base.getPoint(hi).sub(base.getPoint(lo)).divideScalar((hi-lo)*count);
 };
 for(const i of new Set([...(startTangent?[0]:[]),...(endTangent?[count-1]:[])])){
  const a=new T.Vector3(...points[i]),b=new T.Vector3(...points[i+1]),length=a.distanceTo(b);
  const start=i===0&&startTangent?new T.Vector3(...startTangent).normalize().multiplyScalar(length):derivative(i/count);
  const end=i===count-1&&endTangent?new T.Vector3(...endTangent).normalize().multiplyScalar(length):derivative((i+1)/count);
  spans.set(i,{a,b,start,end});
 }
 const curve=new T.Curve();curve.arcLengthDivisions=base.arcLengthDivisions;
 curve.getPoint=(t,out=new T.Vector3())=>{
  const x=T.MathUtils.clamp(t,0,1)*count,i=Math.min(count-1,Math.floor(x)),span=spans.get(i);
  if(!span)return base.getPoint(t,out);
  const u=x-i,u2=u*u,u3=u2*u;
  return out.copy(span.a).multiplyScalar(2*u3-3*u2+1).addScaledVector(span.b,-2*u3+3*u2).addScaledVector(span.start,u3-2*u2+u).addScaledVector(span.end,u3-u2);
 };
 curve.getTangent=(t,out=new T.Vector3())=>{
  const x=T.MathUtils.clamp(t,0,1)*count,i=Math.min(count-1,Math.floor(x)),span=spans.get(i);
  if(!span)return base.getTangent(t,out);
  const u=x-i,u2=u*u;
  return out.copy(span.a).multiplyScalar(6*u2-6*u).addScaledVector(span.b,-6*u2+6*u).addScaledVector(span.start,3*u2-4*u+1).addScaledVector(span.end,3*u2-2*u).normalize();
 };
 return curve;
}
