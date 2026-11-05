import {floraBodyGeometry,floraBodyField,floraBodySurface,floraBodyExtras,floraBodyPinSurface,floraBodyJointIds,floraBodyJointRadius,floraBodyExtraTriangle} from './flora-body.js';
import {SURFACES,applySurface,surfaceTexture} from '../materials/surfaces.js';
import {canonicalFloraNodes} from './flora-node-identity.js';
import * as T from '../../vendor/three.module.js';
import {floraAsset,floraPlacementCategory} from './flora-palette.js';
import {deformFloraSkeleton,floraSkeletonDescendants,alignFloraBoneRotation,floraBoneFrameRotation} from './flora-skeleton.js';
import {skinBone,skinSolid,floraSkinGeometry,cachedFloraSkin} from './flora-skin.js';
import {floraMuscleShape,floraMuscleRadius,floraMuscleCurve,floraMuscleGeometry} from './flora-muscle.js';
import {floraVineGeometry} from './flora-vine.js';
import {buildBillboardMesh,billboardGeometry,validateBillboard} from './flora-billboards.js';
export const FLORA_PARTS={leaf:'Leaf',bark:'Root or branch'};
function orientBillboardCanopy(f,o,angle=0){const q=new T.Quaternion();floraAttachmentFrame(f,o).decompose(new T.Vector3(),q,new T.Vector3());q.invert().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle));const e=new T.Euler().setFromQuaternion(q);o.rotation=[e.x,e.y,e.z];}
export function addFloraAsset(f,branch,asset,at=.8,angle=0,target=null){const entry=floraAsset(asset);if(f.branches.find(b=>b.id===branch)?.anchor)at=0;if(!entry)throw Error('Unknown flora part.');let added;if(entry.profile){added=createBranch(f,branch,entry,at);}else{const kind=entry.category==='Leaves'?'leaf':'bark';added=createOrgan(f,branch,kind,at,angle);added.asset=asset;added.rotation=[0,angle,0];if(entry.billboard)added.billboard=structuredClone(entry.billboard);}if(target?.organ){added.parentOrgan=target.organ;if(target.surface)added.pin=structuredClone(target.surface);else added.socket=target.socket;added.mounted=true;}if(target?.branchSurface){added.at=target.at;added.branchSurface=structuredClone(target.branchSurface);if(added.branchSurface.pin&&floraAsset(f.branches.find(b=>b.id===branch)?.profile)?.nativeSkin)added.branchSurface.followFrame=true;added.mounted=true;}if(added.points){fitFloraBranch(f,added,angle);if(f.branches.length===2&&f.branches[0].anchor&&!f.organs.length&&!added.parentOrgan&&!added.branchSurface){added.id=f.branches[0].id;added.parent=null;f.branches=[added];}}else if(added.kind!=='bark')fitFloraSurfacePart(f,added);else if(floraBodyOrgan(added)){if(!f.branches.find(b=>b.id===branch).anchor)added.mounted=true;fitFloraBody(f,added);}if(entry.billboard)orientBillboardCanopy(f,added,angle);syncFloraSharedJoints(f);return added;}
const id=()=>crypto.randomUUID(),v=a=>new T.Vector3(...a);
export function defaultFlora(){
 return {branches:[{id:id(),name:'Plant origin',parent:null,at:0,anchor:true,points:[[0,0,0],[0,.05,0]],radii:[.015,.015]}],organs:[],colors:{bark:'#766044',leaf:'#ffffff'},detail:'swbf2',finishes:{}};
}
// Only structural body joints are connections. Surface decorations have none.
const socketCache=new Map();
export function floraSockets(asset){
 if(socketCache.has(asset))return socketCache.get(asset);
 const a=floraAsset(asset);if(!a?.skeleton||floraPlacementCategory(a)!=='Body presets')return [];
 const active=floraBodyJointIds(asset),sockets=a.skeleton.filter(n=>!active.size||active.has(n.id)).map(node=>{
  const parent=a.skeleton.find(n=>n.id===node.parent),direction=parent?v(node.point).sub(v(parent.point)):new T.Vector3(0,1,0);
  return {...node,direction:direction.normalize().toArray(),authored:true};
 });socketCache.set(asset,sockets);return sockets;
}
const morphCache=new WeakMap();
export function floraMorphPositions(o,positions){
 const asset=floraAsset(o.asset);if(!asset?.shapeMesh||!o.morphs||!asset.meshes.some(m=>m.positions===positions))return positions;
 const key=JSON.stringify([o.asset,o.morphs]);let cached=morphCache.get(o);
 if(!cached||cached.key!==key){cached={key,mesh:asset.shapeMesh(o.morphs)};morphCache.set(o,cached);}return cached.mesh.positions;
}
// Procedural shape controls may reveal new growth through the same texture.
export function floraMorphUV(o,uv){const asset=floraAsset(o.asset);if(!asset?.shapeMesh||!o.morphs||!asset.meshes.some(m=>m.uv===uv))return uv;floraMorphPositions(o,asset.meshes[0].positions);return morphCache.get(o).mesh.uv;}
const socketMorphBindings=new WeakMap();
export function floraSocketBasePoint(o,socket){
 const native=floraAsset(o.asset),center=v(socket.point);if(!o.morphs)return center;
 let binding=socketMorphBindings.get(socket);
 if(!binding){
  const near=[];for(const mesh of native.meshes)for(let i=0;i<mesh.positions.length;i+=3){const d=new T.Vector3().fromArray(mesh.positions,i).distanceToSquared(center);near.push({mesh,index:i,d});}
  near.sort((a,b)=>a.d-b.d);binding=near.slice(0,8).map(n=>({...n,weight:1/Math.max(1e-10,n.d**2)}));socketMorphBindings.set(socket,binding);
 }
 const delta=new T.Vector3(),point=new T.Vector3(),original=new T.Vector3();let total=0;
 for(const {mesh,index,weight} of binding){point.fromArray(floraMorphPositions(o,mesh.positions),index);original.fromArray(mesh.positions,index);delta.addScaledVector(point.sub(original),weight);total+=weight;}
 return total?center.addScaledVector(delta,1/total):center;
}
// Editable controls deform procedural wood in its local coordinates.
export function floraSocketPose(o,socket){const c=o.controls?.[socket.id];return {point:floraSocketBasePoint(o,socket).add(v(c?.offset||[0,0,0])).toArray(),rotation:c?.rotation||[0,0,0],scale:c?.scale||[1,1,1]};}
// Body presets use structural joint hierarchies; single stems use axial sections.
export function floraConnectionSockets(asset){const a=floraAsset(asset);return a&&floraPlacementCategory(a)==='Body presets'?floraSockets(asset):[];}
export function floraEditableSections(asset){return floraConnectionSockets(asset);}
export function floraDeformPositions(o,positions){
 positions=floraMorphPositions(o,positions);const skeleton=floraAsset(o.asset)?.skeleton;
 return skeleton&&o.controls?deformFloraSkeleton(skeleton,o.controls,positions):positions;
}
function floraSocketRotation(o,socket,control){
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(...control.rotation)),asset=floraAsset(o.asset);let previous;
 if(asset.skeleton&&socket.parent)previous=floraSockets(o.asset).find(s=>s.id===socket.parent);
 if(previous){rotation.copy(floraBoneFrameRotation(previous,socket,o.controls));}
 return rotation.multiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v(socket.direction)));
}
const branchPinCache=new WeakMap();
// Full triangle frames inherit the host's affine scale, so nested stalk tips
// remain part of the same vessel when that vessel is resized.
export function floraBranchSurfaceFrame(f,branch,at,angle,pin=null,followFrame=false){if(pin){const b=f.branches.find(b=>b.id===branch),caps=floraBranchCaps(f,b),key=JSON.stringify([b.profile,b.points,b.radii,b.jointRotations,b.childRotation,caps]);let data=branchPinCache.get(b);if(data?.key!==key){const geometry=floraMuscleGeometry(b,caps);data={key,positions:geometry.attributes.position.array,indices:geometry.index.array};geometry.dispose();branchPinCache.set(b,data);}const frame=floraAttachmentFrame(f,b),points=[0,1,2].map(i=>{const p=new T.Vector3().fromArray(data.positions,data.indices[pin.triangle*3+i]*3);return followFrame?p:p.applyMatrix4(frame);}),point=new T.Vector3();for(let i=0;i<3;i++)point.addScaledVector(points[i],pin.bary[i]);const edge=points[1].clone().sub(points[0]).normalize(),normal=edge.clone().cross(points[2].clone().sub(points[0])).normalize(),rotation=followFrame?new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(edge,normal,edge.clone().cross(normal))):new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal);const surface=new T.Matrix4().compose(point,rotation,new T.Vector3(1,1,1));return followFrame?frame.multiply(surface):surface;}const b=f.branches.find(b=>b.id===branch),curve=floraCurve(f,branch),frames=curve.computeFrenetFrames(64,false),x=at*64,i=Math.min(63,Math.floor(x)),normal=frames.normals[i].clone().lerp(frames.normals[i+1],x-i).normalize(),tangent=curve.getTangentAt(at),frame=floraAttachmentFrame(f,b),localTangent=tangent.clone().transformDirection(frame.clone().invert()),t=curve.getUtoTmapping(at),joint=Object.keys(b.jointRotations||{}).map(Number).filter(i=>i<=t*(b.points.length-1)+1e-8).sort((a,b)=>b-a)[0],rotation=new T.Quaternion().setFromEuler(new T.Euler(...(b.jointRotations?.[joint]||b.childRotation||[0,0,0]))),neutral=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),localTangent),oriented=rotation.clone().multiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),localTangent.clone().applyQuaternion(rotation.clone().invert()))),parentRotation=new T.Quaternion();frame.decompose(new T.Vector3(),parentRotation,new T.Vector3());normal.applyQuaternion(parentRotation.clone().multiply(oriented).multiply(neutral.invert()).multiply(parentRotation.clone().invert()));const binormal=tangent.clone().cross(normal).normalize(),direction=normal.multiplyScalar(Math.cos(angle)).addScaledVector(binormal,Math.sin(angle)).normalize(),profile=floraAsset(b.profile)?.profile,radius=floraBranchScale(f,b)*floraBranchRadius(b,t);return new T.Matrix4().compose(curve.getPointAt(at).addScaledVector(direction,radius),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction),new T.Vector3(1,1,1));}
function visit(seen,id){if(seen.has(id))throw Error('Invalid plant attachment hierarchy.');const next=new Set(seen);next.add(id);return next;}
export function floraAttachmentFrame(f,node,seen=new Set()){
 let depth=floraSharedJoint(f,node)?0:node.depth||0;
 // A reduced skin can sit just inside its native control surface. Keep the
 // existing contact inset generous enough to cover that approximation, while
 // exact native skins retain their authored surface pins and depth.
 if(depth&&f.detail==='swbf2'&&node.branchSurface?.pin){const parent=f.branches.find(b=>b.id===(node.points?node.parent:node.branch));if(!floraAsset(parent?.profile)?.nativeSkin)depth*=1.5;}
 return attachmentFrame(f,node,seen).multiply(new T.Matrix4().makeTranslation(0,-depth,0));
}
function attachmentFrame(f,node,seen=new Set()){
 if(node.parentOrgan){const parent=f.organs.find(o=>o.id===node.parentOrgan);if(node.pin){const source=floraAsset(parent.asset).meshes[node.pin.mesh],positions=floraDeformPositions(parent,source.positions),index=source.indices.slice(node.pin.triangle*3,node.pin.triangle*3+3),points=index.map(i=>new T.Vector3().fromArray(positions,i*3)),point=new T.Vector3();for(let i=0;i<3;i++)point.addScaledVector(points[i],node.pin.bary[i]);const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();if(floraBodyOrgan(parent)){const joins=floraBodyCaps(f,parent),surface=floraBodyField(parent,joins)?floraBodyPinSurface(parent,node.pin,joins):floraBodySurface(parent,point,joins);point.copy(surface.point);normal.copy(surface.normal);}const frame=floraOrganMatrix(f,parent,seen).multiply(new T.Matrix4().compose(point,new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal),new T.Vector3(1,1,1)));if(node.asset&&floraAsset(node.asset)?.placement?.upright){const position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();frame.decompose(position,rotation,scale);return new T.Matrix4().compose(position,new T.Quaternion(),scale);}return frame;}const socket=parent&&floraSockets(parent.asset).find(s=>s.id===node.socket);if(!socket)throw Error('Invalid plant socket.');
  const control=floraSocketPose(parent,socket);return floraOrganMatrix(f,parent,seen).multiply(new T.Matrix4().compose(v(control.point),floraSocketRotation(parent,socket,control),new T.Vector3(1,1,1)));
 }
 const parentId=node.points?node.parent:node.branch;if(!parentId)return new T.Matrix4();if(node.branchSurface)return floraBranchSurfaceFrame(f,parentId,node.at,node.branchSurface.angle,node.branchSurface.pin,node.branchSurface.followFrame);const parent=f.branches.find(b=>b.id===parentId),curve=floraCurve(f,parentId,seen),point=curve.getPoint(node.at);
 if(parent.anchor)return new T.Matrix4().makeTranslation(...point.toArray());
 const frame=floraAttachmentFrame(f,parent,visit(seen,parentId)),inverse=frame.clone().invert(),localPoint=point.clone().applyMatrix4(inverse),x=node.at*(parent.points.length-1),index=Math.round(x),onJoint=Math.abs(x-index)<1e-7;
 const rotations=parent.jointRotations||{},earlier=Object.keys(rotations).map(Number).filter(i=>onJoint?i<index:i<=x).sort((a,b)=>b-a)[0],incoming=new T.Quaternion().setFromEuler(new T.Euler(...(rotations[earlier]||parent.childRotation||[0,0,0]))),relative=incoming.clone().invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(...(onJoint&&rotations[index]||rotations[earlier]||parent.childRotation||[0,0,0]))));
 const tangent=onJoint&&index>0?v(parent.points[index]).sub(v(parent.points[index-1])).normalize():curve.getTangent(node.at).transformDirection(inverse),q=alignFloraBoneRotation(incoming,new T.Vector3(0,1,0),tangent).multiply(relative);
 return frame.multiply(new T.Matrix4().compose(localPoint,q,new T.Vector3(1,1,1)));
}
export function floraOrganMatrix(f,o,seen=new Set()){const rotation=new T.Quaternion().setFromEuler(new T.Euler(...o.rotation));if(o.mounted&&o.asset){const forward=floraBodyOrgan(o)||floraAsset(o.asset).editorAxis==='z-to-y'?new T.Vector3(0,1,0):new T.Vector3(0,0,1);rotation.multiply(new T.Quaternion().setFromUnitVectors(forward,new T.Vector3(0,1,0)));}return floraAttachmentFrame(f,o,visit(seen,o.id)).multiply(new T.Matrix4().compose(floraSharedJoint(f,o)?new T.Vector3():v(o.offset),rotation,v(o.scale))).multiply(new T.Matrix4().makeTranslation(...floraOrganOrigin(o).negate().toArray()));}
export function floraCurve(f,branchId,seen=new Set()){
 const b=f.branches.find(b=>b.id===branchId);if(!b)throw Error('Invalid plant branch hierarchy.');const frame=floraAttachmentFrame(f,b,visit(seen,branchId)),local=b.anchor?new T.LineCurve3(v(b.points[0]),v(b.points[1])):floraMuscleCurve(b),curve=new T.Curve();curve.getPoint=(t,target=new T.Vector3())=>local.getPoint(t,target).applyMatrix4(frame);curve.getTangent=(t,target=new T.Vector3())=>local.getTangent(t,target).transformDirection(frame);return curve;
}
export function floraBranchScale(f,b){return Math.cbrt(Math.abs(floraAttachmentFrame(f,b).determinant()));}
export function floraBranchRadius(b,t){return floraRadius(b,t)*floraMuscleRadius(b.profile,t);}
export function floraRadius(b,t){const n=b.radii.length-1,x=T.MathUtils.clamp(t,0,1)*n,i=Math.min(n-1,Math.floor(x));return T.MathUtils.lerp(b.radii[i],b.radii[i+1],x-i);}
export function floraOrganOrigin(o){const root=o.mounted&&floraBodyOrgan(o)&&floraSockets(o.asset).find(n=>!n.parent);return root?v(root.point):new T.Vector3();}
export function floraOrganPosition(f,o){return floraOrganOrigin(o).applyMatrix4(floraOrganMatrix(f,o));}
// A snapped structural base is an alias of the existing joint, not a new
// movable node connected by an invented length of trunk.
export function floraSharedJoint(f,node){
 if(!node||(!node.points&&(!floraBodyOrgan(node)||!floraSockets(node.asset).length))||node.pin||node.branchSurface)return null;
 if(node.parentOrgan){const parent=f.organs.find(o=>o.id===node.parentOrgan);return parent&&node.socket?{organ:parent.id,branch:parent.branch,socket:node.socket}:null;}
 const parent=f.branches.find(b=>b.id===(node.points?node.parent:node.branch));if(!parent||parent.anchor)return null;
 const index=Math.round(node.at*(parent.points.length-1));return Math.abs(index/(parent.points.length-1)-node.at)<1e-7?{branch:parent.id,index}:null;
}
export function floraJointSelection(f,selection){
 let s=selection;const seen=new Set();
 while(s){const node=s.organ?f.organs.find(o=>o.id===s.organ):f.branches.find(b=>b.id===s.branch),root=s.organ?floraSockets(node?.asset).find(n=>!n.parent):null;
  if(!node||seen.has(node.id)||!(s.organ?s.socket===root?.id:s.index===0))return s;seen.add(node.id);const shared=floraSharedJoint(f,node);if(!shared)return s;s=shared;
 }return selection;
}
function fitFloraBody(f,o){
 const shared=floraSharedJoint(f,o);if(!shared)return o;
 const root=floraSockets(o.asset).find(n=>!n.parent);if(!root)return o;
 let radius;if(shared.organ){const parent=f.organs.find(n=>n.id===shared.organ);radius=floraBodyJointRadius(parent.asset,shared.socket)*Math.cbrt(floraSocketPose(parent,floraSockets(parent.asset).find(n=>n.id===shared.socket)).scale.reduce((a,b)=>a*b,1));}else{const parent=f.branches.find(n=>n.id===shared.branch);radius=floraBranchRadius(parent,shared.index/(parent.points.length-1));}
 const scale=T.MathUtils.clamp(radius/floraBodyJointRadius(o.asset,root.id),.1,10);o.scale=[scale,scale,scale];o.mounted=true;return o;
}
export function syncFloraSharedJoints(f){
 const nodes=new Map([...f.branches,...f.organs].map(n=>[n.id,n])),done=new Set(),visiting=new Set();
 const sync=node=>{if(done.has(node.id))return;if(visiting.has(node.id))throw Error('Invalid plant attachment hierarchy.');visiting.add(node.id);
  const shared=floraSharedJoint(f,node);if(shared){const parent=nodes.get(shared.organ||shared.branch);sync(parent);let radius;
   // Both halves inherit the same attachment frame. Work in that shared local
   // space: dividing world determinants introduced rounding changes on every
   // ancestor rotation and needlessly rebuilt the entire downstream canopy.
   if(shared.organ){const socket=floraSockets(parent.asset).find(s=>s.id===shared.socket),pose=floraSocketPose(parent,socket);radius=floraBodyJointRadius(parent.asset,socket.id)*Math.cbrt(pose.scale.reduce((a,b)=>a*b,1));}
   else radius=floraBranchRadius(parent,shared.index/(parent.points.length-1));
   delete node.depth;
   if(node.points){node.points[0]=[0,0,0];node.radii[0]=T.MathUtils.clamp(radius/floraMuscleRadius(node.profile,0),1e-6,1e4);}
   else{node.offset=[0,0,0];node.mounted=true;const root=floraSockets(node.asset).find(n=>!n.parent),local=radius/(Math.cbrt(node.scale.reduce((a,b)=>a*b,1))*floraBodyJointRadius(node.asset,root.id)),scale=T.MathUtils.clamp(local,1e-6,1e4);(node.controls||={})[root.id]={offset:[0,0,0],rotation:[0,0,0],scale:[scale,scale,scale]};}
  }visiting.delete(node.id);done.add(node.id);
 };for(const node of nodes.values())sync(node);return f;
}
function createBranch(f,parent,entry,at){
 if(f.branches.length>=24)throw Error('Maximum 24 branches per plant.');
 const shape=floraMuscleShape(entry.id),b={id:id(),name:entry.name.replaceAll('_',' '),parent,at,profile:entry.id,nativeShape:true,points:[0,1].map(t=>shape.curve.getPoint(t).multiplyScalar(shape.length).toArray()),radii:[0,1].map(()=>shape.length*shape.maxRadius)};
 f.branches.push(b);return b;
}
// Closest-point roundoff at triangle edges must not invalidate a surface pin.
export function floraPinWeights(bary){const weights=bary.toArray().map(x=>T.MathUtils.clamp(x,0,1)),sum=weights.reduce((a,b)=>a+b,0);return weights.map(x=>x/sum);}
export function floraSurfaceTarget(f,target){if(!target||target.free||target.surface||target.branchSurface)return target;if(!target.organ){const b=f.branches.find(b=>b.id===target.branch);if(!b||b.anchor)return target;const lengths=floraCurve(f,b.id).getLengths(),x=T.MathUtils.clamp(target.at??0,0,1)*(lengths.length-1),i=Math.min(lengths.length-2,Math.floor(x)),at=T.MathUtils.lerp(lengths[i],lengths[i+1],x-i)/lengths.at(-1);return {...target,at,branchSurface:{angle:0}};}const o=f.organs.find(o=>o.id===target.organ);if(!o)return target;const socket=floraSockets(o.asset).find(s=>s.id===target.socket);if(!socket)return target;const point=v(floraSocketPose(o,socket).point);let best=null,distance=Infinity;for(const [mi,mesh] of floraAsset(o.asset).meshes.entries()){const positions=floraDeformPositions(o,mesh.positions);for(let i=0;i<mesh.indices.length;i+=3){if(floraBodyExtraTriangle(o.asset,mi,i/3))continue;const p=mesh.indices.slice(i,i+3).map(x=>new T.Vector3().fromArray(positions,x*3)),triangle=new T.Triangle(...p),closest=triangle.closestPointToPoint(point,new T.Vector3()),d=closest.distanceToSquared(point);if(d<distance){const bary=triangle.getBarycoord(closest,new T.Vector3());if(!bary)continue;distance=d;best={mesh:mi,triangle:i/3,bary:floraPinWeights(bary)};}}}return best?{branch:target.branch,at:target.at,organ:target.organ,surface:best}:target;}
export function fitFloraBranch(f,b,angle=Math.atan2(b.points.at(-1)[2],b.points.at(-1)[0])){const parent=f.branches.find(p=>p.id===b.parent);let radius=.3,continuation=!b.branchSurface&&b.at>.98;if(b.parentOrgan){const o=f.organs.find(o=>o.id===b.parentOrgan),a=floraAsset(o.asset),bounds=new T.Box3();for(const mesh of a.meshes)for(let i=0;i<mesh.positions.length;i+=3)bounds.expandByPoint(new T.Vector3().fromArray(mesh.positions,i));const span=bounds.getSize(new T.Vector3());radius=T.MathUtils.clamp(Math.min(span.x,span.y,span.z)*.3,.06,.6);const socket=floraSockets(o.asset).find(s=>s.id===b.socket);if(socket)radius=floraBodyJointRadius(o.asset,socket.id)*Math.cbrt(floraSocketPose(o,socket).scale.reduce((a,b)=>a*b,1));continuation=!!b.socket&&!a.skeleton.some(n=>n.parent===b.socket);}else if(!parent.anchor){const t=b.branchSurface?floraCurve(f,parent.id).getUtoTmapping(b.at):b.at;radius=floraBranchRadius(parent,t)*(b.branchSurface?floraBranchScale(f,parent):1)*(continuation?1:.7);}else continuation=true;
 radius=T.MathUtils.clamp(radius,.03,.8);const shape=floraMuscleShape(b.profile),first=parent.anchor&&!b.parentOrgan,length=first?shape.length:T.MathUtils.clamp(radius/shape.radii[0],.3,8),girth=first?length*shape.maxRadius:radius*shape.maxRadius/shape.radii[0],rotation=continuation?new T.Quaternion():new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.cos(angle)*.7,1,Math.sin(angle)*.7).normalize());const ats=shape.joints?Array.from({length:shape.joints},(_,i)=>i/(shape.joints-1)):[0,1];b.points=ats.map(t=>shape.curve.getPoint(t).multiplyScalar(length).applyQuaternion(rotation).toArray());b.radii=ats.map(()=>girth);return b;}
// Only newly placed foliage is fitted; existing plants keep their authored sizing.
export function fitFloraSurfacePart(f,o){
 const parent=f.branches.find(b=>b.id===o.branch);let radius;
 if(o.parentOrgan){
  const wood=f.organs.find(p=>p.id===o.parentOrgan),asset=floraAsset(wood?.asset);if(!asset)return o;
  const bounds=new T.Box3();for(const mesh of asset.meshes)for(let i=0;i<mesh.positions.length;i+=3)bounds.expandByPoint(new T.Vector3().fromArray(mesh.positions,i));
  radius=Math.min(...bounds.getSize(new T.Vector3()).toArray())*.25;
  if(asset.skeleton){
   const point=new T.Vector3().setFromMatrixPosition(floraOrganMatrix(f,wood).invert().multiply(floraAttachmentFrame(f,o))),poses=new Map(asset.skeleton.map(n=>[n.id,floraSocketPose(wood,n)]));let nearest=Infinity;
   for(const end of asset.skeleton){
    const start=asset.skeleton.find(n=>n.id===end.parent);if(!start)continue;const a=poses.get(start.id),b=poses.get(end.id),line=new T.Line3(v(a.point),v(b.point)),t=line.closestPointToPointParameter(point,true),distance=line.at(t,new T.Vector3()).distanceToSquared(point);
    if(distance<nearest){nearest=distance;const girth=n=>n.scale.reduce((a,x)=>a*x,1)**(1/3);radius=T.MathUtils.lerp(start.radius*girth(a),end.radius*girth(b),t);}
   }
   radius*=Math.cbrt(Math.abs(floraOrganMatrix(f,wood).determinant()/floraAttachmentFrame(f,o).determinant()));
  }
 }else if(parent&&!parent.anchor){
  const t=o.branchSurface?floraCurve(f,parent.id).getUtoTmapping(o.at):o.at,profile=floraAsset(parent.profile)?.profile;
  radius=floraBranchRadius(parent,t)*(o.branchSurface?floraBranchScale(f,parent):1);
 }else return o;
 const desired=T.MathUtils.clamp(radius*8,.5,2.5);
 let size=1;
 if(o.asset){const bounds=new T.Box3();for(const mesh of floraAsset(o.asset).meshes)for(let i=0;i<mesh.positions.length;i+=3)bounds.expandByPoint(new T.Vector3().fromArray(mesh.positions,i));size=Math.max(...bounds.getSize(new T.Vector3()).toArray());}
 const scale=T.MathUtils.clamp(desired/Math.max(.01,size),.1,10);o.scale=[scale,scale,scale];return o;
}
export function deformFloraStemControl(o,previous,socketId,position,rotation,scale,mode){const socket=floraSockets(o.asset).find(s=>s.id===socketId),old=floraSocketPose(previous,socket),rest=floraSocketBasePoint(o,socket);o.controls=structuredClone(previous.controls||{});o.controls[socketId]={offset:v(position).sub(rest).toArray(),rotation:[...rotation],scale:[...scale]};if(mode==='scale')return;const delta=v(position).sub(v(old.point)),q=new T.Quaternion().setFromEuler(new T.Euler(...rotation)).multiply(new T.Quaternion().setFromEuler(new T.Euler(...old.rotation)).invert());const skeleton=floraAsset(o.asset)?.skeleton,descendants=floraSkeletonDescendants(skeleton,socketId);for(const child of floraSockets(o.asset).filter(s=>s.id!==socketId&&descendants.has(s.id))){const prior=floraSocketPose(previous,child),p=v(prior.point),r=new T.Quaternion().setFromEuler(new T.Euler(...prior.rotation));if(mode==='translate')p.add(delta);else{p.sub(v(old.point)).applyQuaternion(q).add(v(old.point));r.premultiply(q);}const e=new T.Euler().setFromQuaternion(r);o.controls[child.id]={offset:p.sub(floraSocketBasePoint(o,child)).toArray(),rotation:[e.x,e.y,e.z],scale:prior.scale};}}
function createOrgan(f,branch,kind='leaf',at=.8,angle=0){if(f.organs.length>=160)throw Error('Maximum 160 foliage parts per plant.');if(!FLORA_PARTS[kind])throw Error('Unknown foliage part.');const o={id:id(),branch,kind,at,offset:[0,0,0],rotation:[0,angle,-.35],scale:[1,1,1]};f.organs.push(o);return o;}
// Stable descendants are retained when changing a node's attachment.
export function floraSubtreeIds(f,partId){const ids=new Set([partId]);let count;do{count=ids.size;for(const n of [...f.branches,...f.organs])if(ids.has(n.parentOrgan||n.parent||n.branch))ids.add(n.id);}while(count!==ids.size);return ids;}
// Socket children retain a branch owner for selection and serialization. Moving
// their object group must update that owner too, even though the visible transform
// follows parentOrgan. Otherwise deleting the former host strands valid limbs.
function updateFloraBranchOwners(f){
 const nodes=new Map([...f.branches,...f.organs].map(n=>[n.id,n])),done=new Set(),visiting=new Set();
 const owner=n=>{if(!n)throw Error('Invalid plant attachment hierarchy.');if(done.has(n.id))return n.points?n.parent:n.branch;if(visiting.has(n.id))throw Error('Invalid plant attachment hierarchy.');visiting.add(n.id);if(n.parentOrgan){const branch=owner(nodes.get(n.parentOrgan));if(n.points)n.parent=branch;else n.branch=branch;}visiting.delete(n.id);done.add(n.id);return n.points?n.parent:n.branch;};
 for(const node of nodes.values())owner(node);
 const branches=new Map(f.branches.map(b=>[b.id,b])),ordered=[],seen=new Set(),pending=new Set();
 const append=b=>{if(!b||pending.has(b.id))throw Error('Invalid plant branch hierarchy.');if(seen.has(b.id))return;pending.add(b.id);if(b.parent)append(branches.get(b.parent));pending.delete(b.id);seen.add(b.id);ordered.push(b);};
 for(const branch of f.branches)append(branch);f.branches=ordered;
}
export function reattachFloraPart(f,partId,target){
 const node=[...f.organs,...f.branches].find(n=>n.id===partId),blocked=floraSubtreeIds(f,partId);
 if(!node||node===f.branches[0]||!target||blocked.has(target.organ||target.branch))throw Error('Choose wood outside this branch.');
 const snapshot=structuredClone(f),backup=structuredClone(node);try{
  delete node.depth;delete node.parentOrgan;delete node.socket;delete node.pin;delete node.branchSurface;
  if(node.points)node.parent=target.branch;else node.branch=target.branch;
  node.at=target.at??0;
  if(target.organ){node.parentOrgan=target.organ;if(target.surface)node.pin=structuredClone(target.surface);else node.socket=target.socket;}
  if(target.branchSurface)node.branchSurface=structuredClone(target.branchSurface);
  if(node.points){node.points=node.points.map(p=>v(p).sub(v(backup.points[0])).toArray());}else{node.offset=[0,0,0];if(node.asset){node.mounted=true;}}
  updateFloraBranchOwners(f);syncFloraSharedJoints(f);validateFlora(f);return node;
 }catch(error){const originals=new Map([...f.branches,...f.organs].map(n=>[n.id,n]));for(const saved of [...snapshot.branches,...snapshot.organs]){const original=originals.get(saved.id);for(const key of Object.keys(original))delete original[key];Object.assign(original,saved);}f.branches=snapshot.branches.map(n=>originals.get(n.id));f.organs=snapshot.organs.map(n=>originals.get(n.id));throw error;}
}
// Pinning follows the bark and preserves the part's visible size and insertion.
// Its children remain attached to the same part, so an entire twig can be moved.
export function slideFloraPart(f,partId,target){
 const node=f.organs.find(o=>o.id===partId);if(!node||!(target?.surface||target?.branchSurface))throw Error('Choose a bark surface.');
 const old=structuredClone(node),matrix=floraOrganMatrix(f,node),lengths=[0,1,2].map(i=>new T.Vector3().setFromMatrixColumn(matrix,i).length());
 try{
  reattachFloraPart(f,partId,target);if(old.depth!==undefined)node.depth=old.depth;
  const moved=floraOrganMatrix(f,node);
  node.scale=node.scale.map((value,i)=>T.MathUtils.clamp(value*lengths[i]/Math.max(1e-8,new T.Vector3().setFromMatrixColumn(moved,i).length()),.1,10));
  syncFloraSharedJoints(f);validateFlora(f);return node;
 }catch(error){for(const key of Object.keys(node))delete node[key];Object.assign(node,old);throw error;}
}
export function duplicateFloraSubtree(f,partId){
 const root=[...f.organs,...f.branches].find(n=>n.id===partId);if(!root||root===f.branches[0])throw Error('Select a branch or part.');
 const ids=floraSubtreeIds(f,partId),branches=f.branches.filter(n=>ids.has(n.id)),organs=f.organs.filter(n=>ids.has(n.id));
 if(f.branches.length+branches.length>24||f.organs.length+organs.length>160)throw Error('This copy exceeds the plant part limit.');
 const mapping=new Map([...ids].map(old=>[old,id()])),copy=n=>{const clone=structuredClone(n);clone.id=mapping.get(n.id);for(const key of ['branch','parent','parentOrgan'])if(mapping.has(clone[key]))clone[key]=mapping.get(clone[key]);return clone;};
 f.branches.push(...branches.map(copy));f.organs.push(...organs.map(copy));validateFlora(f);return [...f.branches,...f.organs].find(n=>n.id===mapping.get(partId));
}
export function replaceFloraAsset(f,partId,assetId){
 const node=f.organs.find(o=>o.id===partId),asset=floraAsset(assetId),kind=asset?.category==='Leaves'?'leaf':'bark';
 if(!node||!asset||asset.profile||node.kind!==kind||floraPlacementCategory(asset)!==floraPlacementCategory(floraAsset(node.asset))||floraSockets(node.asset).length&&!floraSockets(assetId).length)throw Error('Choose a compatible part.');if(node.asset===assetId)return node;
 const snapshot=structuredClone(f);try{
  const children=[...f.organs,...f.branches].filter(n=>n.parentOrgan===node.id),anchors=new Map(children.map(n=>[n.id,new T.Vector3().setFromMatrixPosition(attachmentFrame(f,n))])),barkPins=new Set(children.filter(n=>n.pin&&!floraBodyExtraTriangle(node.asset,n.pin.mesh,n.pin.triangle)).map(n=>n.id));
  node.asset=assetId;delete node.morphs;delete node.controls;delete node.billboard;if(asset.billboard)node.billboard=structuredClone(asset.billboard);const inverse=floraOrganMatrix(f,node).invert();
  for(const child of children){const point=anchors.get(child.id).applyMatrix4(inverse);if(child.pin){let best=null,distance=Infinity;for(const [mi,mesh] of asset.meshes.entries()){const positions=floraDeformPositions(node,mesh.positions);for(let i=0;i<mesh.indices.length;i+=3){if(barkPins.has(child.id)&&floraBodyExtraTriangle(assetId,mi,i/3))continue;const p=mesh.indices.slice(i,i+3).map(x=>new T.Vector3().fromArray(positions,x*3)),triangle=new T.Triangle(...p),closest=triangle.closestPointToPoint(point,new T.Vector3()),d=closest.distanceToSquared(point);if(d<distance){const bary=triangle.getBarycoord(closest,new T.Vector3());if(!bary)continue;distance=d;best={mesh:mi,triangle:i/3,bary:floraPinWeights(bary)};}}}if(!best)throw Error('This mesh cannot hold the attachment.');child.pin=best;}else{const sockets=floraSockets(assetId);if(!sockets.length)throw Error('This part has no connections.');child.socket=sockets.reduce((a,b)=>v(b.point).distanceToSquared(point)<v(a.point).distanceToSquared(point)?b:a).id;}}
  syncFloraSharedJoints(f);validateFlora(f);return node;
 }catch(error){Object.assign(f,snapshot);throw error;}
}
export function removeFloraPart(f,partId){if(partId===f.branches[0].id)return false;const ids=new Set([partId]);let n;do{n=ids.size;for(const b of f.branches)if(ids.has(b.parentOrgan||b.parent))ids.add(b.id);for(const o of f.organs)if(ids.has(o.parentOrgan||o.branch))ids.add(o.id);}while(ids.size!==n);f.branches=f.branches.filter(b=>!ids.has(b.id));f.organs=f.organs.filter(o=>!ids.has(o.id));return true;}
export function removeFloraBranch(f,branch){return removeFloraPart(f,branch);}
export function removeFloraJoint(f,branchId,index){
 const b=f.branches.find(b=>b.id===branchId);if(!b||b.anchor||!Number.isInteger(index)||index<=0||index>=b.points.length||b.points.length<=2)return false;
 const snapshot=structuredClone(f),count=b.points.length,curve=floraCurve(f,b.id),children=[...f.branches,...f.organs].filter(n=>!n.parentOrgan&&(n.parent||n.branch)===b.id),parameters=new Map(children.map(n=>[n.id,n.branchSurface?curve.getUtoTmapping(n.at):n.at]));
 try{
  b.points.splice(index,1);b.radii.splice(index,1);
  if(b.jointRotations)b.jointRotations=Object.fromEntries(Object.entries(b.jointRotations).filter(([i])=>+i!==index).map(([i,r])=>[+i>index?+i-1:+i,r]));
  const lengths=floraCurve(f,b.id).getLengths();
  for(const n of children){
   const x=parameters.get(n.id)*(count-1),k=x<=index-1?x:x>=index+1?x-1:index===count-1?index-1:index-1+(x-index+1)/2,t=T.MathUtils.clamp(k/(count-2),0,1);
   if(n.branchSurface){const x=t*(lengths.length-1),i=Math.min(lengths.length-2,Math.floor(x));n.at=T.MathUtils.lerp(lengths[i],lengths[i+1],x-i)/lengths.at(-1);}else n.at=t;
  }
  validateFlora(f);return true;
 }catch(error){Object.assign(f,snapshot);throw error;}
}
export function validateFlora(f){
 const bad=()=>{throw Error('Invalid flora data.');},vec=(a,min,max)=>Array.isArray(a)&&a.length===3&&a.every(x=>Number.isFinite(x)&&x>=min&&x<=max);
 if(!f||!Array.isArray(f.branches)||!f.branches.length||f.branches.length>24||!Array.isArray(f.organs)||f.organs.length>160||!['low','standard','swbf2'].includes(f.detail)||!f.colors||!['bark','leaf'].every(k=>/^#[0-9a-f]{6}$/i.test(f.colors[k])))bad();const ids=new Set();
 for(const [i,b] of f.branches.entries()){if(!b||typeof b.id!=='string'||b.id.length>100||ids.has(b.id)||typeof b.name!=='string'||b.name.length>60||!Number.isFinite(b.at)||b.at<0||b.at>1||(i===0?b.parent!==null:!ids.has(b.parent))||!Array.isArray(b.points)||b.points.length<2||b.points.length>8||!b.points.every(a=>vec(a,-40,40))||!Array.isArray(b.radii)||b.radii.length!==b.points.length||!b.radii.every((r,j)=>Number.isFinite(r)&&(j===0&&floraSharedJoint(f,b)?r>=1e-6&&r<=1e4:r>=.015&&r<=4)))bad();if(b.childRotation!==undefined&&!vec(b.childRotation,-Math.PI*8,Math.PI*8))bad();if(b.jointRotations!==undefined){if(!b.jointRotations||typeof b.jointRotations!=='object'||Array.isArray(b.jointRotations))bad();for(const [i,r] of Object.entries(b.jointRotations))if(!/^[0-7]$/.test(i)||+i>=b.points.length||!vec(r,-Math.PI*8,Math.PI*8))bad();}if(b.anchor!==undefined&&(b.anchor!==true||i!==0||b.parent!==null))bad();if(!b.anchor&&(!floraMuscleShape(b.profile)||b.nativeShape!==true))bad();if(i&&b.points[0].some(x=>x!==0))bad();if(b.points.slice(1).some((p,j)=>v(p).distanceTo(v(b.points[j]))<.03))bad();ids.add(b.id);}
 if(f.finishes!==undefined){if(!f.finishes||Array.isArray(f.finishes)||typeof f.finishes!=='object')bad();for(const [k,x] of Object.entries(f.finishes))if(!['bark','leaf'].includes(k)||!x||!SURFACES.some(s=>s.id===x.preset)||!Number.isFinite(x.scale)||x.scale<.1||x.scale>8)bad();}
 for(const o of f.organs){const asset=floraAsset(o?.asset);if(o?.billboard!==undefined){if(!asset?.billboard)bad();validateBillboard(o.billboard);}}
 const organs=new Set();for(const o of f.organs){if(!o||typeof o.id!=='string'||o.id.length>100||organs.has(o.id)||ids.has(o.id)||!ids.has(o.branch)||!FLORA_PARTS[o.kind]||!Number.isFinite(o.at)||o.at<0||o.at>1||!vec(o.offset,-40,40)||!vec(o.rotation,-Math.PI*8,Math.PI*8)||!vec(o.scale,.1,10))bad();{const a=floraAsset(o.asset),kind=a?.category==='Leaves'?'leaf':'bark';if(!a||a.profile||o.kind!==kind)bad();}if(o.controls!==undefined){if(!floraBodyOrgan(o)||!o.controls||typeof o.controls!=='object'||Array.isArray(o.controls))bad();for(const [id,c] of Object.entries(o.controls))if(!floraSockets(o.asset).some(s=>s.id===id)||!c||!vec(c.offset,-40,40)||!vec(c.rotation,-Math.PI*8,Math.PI*8)||!vec(c.scale,...(floraSharedJoint(f,o)&&id===floraSockets(o.asset).find(n=>!n.parent)?.id?[1e-6,1e4]:[.1,10])))bad();}if(o.mounted!==undefined&&typeof o.mounted!=='boolean')bad();if(o.morphs!==undefined){if(!o.morphs||typeof o.morphs!=='object'||Array.isArray(o.morphs))bad();for(const [id,x] of Object.entries(o.morphs))if(!(floraAsset(o.asset)?.shapeControls||[]).some(c=>c.id===id)||!Number.isFinite(x)||x<0||x>1)bad();}organs.add(o.id);}const nodes=new Map([...f.branches,...f.organs].map(n=>[n.id,n]));for(const n of nodes.values()){if(n.depth!==undefined&&(!Number.isFinite(n.depth)||n.depth<0||n.depth>4||!(n.parentOrgan||n.branchSurface)))bad();if(n.branchSurface){const parent=nodes.get(n.points?n.parent:n.branch);if(n.parentOrgan||n.pin||!parent?.points||parent.anchor||!Number.isFinite(n.branchSurface.angle)||Math.abs(n.branchSurface.angle)>Math.PI*2)bad();}if(n.branchSurface?.followFrame!==undefined&&typeof n.branchSurface.followFrame!=='boolean')bad();if(n.branchSurface?.pin){const parent=nodes.get(n.points?n.parent:n.branch),mesh=parent?.nativeShape&&floraMuscleShape(parent.profile)?.mesh,pin=n.branchSurface.pin;if(!mesh||!Number.isInteger(pin.triangle)||pin.triangle<0||pin.triangle*3+2>=mesh.indices.length||!vec(pin.bary,0,1)||Math.abs(pin.bary.reduce((a,b)=>a+b,0)-1)>1e-6)bad();}if(n.parentOrgan!==undefined){const parent=nodes.get(n.parentOrgan);if(!parent||parent.kind!=='bark'&&!(n.pin&&floraAsset(parent.asset)?.surfaceHost))bad();if(n.pin){const mesh=floraAsset(parent.asset)?.meshes[n.pin.mesh];if(n.socket!==undefined||!mesh||!Number.isInteger(n.pin.mesh)||!Number.isInteger(n.pin.triangle)||n.pin.triangle<0||n.pin.triangle*3+2>=mesh.indices.length||!vec(n.pin.bary,0,1)||Math.abs(n.pin.bary.reduce((a,b)=>a+b,0)-1)>1e-6)bad();}else if(!floraSockets(parent.asset).some(s=>s.id===n.socket))bad();}else if(n.socket!==undefined||n.pin!==undefined)bad();const seen=new Set();let current=n;while(current){if(seen.has(current.id))bad();seen.add(current.id);current=nodes.get(current.parentOrgan||current.parent||current.branch);}}return f;
}
function branchJointRotation(parent,at){
 const curve=floraMuscleCurve(parent),x=at*(parent.points.length-1),index=Math.round(x),onJoint=Math.abs(x-index)<1e-7,rotations=parent.jointRotations||{},earlier=Object.keys(rotations).map(Number).filter(i=>onJoint?i<index:i<=x).sort((a,b)=>b-a)[0],incoming=new T.Quaternion().setFromEuler(new T.Euler(...(rotations[earlier]||parent.childRotation||[0,0,0]))),relative=incoming.clone().invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(...(onJoint&&rotations[index]||rotations[earlier]||parent.childRotation||[0,0,0]))));
 const tangent=onJoint&&index>0?v(parent.points[index]).sub(v(parent.points[index-1])).normalize():curve.getTangent(at);
 return alignFloraBoneRotation(incoming,new T.Vector3(0,1,0),tangent).multiply(relative);
}
export function floraBranchCaps(f,b){
 // Authored textured skins include their own continuous crown and root.
 if(floraAsset(b.profile)?.nativeSkin)return {};

 const end=b.points.length-1,shared=floraSharedJoint(f,b),children=[...f.branches,...f.organs.filter(floraBodyOrgan)].filter(n=>{const joint=floraSharedJoint(f,n);return joint?.branch===b.id&&!joint.organ&&joint.index===end;}),caps={trimStart:!!shared,trimEnd:!!children.length},curve=floraMuscleCurve(b);
 // A shared attachment frame cancels ancestor transforms: compute its seam locally.
 const blend=(incoming,outgoing)=>{const tangent=incoming.clone().add(outgoing);return (tangent.lengthSq()>1e-8?tangent.normalize():outgoing.clone()).toArray().map(x=>Math.round(x*1e9)/1e9);};
 if(shared){let incoming;if(shared.organ){const parent=f.organs.find(o=>o.id===shared.organ),socket=floraSockets(parent.asset).find(s=>s.id===shared.socket),prior=floraSockets(parent.asset).find(s=>s.id===socket.parent);incoming=prior?v(floraSocketPose(parent,socket).point).sub(v(floraSocketPose(parent,prior).point)).normalize():v(socket.direction);incoming.applyQuaternion(floraSocketRotation(parent,socket,floraSocketPose(parent,socket)).invert());}else{const parent=f.branches.find(n=>n.id===shared.branch),at=shared.index/(parent.points.length-1);incoming=floraMuscleCurve(parent).getTangent(at).applyQuaternion(branchJointRotation(parent,at).invert());}caps.startTangent=blend(incoming,curve.getTangent(0));}
 if(children.length){const incoming=curve.getTangent(1),outgoing=new T.Vector3(),rotation=branchJointRotation(b,1);for(const child of children){if(child.points)outgoing.add(floraMuscleCurve(child).getTangent(0).applyQuaternion(rotation));else{const nodes=floraSockets(child.asset),root=nodes.find(n=>!n.parent),next=nodes.find(n=>n.parent===root.id);if(next)outgoing.add(v(floraSocketPose(child,next).point).sub(v(floraSocketPose(child,root).point)).multiply(v(child.scale)).applyEuler(new T.Euler(...child.rotation)).applyQuaternion(rotation).normalize());}}if(outgoing.lengthSq()>1e-8)caps.endTangent=blend(incoming,outgoing.normalize());}
 return caps;
}
export function branchGeometry(f,b){
 if(f.finishes?.bark?.mapping==='branch'&&b.profile==='flora-basic-branch'&&f.branches.length===1)return floraVineGeometry(floraMuscleCurve(b),t=>floraBranchRadius(b,t)).applyMatrix4(floraAttachmentFrame(f,b));
 const geometry=floraMuscleGeometry(b,floraBranchCaps(f,b));
 if(f.finishes?.bark?.mapping==='branch'){
  const source=floraMuscleShape(b.profile).mesh,curve=floraMuscleCurve(b),lengths=curve.getLengths(256),uv=[];
  for(const [i,t] of source.bindings.entries()){
   const x=t*256,j=Math.min(255,Math.floor(x)),distance=T.MathUtils.lerp(lengths[j],lengths[j+1],x-j);
   uv.push(source.uv[i*2],Math.PI*2*floraBranchRadius(b,t),distance);
  }
  geometry.setAttribute('floraBranchUV',new T.Float32BufferAttribute(uv,3));
 }
 return geometry.applyMatrix4(floraAttachmentFrame(f,b));
}
// Body presets use an implicit field rather than a native branch mesh. Their
// continued terminal joints need the same shared section as the outgoing part.
export function floraBodyCaps(f,o){
 const nodes=floraSockets(o.asset),joins=[],rotation=n=>new T.Quaternion().setFromEuler(new T.Euler(...n.rotation)),bodyDirection=n=>{const sockets=floraSockets(n.asset),root=sockets.find(s=>!s.parent),next=sockets.find(s=>s.parent===root?.id);return next?v(floraSocketPose(n,next).point).sub(v(floraSocketPose(n,root).point)).multiply(v(n.scale)).applyQuaternion(rotation(n)).normalize():null;},blend=(a,b)=>{const sum=a.clone().add(b);return (sum.lengthSq()>1e-8?sum.normalize():b).toArray().map(x=>Math.round(x*1e9)/1e9);};
 for(const socket of nodes.filter(s=>s.parent&&!nodes.some(n=>n.parent===s.id))){
  const children=[...f.branches,...f.organs.filter(floraBodyOrgan)].filter(n=>n.parentOrgan===o.id&&n.socket===socket.id&&!n.pin),outgoing=new T.Vector3(),pose=floraSocketPose(o,socket),q=floraSocketRotation(o,socket,pose);
  for(const child of children){const tangent=child.points?floraMuscleCurve(child).getTangent(0):bodyDirection(child);if(tangent)outgoing.add(tangent.applyQuaternion(q));}
  if(outgoing.lengthSq()>1e-8){const previous=nodes.find(n=>n.id===socket.parent),incoming=v(pose.point).sub(v(floraSocketPose(o,previous).point)).normalize();joins.push({joint:socket.id,normal:blend(incoming,outgoing.normalize())});}
 }
 const shared=floraSharedJoint(f,o),root=nodes.find(n=>!n.parent),next=nodes.filter(n=>n.parent===root?.id);
 if(shared&&next.length===1){let incoming;if(shared.organ){const parent=f.organs.find(n=>n.id===shared.organ),s=floraSockets(parent.asset).find(n=>n.id===shared.socket),prior=floraSockets(parent.asset).find(n=>n.id===s.parent),pose=floraSocketPose(parent,s);incoming=prior?v(pose.point).sub(v(floraSocketPose(parent,prior).point)).normalize():v(s.direction);incoming.applyQuaternion(floraSocketRotation(parent,s,pose).invert());}else{const parent=f.branches.find(n=>n.id===shared.branch),at=shared.index/(parent.points.length-1);incoming=floraMuscleCurve(parent).getTangent(at).applyQuaternion(branchJointRotation(parent,at).invert());}incoming.applyQuaternion(rotation(o).invert()).divide(v(o.scale)).normalize();const outgoing=v(floraSocketPose(o,next[0]).point).sub(v(floraSocketPose(o,root).point)).normalize();joins.push({joint:root.id,start:true,normal:blend(incoming,outgoing)});}
 return joins;
}
// Editing and finished plants use exactly the same authored wood union.
export function floraBodyOrgan(o){const a=floraAsset(o?.asset);return o?.kind==='bark'&&!!a&&floraPlacementCategory(a)==='Body presets';}
export function floraWeldKey(f){
 const needed=new Set(f.organs.filter(floraBodyOrgan).map(o=>o.id));
 // A surface-pinned structural part inherits its host's transform, even when
 // that host is a separate decorative mesh rather than part of the skin.
 for(const n of [...f.branches,...f.organs.filter(floraBodyOrgan)]){let parent=n.parentOrgan;while(parent&&!needed.has(parent)){needed.add(parent);parent=f.organs.find(o=>o.id===parent)?.parentOrgan;}}
 const nodes=canonicalFloraNodes(f.branches,f.organs.filter(o=>needed.has(o.id)));
 return JSON.stringify([nodes.branches,nodes.organs,f.detail]);
}
export function floraNeedsWeld(f){
 // A single closed vine has no joints to fuse. Voxelizing a very long tube
 // erodes its walking surface and introduces ridges between coarse cells.
 if(f.finishes?.bark?.mapping==='branch'&&f.branches.length===1&&f.branches[0].profile==='flora-basic-branch'&&!f.organs.some(floraBodyOrgan))return false;
 return f.branches.filter(b=>!b.anchor&&!floraAsset(b.profile)?.nativeSkin).length+f.organs.filter(floraBodyOrgan).length>(f.detail==='swbf2'?0:1);
}
export function floraWeldGeometry(f){
 if(!floraNeedsWeld(f))return null;
 const key=floraWeldKey(f),cached=cachedFloraSkin(key);if(cached)return cached;
 const skin=[];for(const b of f.branches.filter(b=>!b.anchor&&!floraAsset(b.profile)?.nativeSkin)){const geometry=branchGeometry(f,b),solid=skinSolid([geometry],b.id);geometry.dispose();if(solid)skin.push(solid);
 // Preserve thin authored limbs when the shared weld grid is coarser than a
 // tip. These inner samples follow the actual native curve, never a bounding
 // box shortcut, and do not connect or skin decorative surface parts.
 const curve=floraCurve(f,b.id),scale=floraBranchScale(f,b),steps=Math.max(12,floraMuscleShape(b.profile).points.length*2);
 for(let i=0;i<steps;i++){const t=i/steps,u=(i+1)/steps,bone=skinBone(curve.getPoint(t),curve.getPoint(u),floraBranchRadius(b,t)*scale*.25,floraBranchRadius(b,u)*scale*.25,b.id);bone.reinforcement=true;skin.push(bone);}}

 for(const o of f.organs.filter(floraBodyOrgan)){
  const matrix=floraOrganMatrix(f,o),field=floraBodyField(o,floraBodyCaps(f,o));
  // Spend skin samples around the individual limbs, not the empty space
  // inside the body's overall bounds; otherwise small tips can miss the grid.
  if(field){const inverse=matrix.clone().invert(),point=new T.Vector3(),scale=Math.cbrt(Math.abs(matrix.determinant()));skin.push({owner:o.id,bodyField:true,box:field.box.clone().applyMatrix4(matrix),surfaceBoxes:field.groups.map(g=>g.box.clone().applyMatrix4(matrix)),radius:field.minRadius*scale,distance(p){point.copy(p).applyMatrix4(inverse);return field.distance(point.x,point.y,point.z)*scale;}});
   // A moved, attached body keeps its actual joint connected. A standalone root
   // has only an anchor and never grows an invented trunk or connector.
   const parent=f.branches.find(b=>b.id===o.branch),host=f.organs.find(p=>p.id===o.parentOrgan),root=floraAsset(o.asset).skeleton.find(n=>!n.parent);
   if(root&&!floraSharedJoint(f,o)&&(host?floraBodyOrgan(host):parent&&!parent.anchor)){const anchor=new T.Vector3().setFromMatrixPosition(floraAttachmentFrame(f,o)),end=v(floraSocketPose(o,root).point).applyMatrix4(matrix),radius=root.radius*2*scale,parentRadius=host?radius:floraBranchRadius(parent,o.at)*floraBranchScale(f,parent);if(anchor.distanceTo(end)>.001)skin.push(skinBone(anchor,end,parentRadius,radius,o.id));}
   continue;}
  const geometries=(floraAsset(o.asset)?.meshes||[]).map(m=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(floraDeformPositions(o,m.positions),3));g.setIndex(m.indices);g.applyMatrix4(matrix);return g;});const solid=skinSolid(geometries,o.id);for(const g of geometries)g.dispose();if(solid)skin.push(solid);
 }

 return skin.length?floraSkinGeometry(skin,f.detail,key):null;
}
const assetMaterials=new WeakMap();
function floraAssetMaterial(asset,component,mats,f){
 let material=mats[component];
 if(asset?.textureMap){
  let cache=assetMaterials.get(mats);if(!cache){cache=new Map();assetMaterials.set(mats,cache);}const map=asset.textureMap(),key=component+':'+map.uuid+':'+JSON.stringify(f.finishes?.[component]);if(cache.has(key))return cache.get(key);
  material=asset.unlit?new T.MeshBasicMaterial({color:material.color,side:material.side}):material.clone();const finish=f.finishes?.[component];
  material.map=finish&&finish.preset!=='plain'?surfaceTexture(finish.preset).clone():asset.textureMap();
  if(finish&&finish.preset!=='plain'){material.map.repeat.setScalar(finish.scale);material.map.needsUpdate=true;}
  material.alphaMap=asset.alphaMap();material.alphaTest=material.alphaMap?.45:0;material.roughness=.9;
  material.userData.walkCollision=asset.walkCollision??false;cache.set(key,material);return material;
 }
 return material;
}
export function buildFlora(group,f,part,{editable=false,live=false}={}){validateFlora(f);const mats=Object.fromEntries(Object.entries(f.colors).map(([k,c])=>[k,new T.MeshStandardMaterial({color:c,roughness:.85,side:T.DoubleSide})]));mats.bark.map=floraAsset('flora-basic-branch').textureMap();const add=(geo,mat,pos)=>{const m=new T.Mesh(geo,mats[mat]);if(pos)m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 group.userData.floraLive=live;const welded=!live?floraWeldGeometry(f):null;
 for(const o of f.organs.filter(o=>o.kind!=='bark')){const g=new T.Group();g.matrixAutoUpdate=false;g.matrix.copy(floraOrganMatrix(f,o));g.userData.floraOrgan=o.id;g.userData.floraGeometryKey=floraGeometryKey(o,f);group.add(g);const component=o.kind;
 const put=(geo,pos=[0,0,0])=>{const m=new T.Mesh(geo,mats[component]);m.position.fromArray(pos);m.userData.floraComponent=component;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 if(o.asset){const a=floraAsset(o.asset),material=floraAssetMaterial(a,component,mats,f);if(a.billboard){const mesh=buildBillboardMesh(o.billboard||a.billboard,material);mesh.userData.floraComponent=component;g.add(mesh);}else for(const mesh of a.meshes){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(floraDeformPositions(o,mesh.positions),3));geo.userData.floraSource=mesh.positions;geo.userData.floraSourceUV=mesh.uv;geo.setAttribute('uv',new T.Float32BufferAttribute(floraMorphUV(o,mesh.uv),2));geo.setIndex(mesh.indices);if(mesh.normals)geo.setAttribute('normal',new T.Float32BufferAttribute(mesh.normals,3));else geo.computeVertexNormals();const m=put(geo);m.material=material;}}
 }

 {
  for(const b of f.branches.filter(b=>!b.anchor&&(!welded||floraAsset(b.profile)?.nativeSkin))){const frame=floraAttachmentFrame(f,b),mesh=add(branchGeometry(f,b).applyMatrix4(frame.clone().invert()),'bark');mesh.matrixAutoUpdate=false;mesh.matrix.copy(frame);mesh.userData.floraBranch=b.id;mesh.userData.floraGeometryKey=floraGeometryKey(b,f);mesh.userData.floraComponent='bark';mesh.userData.floraWeldSource=!floraAsset(b.profile)?.nativeSkin;if(floraAsset(b.profile)?.nativeSkin)mesh.material=floraAssetMaterial(floraAsset(b.profile),'bark',mats,f);}
 }
 for(const o of f.organs.filter(o=>o.kind==='bark')){const attachment=new T.Group();attachment.matrixAutoUpdate=false;attachment.matrix.copy(floraOrganMatrix(f,o));attachment.userData.floraOrgan=o.id;attachment.userData.floraGeometryKey=floraGeometryKey(o,f);group.add(attachment);if(floraBodyOrgan(o))for(const geometry of floraBodyExtras(o)){const asset=floraAsset(geometry.userData.floraAsset),component=asset.category==='Leaves'?'leaf':'bark',mesh=new T.Mesh(geometry,floraAssetMaterial(asset,component,mats,f));mesh.userData.floraComponent=component;mesh.castShadow=mesh.receiveShadow=true;attachment.add(mesh);}if(welded&&floraBodyOrgan(o))continue;const volume=floraBodyOrgan(o)&&floraBodyGeometry(o,f.detail,floraBodyCaps(f,o));if(volume){const mesh=new T.Mesh(volume,mats.bark);mesh.userData.floraComponent='bark';mesh.userData.floraWeldSource=true;mesh.castShadow=mesh.receiveShadow=true;attachment.add(mesh);continue;}for(const source of floraAsset(o.asset)?.meshes||[]){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(floraDeformPositions(o,source.positions),3));geometry.userData.floraSource=source.positions;geometry.setAttribute('uv',new T.Float32BufferAttribute(floraMorphUV(o,source.uv),2));geometry.setIndex(source.indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,floraAssetMaterial(floraAsset(o.asset),'bark',mats,f));mesh.userData.floraComponent='bark';mesh.userData.floraWeldSource=floraBodyOrgan(o);mesh.castShadow=true;mesh.receiveShadow=true;attachment.add(mesh);}}
 if(welded)add(welded,'bark').userData.floraComponent='bark';
 // Bake attachment transforms into plant space so mesh batching and texture projection agree.
 if(!editable)for(const attachment of [...group.children].filter(o=>o.isGroup&&!o.children.some(m=>m.userData.floraBillboard))){if(attachment.matrixAutoUpdate)attachment.updateMatrix();for(const m of [...attachment.children]){m.updateMatrix();m.geometry.applyMatrix4(attachment.matrix.clone().multiply(m.matrix));m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.set(1,1,1);group.add(m);}group.remove(attachment);}
 for(const [key,mat] of Object.entries(mats)){let used=false;group.traverse(m=>{if(m.isMesh&&m.material===mat)used=true;});if(!used){mat.dispose();continue;}const finish=f.finishes?.[key];if(finish)applySurface(group,mat,{...part,surface:finish});}
 return group;
}

// Local shape keys also detect a shared base changing when its host is edited.
const floraGeometryKey=(n,f)=>JSON.stringify(n.points?[n.profile,n.points,n.radii,n.jointRotations,n.childRotation,f&&floraBranchCaps(f,n)]:[n.asset,n.controls,n.morphs,n.billboard,f&&floraBodyOrgan(n)&&floraBodyCaps(f,n)]);
// Reuse unaffected geometry; rebuild each changed object group's decorations once.
export function updateFloraPreview(group,f,changedBranch=null,changedOrgan=null){
 const organs=new Map(f.organs.map(o=>[o.id,o])),branches=new Map(f.branches.map(b=>[b.id,b]));
 for(const child of group.children){
  const organ=organs.get(child.userData.floraOrgan),branch=branches.get(child.userData.floraBranch),node=organ||branch;if(!node)continue;
  const key=floraGeometryKey(node,f),changed=child.userData.floraGeometryKey!==key;child.userData.floraGeometryKey=key;
  if(organ){child.matrix.copy(floraOrganMatrix(f,organ));child.matrixWorldNeedsUpdate=true;if(!changed)continue;
   const extras=child.children.some(m=>m.geometry?.userData.floraBodyExtra!==undefined)?floraBodyExtras(organ):[];
   for(const mesh of child.children){
    if(mesh.userData.floraBillboard){mesh.geometry.dispose();mesh.geometry=billboardGeometry(organ.billboard||floraAsset(organ.asset).billboard);delete mesh.userData.billboardFrame;continue;}
    if(mesh.geometry?.userData.floraBodyExtra!==undefined){const geometry=extras[mesh.geometry.userData.floraBodyExtra];mesh.geometry.dispose();mesh.geometry=geometry;continue;}
    if(mesh.geometry?.userData.floraBodyVolume){mesh.geometry.dispose();mesh.geometry=floraBodyGeometry(organ,f.detail,floraBodyCaps(f,organ));continue;}
    const source=mesh.geometry?.userData.floraSource;if(source){const attr=mesh.geometry.getAttribute('position');attr.array.set(floraDeformPositions(organ,source));attr.needsUpdate=true;const uv=mesh.geometry.getAttribute('uv'),sourceUV=mesh.geometry.userData.floraSourceUV;if(sourceUV){uv.array.set(floraMorphUV(organ,sourceUV));uv.needsUpdate=true;}mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();}
   }
  }else{const frame=floraAttachmentFrame(f,branch);child.matrix.copy(frame);child.matrixWorldNeedsUpdate=true;if(changed){child.geometry.dispose();child.geometry=branchGeometry(f,branch).applyMatrix4(frame.clone().invert());}}
 }
 group.updateMatrixWorld(true);
}
