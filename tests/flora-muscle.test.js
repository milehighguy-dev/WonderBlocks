import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {FLORA_PROFILES} from '../src/flora/procedural-flora.js';
import {floraMuscleShape,floraMuscleGeometry} from '../src/flora/flora-muscle.js';
import {defaultFlora,addFloraAsset,branchGeometry,floraCurve,floraOrganPosition,floraWeldGeometry,validateFlora,floraBranchCaps,floraAttachmentFrame,syncFloraSharedJoints} from '../src/flora/flora.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {makePart} from '../src/core/model.js';

const root=id=>{const f=defaultFlora(),b=addFloraAsset(f,f.branches[0].id,id);return {f,b};};
test('basic trunk starts a tapered tree with a bendable middle joint and normal branch attachments',()=>{
 const {f,b}=root('flora-basic-trunk'),shape=floraMuscleShape(b.profile);assert.equal(f.branches.length,1);assert.equal(b.points.length,3);assert.equal(b.points.at(-1)[1],4);assert.ok(shape.radii[0]>shape.radii.at(-1));
 const child=addFloraAsset(f,b.id,'flora-basic-branch',1);b.points[1]=[.7,2,.2];b.points[2]=[1.1,4,.4];syncFloraSharedJoints(f);validateFlora(f);
 assert.ok(floraCurve(f,child.id).getPoint(0).distanceTo(floraCurve(f,b.id).getPoint(1))<1e-7,'branch stays on the bent trunk tip');
 const geometry=branchGeometry(f,b);try{assert.ok(Array.from(geometry.attributes.position.array).every(Number.isFinite));geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.y>3.9);assert.ok(geometry.boundingBox.max.x>1,'geometry follows the edited trunk');}finally{geometry.dispose();}
});
test('lengthening a basic branch keeps its cap short and its thickness unchanged',()=>{
 const {f,b}=root('flora-basic-branch'),original=branchGeometry(f,b);original.computeBoundingBox();const cap=original.boundingBox.max.y-b.points.at(-1)[1],width=original.boundingBox.max.x-original.boundingBox.min.x;
 b.points=b.points.map(([x,y,z])=>[x,y*8,z]);const longer=branchGeometry(f,b);longer.computeBoundingBox();assert.ok(Math.abs(longer.boundingBox.max.y-b.points.at(-1)[1]-cap)<1e-5);assert.ok(Math.abs(longer.boundingBox.max.x-longer.boundingBox.min.x-width)<1e-5);original.dispose();longer.dispose();
});

test('a bent attachment shares one cross-section without a protruding closed end cap',()=>{
 const {f,b:parent}=root('flora-basic-branch');parent.points=[[0,0,0],[0,2,0]];parent.radii=[.2,.2];parent.jointRotations={1:[0,0,-Math.PI/2]};const child=addFloraAsset(f,parent.id,'flora-basic-branch',1);child.points=[[0,0,0],[0,2,0]];syncFloraSharedJoints(f);
 const a=floraBranchCaps(f,parent),b=floraBranchCaps(f,child),normal=new T.Vector3(...a.endTangent).transformDirection(floraAttachmentFrame(f,parent)),other=new T.Vector3(...b.startTangent).transformDirection(floraAttachmentFrame(f,child)),joint=floraCurve(f,parent.id).getPoint(1);assert.ok(normal.distanceTo(other)<1e-6);assert.ok(normal.distanceTo(new T.Vector3(1,1,0).normalize())<1e-6);
 for(const [branch,t] of [[parent,1],[child,0]]){const geometry=branchGeometry(f,branch),bindings=floraMuscleShape(branch.profile).mesh.bindings;try{for(let i=0;i<bindings.length;i++)if(bindings[i]===t)assert.ok(Math.abs(new T.Vector3().fromBufferAttribute(geometry.attributes.position,i).sub(joint).dot(normal))<1e-6,'internal cap lies in the shared section');}finally{geometry.dispose();}}
 const free=branchGeometry(f,child),tip=floraCurve(f,child.id).getPoint(1),direction=floraCurve(f,child.id).getTangent(1);try{let cap=0;for(let i=0;i<free.attributes.position.count;i++)cap=Math.max(cap,new T.Vector3().fromBufferAttribute(free.attributes.position,i).sub(tip).dot(direction));assert.ok(Math.abs(cap-.2)<1e-5,'the free end keeps its rounded closed cap');}finally{free.dispose();}
});

test('attachment blending leaves the authored middle and free tip unchanged for every native profile',()=>{
 for(const asset of Object.keys(FLORA_PROFILES)){const {f,b}=root('flora-basic-branch'),child=addFloraAsset(f,b.id,asset,1),plain=floraMuscleGeometry(child),joined=floraMuscleGeometry(child,floraBranchCaps(f,child)),bindings=floraMuscleShape(asset).mesh.bindings;try{let checked=0;for(let i=0;i<bindings.length;i++)if(bindings[i]>=.4){assert.ok(new T.Vector3().fromBufferAttribute(plain.attributes.position,i).distanceTo(new T.Vector3().fromBufferAttribute(joined.attributes.position,i))<1e-6,asset+' keeps its distant shape');checked++;}assert.ok(checked>10);}finally{plain.dispose();joined.dispose();}}
});
test('cached native deformation follows successive bends, thickness, twists and undo snapshots',()=>{
 const {f,b}=root('flora-elbow-branch'),before=structuredClone(b);
 const check=()=>{const live=branchGeometry(f,b),copy=structuredClone(f),fresh=branchGeometry(copy,copy.branches[0]);assert.deepEqual(Array.from(live.attributes.position.array),Array.from(fresh.attributes.position.array));live.dispose();fresh.dispose();};
 check();b.points[1][0]+=.3;check();b.radii[1]*=1.7;check();b.jointRotations={1:[.2,.4,.3]};check();Object.assign(b,before);delete b.jointRotations;check();
});
test('turning the root joint rotates the complete authored shape, including off-axis muscle detail',()=>{
 const q=new T.Quaternion().setFromEuler(new T.Euler(.3,1.1,-.2)),euler=new T.Euler().setFromQuaternion(q);
 for(const id of Object.keys(FLORA_PROFILES)){const {f,b}=root(id),original=branchGeometry(f,b);b.points=b.points.map(p=>new T.Vector3(...p).applyQuaternion(q).toArray());b.childRotation=[euler.x,euler.y,euler.z];const rotated=branchGeometry(f,b),expected=new T.Vector3(),actual=new T.Vector3();try{for(let i=0;i<original.attributes.position.count;i++){expected.fromBufferAttribute(original.attributes.position,i).applyQuaternion(q);actual.fromBufferAttribute(rotated.attributes.position,i);assert.ok(actual.distanceTo(expected)<2e-5,id+' root twist lost authored geometry');}}finally{original.dispose();rotated.dispose();}}
});
test('settled welding retains slender native branch tips on a much larger trunk',()=>{
 const {f,b:trunk}=root('flora-basic-branch');
 trunk.points=[[0,0,0],[0,6,0],[0,12,0]];trunk.radii=[.5,.4,.3];
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,b=addFloraAsset(f,trunk.id,'flora-basic-branch',.5,a);b.points=[[0,0,0],[Math.cos(a)*1.5,1,Math.sin(a)*1.5],[Math.cos(a)*3,2,Math.sin(a)*3]];b.radii=[.07,.04,.02];}
 for(const detail of ['standard','low']){f.detail=detail;const g=floraWeldGeometry(f),point=new T.Vector3();try{for(const b of f.branches.slice(1)){const tip=floraCurve(f,b.id).getPoint(1);let distance=Infinity;for(let i=0;i<g.attributes.position.count;i++)distance=Math.min(distance,tip.distanceTo(point.fromBufferAttribute(g.attributes.position,i)));assert.ok(distance<g.userData.skinStep*1.5,detail+' lost a native branch tip');}}finally{g.dispose();}}
});
test('each joint card places its complete authored field instead of a tapered generic tube',()=>{
 const shapes=new Set();
 for(const id of Object.keys(FLORA_PROFILES)){
  const {f,b}=root(id),shape=floraMuscleShape(id),geometry=branchGeometry(f,b),positions=geometry.attributes.position.array;
  assert.equal(b.nativeShape,true);assert.equal(positions.length,shape.mesh.positions.length);assert.deepEqual(Array.from(geometry.index.array),shape.mesh.indices);
  for(let i=0;i<positions.length;i++)assert.ok(Math.abs(positions[i]-shape.mesh.positions[i]*shape.length)<2e-5,id+' vertex '+i);
  assert.equal(b.radii[0],b.radii.at(-1),'no generic taper');shapes.add(JSON.stringify(Array.from(positions)));
  const restored=JSON.parse(JSON.stringify(f));validateFlora(restored);const reloaded=branchGeometry(restored,restored.branches[0]);assert.deepEqual(Array.from(reloaded.attributes.position.array),Array.from(positions));reloaded.dispose();geometry.dispose();
 }
 assert.equal(shapes.size,8);assert.ok(Object.values(FLORA_PROFILES).every(s=>s.mesh.bindings.length===s.mesh.positions.length/3));
});
test('the S-shaped joint retains both authored bends and its control points stay on the body curve',()=>{
 const {f,b}=root('flora-elbow-branch'),curve=floraCurve(f,b.id),points=Array.from({length:101},(_,i)=>curve.getPoint(i/100));
 assert.ok(Math.min(...points.map(p=>p.x))<-.4);assert.ok(Math.max(...points.map(p=>p.x))>.4);
 for(let i=0;i<b.points.length;i++)assert.ok(curve.getPoint(i/(b.points.length-1)).distanceTo(new T.Vector3(...b.points[i]))<1e-7);
 const before=branchGeometry(f,b);b.points.at(-1)[0]+=.5;b.points.at(-1)[2]+=.3;const bent=branchGeometry(f,b);assert.equal(bent.index.count,before.index.count);assert.ok([...bent.attributes.position.array].every(Number.isFinite));assert.notDeepEqual(Array.from(bent.attributes.position.array),Array.from(before.attributes.position.array));before.dispose();bent.dispose();
});
test('finishing a single authored joint at standard detail retains its full editable mesh',()=>{
 for(const id of Object.keys(FLORA_PROFILES)){
  const {f}=root(id);f.detail='standard';const part=makePart('flora',{flora:f}),preview=buildPart(part,{floraEditing:true,floraLive:true}),finished=buildPart(part);let a=[],b=[];preview.traverse(m=>{if(m.isMesh)a.push(...m.geometry.attributes.position.array);});finished.traverse(m=>{if(m.isMesh)b.push(...m.geometry.attributes.position.array);});assert.deepEqual(b,a,id);disposePart(preview);disposePart(finished);
 }
});
test('foliage pins stay on the authored surface through bending and saved reloads',()=>{
 const {f,b}=root('flora-broad-bough'),pin={triangle:40,bary:[.2,.3,.5]},leaf=addFloraAsset(f,b.id,'flora-ginkgo-leaf',.4,0,{branch:b.id,at:.4,branchSurface:{angle:0,pin}});
 const check=()=>{const g=branchGeometry(f,b),expected=new T.Vector3();for(let i=0;i<3;i++)expected.addScaledVector(new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.getX(pin.triangle*3+i)),pin.bary[i]);assert.ok(floraOrganPosition(f,leaf).distanceTo(expected)<1e-6);g.dispose();};check();b.points[1][0]+=.3;b.radii[1]*=1.5;check();b.childRotation=[0,.6,0];check();validateFlora(f);const restored=JSON.parse(JSON.stringify(f));assert.ok(floraOrganPosition(restored,restored.organs[0]).distanceTo(floraOrganPosition(f,leaf))<1e-6);
 const invalid=structuredClone(f);invalid.organs[0].branchSurface.pin.triangle=999999;assert.throws(()=>validateFlora(invalid));
});

test('near-end native cap vertices cannot protrude beyond a continued joint section',()=>{
 for(const asset of Object.keys(FLORA_PROFILES)){const {f,b:parent}=root(asset);parent.jointRotations={...(parent.jointRotations||{}),[parent.points.length-1]:[0,0,-Math.PI/2]};addFloraAsset(f,parent.id,'flora-basic-branch',1);syncFloraSharedJoints(f);const caps=floraBranchCaps(f,parent),geometry=floraMuscleGeometry(parent,caps),tip=floraCurve(f,parent.id).getPoint(1).applyMatrix4(floraAttachmentFrame(f,parent).invert()),normal=v3(caps.endTangent),bindings=floraMuscleShape(asset).mesh.bindings;try{let checked=0;for(let i=0;i<bindings.length;i++)if(bindings[i]>.97){assert.ok(new T.Vector3().fromBufferAttribute(geometry.attributes.position,i).sub(tip).dot(normal)<1e-6,asset+' has no leftover cap just short of the tip');checked++;}assert.ok(checked>0);}finally{geometry.dispose();}}
});
function v3(a){return new T.Vector3(...a);}
