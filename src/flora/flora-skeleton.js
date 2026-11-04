import * as T from '../../vendor/three.module.js';

const v=a=>new T.Vector3(...a),bindings=new WeakMap();
// A translated joint changes a bone's direction even when its stored rotation
// is unchanged. Transport its cross-section into that direction, retaining the
// authored twist. Moving only the center otherwise shears a tube into a sheet.
export function alignFloraBoneRotation(rotation,rest,current,axis=new T.Vector3(),swing=new T.Quaternion(),target=new T.Vector3()){
 if(rest.lengthSq()>1e-12&&current.lengthSq()>1e-12){
  axis.copy(rest).normalize().applyQuaternion(rotation);
  swing.setFromUnitVectors(axis,target.copy(current).normalize());
  rotation.premultiply(swing).normalize();
 }
 return rotation;
}
// Transport with the incoming joint, then apply the child's LOCAL turn. Aligning
// the child's complete rotation back onto the bone would erase its swing.
export function floraBoneFrameRotation(a,b,controls,t=1){
 const ca=controls?.[a.id],cb=controls?.[b.id],qa=new T.Quaternion().setFromEuler(new T.Euler(...(ca?.rotation||[0,0,0]))),qb=new T.Quaternion().setFromEuler(new T.Euler(...(cb?.rotation||[0,0,0]))),relative=qa.clone().invert().multiply(qb);
 const current=v(b.point).add(v(cb?.offset||[0,0,0])).sub(v(a.point).add(v(ca?.offset||[0,0,0])));
 return alignFloraBoneRotation(qa,v(b.point).sub(v(a.point)),current).multiply(new T.Quaternion().slerp(relative,t));
}
function binding(skeleton,point){
 let best=null,distance=Infinity;
 for(const end of skeleton){const start=skeleton.find(n=>n.id===end.parent);if(!start)continue;const a=v(start.point),delta=v(end.point).sub(a),t=T.MathUtils.clamp(point.clone().sub(a).dot(delta)/Math.max(1e-12,delta.lengthSq()),0,1),center=a.addScaledVector(delta,t),d=center.distanceToSquared(point);if(d<distance){distance=d;best={a:start,b:end,t,center};}}
 if(!best){const node=skeleton.reduce((a,b)=>v(a.point).distanceToSquared(point)<v(b.point).distanceToSquared(point)?a:b);best={a:node,b:node,t:0,center:v(node.point)};}return best;
}
function frame(binding,controls){
 const {a,b,t,center}=binding,ca=controls?.[a.id],cb=controls?.[b.id],point=v(a.point).add(v(ca?.offset||[0,0,0])).lerp(v(b.point).add(v(cb?.offset||[0,0,0])),t),rotation=new T.Quaternion().setFromEuler(new T.Euler(...(ca?.rotation||[0,0,0]))).slerp(new T.Quaternion().setFromEuler(new T.Euler(...(cb?.rotation||[0,0,0]))),t),scale=v(ca?.scale||[1,1,1]).lerp(v(cb?.scale||[1,1,1]),t);
 alignFloraBoneRotation(rotation,v(b.point).sub(v(a.point)),v(b.point).add(v(cb?.offset||[0,0,0])).sub(v(a.point).add(v(ca?.offset||[0,0,0]))));
 return {center,point,rotation,scale};
}
export function floraSkeletonPose(skeleton,controls,point){const pose=frame(binding(skeleton,v(point)),controls);return {...pose,point:v(point).sub(pose.center).multiply(pose.scale).applyQuaternion(pose.rotation).add(pose.point)};}

// Each vertex belongs to its nearest skeletal segment. A transported, orthogonal
// cross-section keeps girth under both joint translation and rotation.
export function deformFloraSkeleton(skeleton,controls,positions){
 let cache=bindings.get(positions);if(!cache||cache.skeleton!==skeleton){cache={skeleton,vertices:[]};for(let i=0;i<positions.length;i+=3)cache.vertices.push(binding(skeleton,new T.Vector3().fromArray(positions,i)));bindings.set(positions,cache);}
 const nodes=new Map(skeleton.map(n=>{const c=controls?.[n.id];return [n.id,{point:v(n.point).add(v(c?.offset||[0,0,0])),rotation:new T.Quaternion().setFromEuler(new T.Euler(...(c?.rotation||[0,0,0]))),scale:v(c?.scale||[1,1,1])}];})),out=new Float32Array(positions.length),point=new T.Vector3(),center=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion(),axis=new T.Vector3(),swing=new T.Quaternion(),target=new T.Vector3();
 const directions=new Map(skeleton.map(n=>{const parent=skeleton.find(p=>p.id===n.parent)||n;return [n.id,{rest:v(n.point).sub(v(parent.point)),current:nodes.get(n.id).point.clone().sub(nodes.get(parent.id).point)}];}));
 for(let i=0;i<cache.vertices.length;i++){
  const binding=cache.vertices[i],a=nodes.get(binding.a.id),b=nodes.get(binding.b.id),t=binding.t;
  center.copy(a.point).lerp(b.point,t);scale.copy(a.scale).lerp(b.scale,t);rotation.copy(a.rotation).slerp(b.rotation,t);
  const direction=directions.get(binding.b.id);alignFloraBoneRotation(rotation,direction.rest,direction.current,axis,swing,target);
  point.fromArray(positions,i*3).sub(binding.center).multiply(scale).applyQuaternion(rotation).add(center).toArray(out,i*3);
 }return out;
}

export function floraSkeletonDescendants(skeleton,id){const ids=new Set([id]);let count;do{count=ids.size;for(const node of skeleton)if(ids.has(node.parent))ids.add(node.id);}while(count!==ids.size);return ids;}
