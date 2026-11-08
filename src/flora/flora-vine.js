import * as T from '../../vendor/three.module.js';

// Transport one frame along the complete limb. Starting a fresh frame per saved
// piece produces twisted sections even when their centreline tangents agree.
export function floraVineFrames(curve,rotation=new T.Quaternion(),spans=1){
 const steps=Math.max(spans*4,Math.min(200,Math.max(24,Math.ceil(curve.getLength()*3)))),inverse=rotation.clone().invert(),local=new T.Curve();
 local.getTangentAt=(u,out=new T.Vector3())=>curve.getTangentAt(u,out).applyQuaternion(inverse);
 const tangents=Array.from({length:steps+1},(_,i)=>local.getTangentAt(i/steps)),normals=[],binormals=[],turn=new T.Quaternion();
 normals[0]=new T.Vector3(0,0,-1).applyQuaternion(turn.setFromUnitVectors(new T.Vector3(0,1,0),tangents[0]));binormals[0]=tangents[0].clone().cross(normals[0]);
 for(let i=1;i<=steps;i++){normals[i]=normals[i-1].clone().applyQuaternion(turn.setFromUnitVectors(tangents[i-1],tangents[i]));binormals[i]=tangents[i].clone().cross(normals[i]).normalize();}
 const frames={tangents,normals,binormals};
 for(const key of ['tangents','normals','binormals'])for(const vector of frames[key])vector.applyQuaternion(rotation);
 const divisions=Math.max(512,spans*16),lengths=curve.getLengths(divisions),length=lengths.at(-1),tangent=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3();
 return (t)=>{
  t=T.MathUtils.clamp(t,0,1);const x=t*divisions,i=Math.min(divisions-1,Math.floor(x)),u=length?T.MathUtils.lerp(lengths[i],lengths[i+1],x-i)/length:0,y=u*steps,j=Math.min(steps-1,Math.floor(y));
  curve.getTangent(t,tangent);normal.copy(frames.normals[j]).lerp(frames.normals[j+1],y-j);normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();binormal.crossVectors(tangent,normal).normalize();
  return {tangent,normal,binormal};
 };
}
