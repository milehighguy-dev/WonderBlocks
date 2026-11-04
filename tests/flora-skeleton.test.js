import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {deformFloraSkeleton,floraSkeletonPose} from '../src/flora/flora-skeleton.js';
import {floraAsset,PROCEDURAL_FLORA} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset,floraSockets,floraSocketPose,deformFloraStemControl,floraAttachmentFrame,floraOrganMatrix,validateFlora} from '../src/flora/flora.js';

const v=a=>new T.Vector3(...a);
const skeleton=[{id:'base',point:[0,0,0],parent:null},{id:'tip',point:[0,3,0],parent:'base'}];
const ring=(y,r=.3)=>Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8)*r,y,Math.sin(i*Math.PI/8)*r]).flat();

test('moving a joint sideways turns each cross-section with the bone instead of flattening it',()=>{
 for(const direction of [[1,0,0],[0,0,1],[0,-1,0],[1,2,-3]])for(const length of [.2,3,12]){
  const axis=v(direction).normalize(),end=axis.clone().multiplyScalar(length),controls={tip:{offset:end.clone().sub(v(skeleton[1].point)).toArray()}},positions=ring(1.5),deformed=deformFloraSkeleton(skeleton,controls,positions),center=end.clone().multiplyScalar(.5);
  for(let i=0;i<deformed.length;i+=3){const radial=new T.Vector3().fromArray(deformed,i).sub(center);assert.ok(Math.abs(radial.dot(axis))<1e-6,'cross-section must face the new growth direction');assert.ok(Math.abs(radial.length()-.3)<1e-6,'moving or extending must preserve girth');}
  const pose=floraSkeletonPose(skeleton,controls,[.3,1.5,0]);assert.ok(pose.point.distanceTo(new T.Vector3().fromArray(deformed,0))<1e-6);
 }
});

test('a procedural single-bone body keeps its full authored volume when bent sideways',()=>{
 const asset=floraAsset('flora-taproot'),[base,tip]=asset.skeleton,axis=v(tip.point).sub(v(base.point)).normalize(),target=new T.Vector3(1,0,0),rotation=new T.Quaternion().setFromUnitVectors(axis,target),controls={[tip.id]:{offset:v(tip.point).sub(v(base.point)).applyQuaternion(rotation).add(v(base.point)).sub(v(tip.point)).toArray()}};
 for(const mesh of asset.meshes){const moved=deformFloraSkeleton(asset.skeleton,controls,mesh.positions);for(let i=0;i<moved.length;i+=3){const expected=new T.Vector3().fromArray(mesh.positions,i).sub(v(base.point)).applyQuaternion(rotation).add(v(base.point));assert.ok(expected.distanceTo(new T.Vector3().fromArray(moved,i))<2e-6,'translated tip sheared the authored mesh');}}
});

test('rotating a complete procedural body still produces an exact rigid transform',()=>{
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(.3,.8,-1.1)),angles=new T.Euler().setFromQuaternion(rotation),translation=new T.Vector3(.4,-.2,.6);
 for(const entry of PROCEDURAL_FLORA){const asset=floraAsset(entry.id);if(!asset.skeleton)continue;const controls=Object.fromEntries(asset.skeleton.map(n=>[n.id,{offset:v(n.point).applyQuaternion(rotation).add(translation).sub(v(n.point)).toArray(),rotation:[angles.x,angles.y,angles.z]}]));
  for(const mesh of asset.meshes){const moved=deformFloraSkeleton(asset.skeleton,controls,mesh.positions);for(let i=0;i<moved.length;i+=3){const expected=new T.Vector3().fromArray(mesh.positions,i).applyQuaternion(rotation).add(translation);assert.ok(expected.distanceTo(new T.Vector3().fromArray(moved,i))<2e-6,asset.id);}}
 }
});

test('zero-length and nearly reversed controls produce finite, full-radius cross-sections',()=>{
 for(const end of [[0,0,0],[1e-10,-3,1e-10]]){const controls={tip:{offset:v(end).sub(v(skeleton[1].point)).toArray()}},positions=deformFloraSkeleton(skeleton,controls,ring(1.5)),center=v(end).multiplyScalar(.5);for(let i=0;i<positions.length;i+=3)assert.ok(Math.abs(new T.Vector3().fromArray(positions,i).distanceTo(center)-.3)<1e-6);}
});


test('joint-mounted branches follow a translated, then twisted native bone',()=>{
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-taproot'),asset=floraAsset(o.asset),[base,tip]=asset.skeleton,child=addFloraAsset(f,o.branch,'flora-basic-branch',0,0,{organ:o.id,socket:tip.id}),socket=floraSockets(o.asset).find(s=>s.id===tip.id),pose=floraSocketPose(o,socket);
 const target=v(base.point).add(new T.Vector3(3,0,0));deformFloraStemControl(o,structuredClone(o),tip.id,target.toArray(),pose.rotation,pose.scale,'translate');
 assert.ok(new T.Vector3(0,1,0).transformDirection(floraAttachmentFrame(f,child)).distanceTo(new T.Vector3(1,0,0).transformDirection(floraOrganMatrix(f,o)))<1e-6,'moving the joint carries the outgoing direction');
 const twisted=[.4,.8,-.2];deformFloraStemControl(o,structuredClone(o),tip.id,target.toArray(),twisted,pose.scale,'rotate');
 const originalDirection=v(tip.point).sub(v(base.point)).normalize(),frame=floraAttachmentFrame(f,child),body=floraOrganMatrix(f,o),transport=new T.Quaternion().setFromUnitVectors(originalDirection,new T.Vector3(1,0,0)),turn=new T.Quaternion().setFromEuler(new T.Euler(...twisted));
 const expected=originalDirection.clone().applyQuaternion(turn).applyQuaternion(transport).transformDirection(body);
 assert.ok(new T.Vector3(0,1,0).transformDirection(frame).distanceTo(expected)<1e-6,'the explicit joint turn must not be erased by incoming bone alignment');
 validateFlora(f);const restored=JSON.parse(JSON.stringify(f));assert.deepEqual(floraAttachmentFrame(restored,restored.branches.find(b=>b.id===child.id)).elements,frame.elements);
});
