import * as T from '../../vendor/three.module.js';
import {FELUCIA_STALK_SHAPES} from './data/felucia-stalk-source.js';
import {KAPOK_BUTTRESS_SHAPES} from './kapok-buttress.js';
import {FLORA_PROFILES} from './procedural-flora.js';

const vector=a=>new T.Vector3(...a),cache=new Map(),deformers=new WeakMap(),restCurves=new WeakMap();
export function floraMuscleShape(id){
 if(cache.has(id))return cache.get(id);
 const data=FLORA_PROFILES[id]||FELUCIA_STALK_SHAPES[id]||KAPOK_BUTTRESS_SHAPES[id];if(!data)return null;
 const curve=new T.Curve(),points=data.points.map(vector);
 curve.getPoint=(t,out=new T.Vector3())=>{const x=T.MathUtils.clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(x));return out.copy(points[i]).lerp(points[i+1],x-i);};
 const shape={...data,curve,maxRadius:Math.max(...data.radii)};cache.set(id,shape);return shape;
}
export function floraMuscleRadius(id,t){const s=floraMuscleShape(id),x=T.MathUtils.clamp(t,0,1)*(s.radii.length-1),i=Math.min(s.radii.length-2,Math.floor(x));return T.MathUtils.lerp(s.radii[i],s.radii[i+1],x-i)/s.maxRadius;}

// Bind the authored field to the editable joint chain. Neutral placement is an
// exact uniform transform of the field mesh; bending never replaces its outline.
export function floraMuscleDeformer(b){
 const key=JSON.stringify([b.profile,b.points,b.radii,b.jointRotations,b.childRotation]),cached=deformers.get(b);if(cached?.key===key)return cached.deform;
 const shape=floraMuscleShape(b.profile);let rests=restCurves.get(shape);if(!rests){rests=new Map();restCurves.set(shape,rests);}let rest=rests.get(b.points.length);if(!rest){rest=new T.CatmullRomCurve3(b.points.map((_,i)=>shape.curve.getPoint(i/(b.points.length-1))),false,'centripetal');rests.set(b.points.length,rest);}
 const current=new T.CatmullRomCurve3(b.points.map(vector),false,'centripetal'),length=current.getLength(),lengthScale=length/rest.getLength(),radii=[...b.radii],rootRotation=new T.Quaternion().setFromEuler(new T.Euler(...(b.childRotation||[0,0,0]))),rotations=Object.entries(b.jointRotations||{}).map(([i,r])=>[+i,new T.Quaternion().setFromEuler(new T.Euler(...r))]).sort((a,b)=>b[0]-a[0]);
 const restCenter=new T.Vector3(),center=new T.Vector3(),direction=new T.Vector3(),axis=new T.Vector3(),offset=new T.Vector3(),q=new T.Quaternion(),twist=new T.Quaternion(),inverseTwist=new T.Quaternion();
 const deform=(point,t,out=new T.Vector3(),caps=null)=>{
  rest.getPoint(t,restCenter);current.getPoint(t,center);rest.getTangent(t,axis);current.getTangent(t,direction);
  const x=t*(radii.length-1),i=Math.min(radii.length-2,Math.floor(x));let scale=T.MathUtils.lerp(radii[i],radii[i+1],x-i)/shape.maxRadius;
  // Ease the authored neck into the shared girth. Keeping the original narrow
  // neck immediately beside a joint ball exposes that ball as a raised bead.
  if(caps){const profile=floraMuscleRadius(b.profile,t)*shape.maxRadius,actual=profile*scale;
   for(const [enabled,distance,radius] of [[caps.trimStart,t*length,radii[0]*shape.radii[0]/shape.maxRadius],[caps.trimEnd,(1-t)*length,radii.at(-1)*shape.radii.at(-1)/shape.maxRadius]]){
    const band=Math.min(length*.35,radius*3);if(enabled&&band>0&&distance<band){const u=distance/band,weight=1-u*u*(3-2*u);scale*=T.MathUtils.lerp(1,radius/Math.max(1e-8,actual),weight);}
   }
  }
  // End caps keep their local girth when the limb is lengthened; stretching a
  // branch must not pull a long spike past its final editable joint.
  offset.copy(point).sub(restCenter);const along=offset.dot(axis),axialScale=t<1e-8||t>1-1e-8?scale:lengthScale;offset.addScaledVector(axis,-along).multiplyScalar(scale).addScaledVector(axis,along*axialScale);
  const rotation=rotations.find(([i])=>i<=x+1e-8);twist.copy(rotation?rotation[1]:rootRotation);
  q.setFromUnitVectors(axis,direction.applyQuaternion(inverseTwist.copy(twist).invert())).premultiply(twist);
  return out.copy(offset).applyQuaternion(q).add(center);
 };
 deformers.set(b,{key,deform});return deform;
}
export function floraMuscleCurve(b){const shape=floraMuscleShape(b.profile),deform=floraMuscleDeformer(b),curve=new T.Curve(),point=new T.Vector3();curve.getPoint=(t,out=new T.Vector3())=>deform(shape.curve.getPoint(t,point),t,out);return curve;}
export function floraMuscleGeometry(b,caps={}){
 const {trimStart=false,trimEnd=false,startTangent,endTangent}=caps,shape=floraMuscleShape(b.profile),{mesh}=shape,deform=floraMuscleDeformer(b),positions=new Float32Array(mesh.positions.length),point=new T.Vector3(),out=new T.Vector3(),center=new T.Vector3(),axis=new T.Vector3(),curve=floraMuscleCurve(b),length=startTangent||endTangent?curve.getLength():0,frames=new Map();
 const ends=[[startTangent,0,b.radii[0]*shape.radii[0]/shape.maxRadius],[endTangent,1,b.radii.at(-1)*shape.radii.at(-1)/shape.maxRadius]].filter(([tangent])=>tangent).map(([tangent,t,radius])=>({t,delta:vector(tangent).sub(curve.getTangent(t)),normal:vector(tangent).multiplyScalar(t===0?-1:1),center:curve.getPoint(t),band:Math.min(length*.35,radius*3)}));
 for(let i=0;i<mesh.bindings.length;i++){
  const t=mesh.bindings[i];point.fromArray(mesh.positions,i*3);
  // An attached end belongs to the shared joint. Remove only the hemisphere
  // beyond that endpoint; retaining it produces a stub at a bent connection.
  if(trimStart&&t<1e-8||trimEnd&&t>1-1e-8){shape.curve.getPoint(t,center);shape.curve.getTangent(t,axis);const along=out.copy(point).sub(center).dot(axis);if(trimStart&&t<1e-8&&along<0||trimEnd&&t>1-1e-8&&along>0)point.addScaledVector(axis,-along);}
  deform(point,t,out,trimStart||trimEnd?caps:null);
  if(ends.length){let frame=frames.get(t);if(!frame){const origin=curve.getPoint(t),tangent=curve.getTangent(t),direction=tangent.clone(),shift=new T.Vector3();for(const end of ends){const distance=Math.abs(t-end.t)*length;if(end.band>0&&distance<end.band){const u=distance/end.band;shift.addScaledVector(end.delta,(end.t===0?1:-1)*distance*(1-u)**2);direction.addScaledVector(end.delta,(1-u)*(1-3*u));}}frame={origin,shift,rotation:new T.Quaternion().setFromUnitVectors(tangent,direction.normalize())};frames.set(t,frame);}out.sub(frame.origin).applyQuaternion(frame.rotation).add(frame.origin).add(frame.shift);}
  // Native cap vertices can bind just short of the endpoint as well as at it.
  // Clip the whole adjoining band, not only vertices whose binding is 0 or 1.
  for(const end of ends)if(Math.abs(t-end.t)*length<end.band){const excess=point.copy(out).sub(end.center).dot(end.normal);if(excess>0)out.addScaledVector(end.normal,-excess);}
  out.toArray(positions,i*3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(mesh.uv,2));geometry.setIndex(mesh.indices);geometry.computeVertexNormals();return geometry;
}
