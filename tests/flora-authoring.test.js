import {testStem,addTestBranch,addTestFoliage} from './flora-fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {floraAsset} from '../src/flora/flora-palette.js';
import {defaultFlora,addFloraAsset,floraEditableSections,floraSockets,floraSocketPose,floraDeformPositions,deformFloraStemControl,floraCurve,floraRadius,branchGeometry,floraSurfaceTarget,floraOrganPosition,fitFloraBranch,fitFloraSurfacePart,removeFloraJoint,validateFlora} from '../src/flora/flora.js';

const v=a=>new T.Vector3(...a);

test('baked body presets expose their procedural skeletal joints',()=>{
 assert.equal(floraEditableSections('flora-taproot').length,2);
 assert.ok(floraEditableSections('flora-forked-bough').every(s=>s.authored&&s.id.startsWith('joint:')));
 assert.equal(floraEditableSections('flora-bent-twig').length,0);
});

test('a procedural preset joint carries its descendants while the opposite limb stays fixed',()=>{
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-forked-bough'),sockets=floraEditableSections(o.asset),old=structuredClone(o),chosen=sockets.find(s=>s.parent&&sockets.some(n=>n.parent===s.id)&&sockets.some(n=>n.parent===s.parent&&n.id!==s.id)),child=sockets.find(s=>s.parent===chosen.id),opposite=sockets.find(s=>s.parent===chosen.parent&&s.id!==chosen.id),pose=floraSocketPose(o,chosen),delta=new T.Vector3(.4,.2,-.1);
 assert.ok(child&&opposite);
 deformFloraStemControl(o,old,chosen.id,v(pose.point).add(delta).toArray(),pose.rotation,pose.scale,'translate');
 assert.ok(v(floraSocketPose(o,child).point).sub(v(child.point)).distanceTo(delta)<1e-6);
 assert.deepEqual(floraSocketPose(o,opposite).point,opposite.point);
 const a=floraAsset(o.asset),source=a.meshes[0].positions,moved=floraDeformPositions(o,source);assert.ok([...moved].every(Number.isFinite));
 let fixed=0,shifted=0;for(let i=0;i<source.length;i+=3){const p=new T.Vector3().fromArray(source,i),q=new T.Vector3().fromArray(moved,i);if(p.distanceTo(v(opposite.point))<opposite.radius*4+.01){assert.ok(p.distanceTo(q)<1e-5);fixed++;}if(p.distanceTo(v(child.point))<child.radius*4+.01){assert.ok(q.sub(p).distanceTo(delta)<1e-5);shifted++;}}
 assert.ok(fixed>0&&shifted>0);validateFlora(f);
});

test('editing preset joints leaves unedited source geometry exact',()=>{
 for(const id of ['flora-forked-bough','flora-taproot','flora-twisting-stem','flora-antler-base']){const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,id);o.controls={};for(const socket of floraEditableSections(id))o.controls[socket.id]={offset:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};for(const mesh of floraAsset(id).meshes){const moved=floraDeformPositions(o,mesh.positions);assert.ok(moved.every((x,i)=>Math.abs(x-mesh.positions[i])<1e-6),id);}}
});

test('preview girth and bark attachments match actual joint positions on unevenly spaced stems',()=>{
 const f=testStem(),b=f.branches[0];b.points=[[0,0,0],[0,1,0],[0,8,0]];b.radii=[.4,.3,.05];
 const curve=floraCurve(f,b.id),geometry=branchGeometry(f,b),positions=geometry.attributes.position;
 try{const radial=[],index=geometry.index;for(let i=0;i<index.count;i+=3){const points=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(positions,index.getX(i+j)));for(let j=0;j<3;j++){const a=points[j],b=points[(j+1)%3];if((a.y-1)*(b.y-1)>0||Math.abs(b.y-a.y)<1e-8)continue;const p=a.clone().lerp(b,(1-a.y)/(b.y-a.y));radial.push(Math.hypot(p.x,p.z));}}assert.ok(radial.length>3);assert.ok(Math.abs(Math.max(...radial)-.3)<.03);}finally{geometry.dispose();}
 const target=floraSurfaceTarget(f,{branch:b.id,at:.5}),o=addTestFoliage(f,b.id,target.at);o.branchSurface=target.branchSurface;
 assert.ok(target.at<.2,'the first interior joint is near the start, not halfway along the length');
 assert.ok(Math.abs(floraOrganPosition(f,o).y-1)<1e-5);
 assert.ok(Math.abs(Math.hypot(floraOrganPosition(f,o).x,floraOrganPosition(f,o).z)-.3)<1e-5);
});


test('new branches fit the selected parent and tip continuations start in the outgoing direction',()=>{
 const f=testStem(),trunk=f.branches[0],side=fitFloraBranch(f,addTestBranch(f,trunk.id,.5)),tip=fitFloraBranch(f,addTestBranch(f,trunk.id,1));
 assert.equal(side.radii[0],trunk.radii[1]);assert.ok(tip.radii[0]<=trunk.radii.at(-1));
 assert.ok(side.points.at(-1)[0]>0);assert.equal(tip.points.at(-1)[0],0);
 assert.equal(tip.points.at(-1)[2],0);assert.ok(tip.points.at(-1)[1]>0);
 validateFlora(f);
});

test('surface parts start at branch scale while existing and standalone parts keep their size',()=>{
 const f=testStem(),b=f.branches[0],o=addTestFoliage(f,b.id,1);fitFloraSurfacePart(f,o);
 assert.ok(o.scale[0]<1);assert.ok(o.scale.every(s=>s===o.scale[0]));
 const leaf=addFloraAsset(f,b.id,'flora-ginkgo-leaf',1),largeScale=[...leaf.scale];b.radii=b.radii.map(()=>.015);const small=addFloraAsset(f,b.id,'flora-ginkgo-leaf',1);
 assert.ok(small.scale[0]<=largeScale[0]);assert.deepEqual(leaf.scale,largeScale);
 const blank=defaultFlora(),standalone=addFloraAsset(blank,blank.branches[0].id,'flora-ginkgo-leaf');assert.deepEqual(standalone.scale,[1,1,1]);
 validateFlora(f);
});


test('deleting a joint retains children at surviving joints and remaps surface pins',()=>{
 const f=testStem(),b=f.branches[0];b.points=[[0,0,0],[0,1,0],[0,2,0],[0,4,0],[0,5,0]];b.radii=[.3,.25,.2,.15,.1];b.jointRotations={1:[0,.3,0],3:[0,.8,0]};
 const early=addFloraAsset(f,b.id,'flora-ginkgo-leaf',.25),late=addFloraAsset(f,b.id,'flora-ginkgo-leaf',.75),tip=addFloraAsset(f,b.id,'flora-ginkgo-leaf',1),surface=addFloraAsset(f,b.id,'flora-ginkgo-leaf',.8,0,{branch:b.id,at:.8,branchSurface:{angle:0}}),positions=[early,late,tip].map(o=>floraOrganPosition(f,o));
 assert.equal(removeFloraJoint(f,b.id,2),true);
 assert.deepEqual([early.at,late.at,tip.at],[1/3,2/3,1]);for(const [i,o] of [early,late,tip].entries())assert.ok(floraOrganPosition(f,o).distanceTo(positions[i])<1e-6);
 assert.deepEqual(b.jointRotations,{1:[0,.3,0],2:[0,.8,0]});assert.ok(surface.at>0&&surface.at<1);validateFlora(f);
 const before=JSON.stringify(f);assert.equal(removeFloraJoint(f,b.id,0),false);assert.equal(JSON.stringify(f),before);
});

test('deleting the tip clamps its attachments to the new tip without invalidating the plant',()=>{
 const f=testStem(),b=f.branches[0],leaf=addFloraAsset(f,b.id,'flora-ginkgo-leaf',1);
 assert.equal(removeFloraJoint(f,b.id,2),true);assert.equal(leaf.at,1);assert.ok(floraOrganPosition(f,leaf).distanceTo(floraCurve(f,b.id).getPoint(1))<1e-6);validateFlora(f);
});


test('new foliage fits the local skeletal girth rather than the entire preset bounds',()=>{
 const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,'flora-forked-bough'),joints=floraAsset(root.asset).skeleton,tip=joints.reduce((a,b)=>a.radius<b.radius?a:b),base=joints.find(n=>!n.parent);
 const at=socket=>floraSurfaceTarget(f,{branch:root.branch,at:0,organ:root.id,socket:socket.id}),small=addFloraAsset(f,root.branch,'flora-ginkgo-leaf',0,0,at(tip)),large=addFloraAsset(f,root.branch,'flora-ginkgo-leaf',0,0,at(base));
 assert.ok(small.scale[0]<large.scale[0]);const size=[...large.scale];root.controls={[base.id]:{offset:[0,0,0],rotation:[0,0,0],scale:[2,2,2]}};fitFloraSurfacePart(f,large);assert.ok(large.scale[0]>size[0]);validateFlora(f);
});
