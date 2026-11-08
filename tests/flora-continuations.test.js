import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {defaultFlora,addFloraAsset,branchGeometry,floraCurve,floraWeldGeometry,floraOrganPosition,floraAttachmentFrame,buildFlora,updateFloraPreview,validateFlora} from '../src/flora/flora.js';
import {floraMuscleShape} from '../src/flora/flora-muscle.js';
import {clearFloraSkinCache} from '../src/flora/flora-skin.js';
import {disposePart} from '../src/core/geometry.js';

function equivalentPlants(trunk=false){
 const whole=defaultFlora();whole.detail='standard';
 const base=addFloraAsset(whole,whole.branches[0].id,'flora-basic-branch');
 if(trunk){base.points=[[0,0,0],[0,6,0]];base.radii=[.6,.4];}
 const limb=trunk?addFloraAsset(whole,base.id,'flora-basic-branch',.5):base;
 limb.points=[[0,0,0],[3,1,0],[5,4,1]];limb.radii=[.4,.25,.05];
 const pieces=structuredClone(whole),first=pieces.branches.find(b=>b.id===limb.id);
 first.points=first.points.slice(0,2);first.radii=first.radii.slice(0,2);
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(3,1,0).normalize());
 const last=addFloraAsset(pieces,first.id,'flora-basic-branch',1);
 last.points=[[0,0,0],new T.Vector3(2,3,1).applyQuaternion(q.invert()).toArray()];last.radii=[.25,.05];
 validateFlora(whole);validateFlora(pieces);return {whole,pieces,limb,first,last};
}
function close(a,b,message,epsilon=2e-6){assert.ok(a.distanceTo(b)<epsilon,`${message}: ${a.distanceTo(b)}`);}

test('a continuous authored limb and end-connected palette pieces use the same whole curve',()=>{
 const {whole,pieces,limb,first,last}=equivalentPlants(true),snapshot=JSON.stringify(pieces),curve=floraCurve(whole,limb.id);
 for(const [piece,offset] of [[first,0],[last,.5]]){const actual=floraCurve(pieces,piece.id);for(let i=0;i<=24;i++){close(actual.getPoint(i/24),curve.getPoint(offset+i/48),'same center');close(actual.getTangent(i/24),curve.getTangent(offset+i/48),'same tangent');}}
 assert.equal(JSON.stringify(pieces),snapshot,'deriving the curve leaves saved controls untouched');
});

test('continued pieces share identical side rings and normals, with no rendered internal caps',()=>{
 const {pieces,first,last}=equivalentPlants(),a=branchGeometry(pieces,first),b=branchGeometry(pieces,last),source=floraMuscleShape(first.profile).mesh;
 const rings=t=>source.bindings.map((x,i)=>({x,i,p:new T.Vector3().fromArray(source.positions,i*3)})).filter(n=>n.x===t&&Math.abs(n.p.y-t)<1e-8&&Math.abs(n.p.lengthSq()-t*t-.01)<1e-8).map(n=>n.i);
 try{const end=rings(1),start=rings(0);assert.equal(end.length,12);assert.equal(start.length,12);for(let i=0;i<12;i++){close(new T.Vector3().fromBufferAttribute(a.attributes.position,end[i]),new T.Vector3().fromBufferAttribute(b.attributes.position,start[i]),'matching boundary ring');close(new T.Vector3().fromBufferAttribute(a.attributes.normal,end[i]),new T.Vector3().fromBufferAttribute(b.attributes.normal,start[i]),'matching side shading');}}
 finally{a.dispose();b.dispose();}
 const group=new T.Group();buildFlora(group,pieces,{}, {live:true});
 try{for(const [piece,t] of [[first,1],[last,0]]){const mesh=group.children.find(m=>m.userData.floraBranch===piece.id),index=mesh.geometry.index;for(let i=0;i<index.count;i+=3)assert.ok(![0,1,2].every(j=>source.bindings[index.getX(i+j)]===t),'continuation has no interior cap triangles');}}
 finally{disposePart(group);}
});

test('authored and palette-assembled limbs produce the same finished surface at every detail level',()=>{
 for(const trunk of [false,true])for(const detail of ['standard','swbf2']){
  const {whole,pieces}=equivalentPlants(trunk);whole.detail=pieces.detail=detail;
  if(!trunk){assert.equal(floraWeldGeometry(whole),null);assert.equal(floraWeldGeometry(pieces),null);continue;}
  clearFloraSkinCache();const a=floraWeldGeometry(whole);clearFloraSkinCache();const b=floraWeldGeometry(pieces);
  const ga=a,gb=b;
  try{assert.deepEqual(gb.index.array,ga.index.array);assert.equal(gb.attributes.position.count,ga.attributes.position.count);for(let i=0;i<ga.attributes.position.array.length;i++)assert.ok(Math.abs(gb.attributes.position.array[i]-ga.attributes.position.array[i])<2e-5,'same finished shape');}
  finally{ga.dispose();gb.dispose();}
 }
});

test('continued surface pins and reused previews follow successor edits and undo/reload',()=>{
 const {pieces,first,last}=equivalentPlants(),pin={triangle:40,bary:[.2,.3,.5]},leaf=addFloraAsset(pieces,first.id,'flora-ginkgo-leaf',.4,0,{at:.4,branchSurface:{angle:0,pin}}),before=structuredClone(pieces),group=new T.Group();
 buildFlora(group,pieces,{}, {live:true});
 const check=()=>{const geometry=branchGeometry(pieces,first),point=new T.Vector3();try{for(let i=0;i<3;i++)point.addScaledVector(new T.Vector3().fromBufferAttribute(geometry.attributes.position,geometry.index.getX(pin.triangle*3+i)),pin.bary[i]);close(floraOrganPosition(pieces,leaf),point,'pin stays on rendered source');}finally{geometry.dispose();}const restored=JSON.parse(JSON.stringify(pieces));validateFlora(restored);close(floraOrganPosition(restored,restored.organs[0]),point,'reload retains pin');};
 try{check();const mesh=group.children.find(m=>m.userData.floraBranch===first.id),old=mesh.geometry;last.points[1][2]+=.7;updateFloraPreview(group,pieces,last.id);assert.notEqual(mesh.geometry,old,'a successor bend also rebuilds its continuous predecessor');check();Object.assign(pieces,before);updateFloraPreview(group,pieces);const fresh=new T.Group();buildFlora(fresh,pieces,{}, {live:true});try{assert.deepEqual(mesh.geometry.attributes.position.array,fresh.children.find(m=>m.userData.floraBranch===first.id).geometry.attributes.position.array);}finally{disposePart(fresh);}}
 finally{disposePart(group);}
});

test('the unwelded continued surface is closed and exposes only its two free ends',()=>{
 const {pieces}=equivalentPlants(),g=new T.Group();buildFlora(g,pieces,{}, {live:true});g.updateMatrixWorld(true);
 const vertices=new Map(),edges=new Map(),point=new T.Vector3();let volume=0;
 const vertex=(mesh,i)=>{point.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);const key=point.toArray().map(x=>Math.round(x*1e5)).join(',');if(!vertices.has(key))vertices.set(key,vertices.size);return vertices.get(key);};
 try{for(const mesh of g.children.filter(m=>m.isMesh)){const index=mesh.geometry.index;for(let i=0;i<index.count;i+=3){const ids=[0,1,2].map(j=>vertex(mesh,index.getX(i+j))),points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index.getX(i+j)).applyMatrix4(mesh.matrixWorld));if(new Set(ids).size<3)continue;volume+=points[0].dot(points[1].clone().cross(points[2]))/6;for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)||0)+1);}}}assert.ok(volume>0);assert.ok([...edges.values()].every(n=>n===2),'every edge has exactly two exterior faces');}
 finally{disposePart(g);}
});

test('rotating a continued limb keeps its shared rings coincident and its controls in place',()=>{
 const {pieces,first,last}=equivalentPlants();first.jointRotations={1:[.25,.6,-.3]};last.childRotation=[.1,.3,.2];last.jointRotations={1:[.2,.5,.1]};
 const snapshot=JSON.stringify(pieces),g1=branchGeometry(pieces,first),g2=branchGeometry(pieces,last),source=floraMuscleShape(first.profile).mesh;
 try{const ring=t=>source.bindings.flatMap((u,i)=>u===t&&Math.abs(source.positions[i*3+1]-t)<1e-8?[i]:[]);const end=ring(1),start=ring(0);assert.equal(end.length,12);for(let i=0;i<12;i++){close(new T.Vector3().fromBufferAttribute(g1.attributes.position,end[i]),new T.Vector3().fromBufferAttribute(g2.attributes.position,start[i]),'rotated ring position');close(new T.Vector3().fromBufferAttribute(g1.attributes.normal,end[i]),new T.Vector3().fromBufferAttribute(g2.attributes.normal,start[i]),'rotated ring shading');}for(const b of [first,last])for(let i=0;i<b.points.length;i++)close(floraCurve(pieces,b.id).getPoint(i/(b.points.length-1)),new T.Vector3(...b.points[i]).applyMatrix4(floraAttachmentFrame(pieces,b)),'curve retains rotated controls');assert.equal(JSON.stringify(pieces),snapshot);}
 finally{g1.dispose();g2.dispose();}
});
