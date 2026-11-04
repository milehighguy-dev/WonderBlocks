import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {defaultFlora,addFloraAsset,floraSharedJoint,floraJointSelection,floraSocketPose,floraOrganMatrix,floraCurve,floraSockets,floraBranchRadius,floraBranchScale,syncFloraSharedJoints,validateFlora,buildFlora,updateFloraPreview,reattachFloraPart,floraSurfaceTarget,removeFloraPart,replaceFloraAsset,floraBodyCaps,floraAttachmentFrame} from '../src/flora/flora.js';
import {floraBodyJointRadius,floraBodyField,floraBodyPinSurface,floraBodyGeometry,floraBodySurface} from '../src/flora/flora-body.js';
import {disposePart} from '../src/core/geometry.js';

const v=a=>new T.Vector3(...a),near=(a,b)=>assert.ok(a.distanceTo(b)<1e-6,`${a.toArray()} != ${b.toArray()}`);
function root(){const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-buttress-root');return {f,o};}
function jointWorld(f,o,id){return v(floraSocketPose(o,floraSockets(o.asset).find(n=>n.id===id)).point).applyMatrix4(floraOrganMatrix(f,o));}

test('a new native branch has exactly its two authored joints and shares its base with the host',()=>{
 const {f,o}=root(),b=addFloraAsset(f,o.branch,'flora-basic-branch',0,0,{organ:o.id,socket:'joint:0'});
 assert.equal(b.points.length,2);assert.deepEqual(floraJointSelection(f,{branch:b.id,index:0}),{organ:o.id,branch:o.branch,socket:'joint:0'});
 near(floraCurve(f,b.id).getPoint(0),jointWorld(f,o,'joint:0'));
 assert.ok(Math.abs(floraBranchRadius(b,0)-floraBodyJointRadius(o.asset,'joint:0'))<1e-7);
});
test('object groups placed on native branch tips align the base ball, with no extra connecting stalk',()=>{
 const f=defaultFlora(),b=addFloraAsset(f,f.branches[0].id,'flora-basic-branch'),o=addFloraAsset(f,b.id,'flora-forked-bough',1),root=floraSockets(o.asset).find(n=>!n.parent);
 assert.equal(o.mounted,true);assert.deepEqual(floraSharedJoint(f,o),{branch:b.id,index:1});
 near(jointWorld(f,o,root.id),floraCurve(f,b.id).getPoint(1));
 assert.deepEqual(floraJointSelection(f,{organ:o.id,branch:o.branch,socket:root.id}),{branch:b.id,index:1});
 o.offset=[0,2,0];o.depth=1;syncFloraSharedJoints(f);assert.deepEqual(o.offset,[0,0,0]);assert.equal(o.depth,undefined);near(jointWorld(f,o,root.id),floraCurve(f,b.id).getPoint(1));
});
test('shared joint girth follows the host through multiple object groups, whole-part scaling and save/load',()=>{
 const {f,o}=root(),b=addFloraAsset(f,o.branch,'flora-basic-branch',0,0,{organ:o.id,socket:'joint:1'}),assembly=addFloraAsset(f,b.id,'flora-forked-bough',1),tip=addFloraAsset(f,b.id,'flora-basic-branch',0,0,{organ:assembly.id,socket:'joint:2'});
 o.controls={'joint:1':{offset:[.4,.2,.3],rotation:[.2,.1,.3],scale:[1.5,1.5,1.5]}};b.radii[1]*=2;assembly.scale=assembly.scale.map(x=>x*1.7);syncFloraSharedJoints(f);validateFlora(f);
 near(floraCurve(f,b.id).getPoint(0),jointWorld(f,o,'joint:1'));
 near(jointWorld(f,assembly,'joint:0'),floraCurve(f,b.id).getPoint(1));
 near(floraCurve(f,tip.id).getPoint(0),jointWorld(f,assembly,'joint:2'));
 const pose=floraSocketPose(assembly,floraSockets(assembly.asset)[0]),actual=floraBodyJointRadius(assembly.asset,'joint:0')*pose.scale[0]*Math.cbrt(Math.abs(floraOrganMatrix(f,assembly).determinant()));
 assert.ok(Math.abs(actual-floraBranchRadius(b,1)*floraBranchScale(f,b))<1e-6);
 const restored=JSON.parse(JSON.stringify(f));validateFlora(restored);syncFloraSharedJoints(restored);assert.deepEqual(restored,f);
});

test('live preview refreshes a child base changed by host thickness',()=>{
 const {f,o}=root(),b=addFloraAsset(f,o.branch,'flora-basic-branch',0,0,{organ:o.id,socket:'joint:1'}),child=addFloraAsset(f,b.id,'flora-forked-bough',1),group=new T.Group();buildFlora(group,f,{}, {editable:true,live:true});
 try{const g=group.children.find(x=>x.userData.floraOrgan===child.id),body=g.children.find(x=>x.geometry.userData.floraBodyVolume),before=body.geometry;b.radii[1]*=1.8;syncFloraSharedJoints(f);updateFloraPreview(group,f,b.id);assert.notEqual(body.geometry,before);const settled=body.geometry;updateFloraPreview(group,f,b.id);assert.equal(body.geometry,settled);}finally{disposePart(group);}
});
test('joint thickness changes the shared ball without lengthening the outgoing branch',()=>{
 const {f,o}=root(),b=addFloraAsset(f,o.branch,'flora-basic-branch',0,0,{organ:o.id,socket:'joint:1'}),tip=floraCurve(f,b.id).getPoint(1),girth=floraBranchRadius(b,0)*floraBranchScale(f,b);
 o.controls={'joint:1':{offset:[0,0,0],rotation:[0,0,0],scale:[2,2,2]}};syncFloraSharedJoints(f);near(floraCurve(f,b.id).getPoint(1),tip);assert.ok(Math.abs(floraBranchRadius(b,0)*floraBranchScale(f,b)-girth*2)<1e-6);

});

test('bending an ancestor rebuilds adjacent seams and reuses unchanged distant meshes',()=>{
 const {f,o}=root();let parent=o;
 for(let i=0;i<4;i++){const sockets=floraSockets(parent.asset),tip=sockets.find(n=>n.parent&&!sockets.some(c=>c.parent===n.id)),b=addFloraAsset(f,parent.branch,'flora-basic-branch',0,0,{organ:parent.id,socket:tip.id});parent=addFloraAsset(f,b.id,'flora-forked-bough',1);parent.rotation=[i*.07,i*.13,i*.09];parent.scale=parent.scale.map(x=>x*1.1);}
 syncFloraSharedJoints(f);const group=new T.Group();buildFlora(group,f,{}, {editable:true,live:true});
 try{const ancestor=f.organs[1],descendants=group.children.filter(n=>n.userData.floraOrgan!==ancestor.id),before=descendants.map(n=>({node:n,matrix:n.matrix.clone(),geometry:n.geometry,children:n.children.map(c=>c.geometry)})),controls=JSON.stringify(f.organs.slice(2).map(o=>o.controls));
  ancestor.controls[floraSockets(ancestor.asset).find(n=>n.parent&&!floraSockets(ancestor.asset).some(c=>c.parent===n.id)).id]={offset:[.2,.15,.1],rotation:[.35,.2,.1],scale:[1,1,1]};syncFloraSharedJoints(f);updateFloraPreview(group,f,null,ancestor.id);
  assert.equal(JSON.stringify(f.organs.slice(2).map(o=>o.controls)),controls,'ancestor rotation must not introduce root-girth rounding drift');
  for(const old of before){const branch=f.branches.find(b=>b.id===old.node.userData.floraBranch),adjacent=branch&&branch.parentOrgan===ancestor.id;if(adjacent)assert.notEqual(old.node.geometry,old.geometry,'the changed attachment bend must rebuild its seam');else assert.equal(old.node.geometry,old.geometry);assert.deepEqual(old.node.children.map(c=>c.geometry),old.children);}
  assert.ok(before.some(old=>!old.node.matrix.equals(old.matrix)),'downstream meshes still move with the edited ancestor');
  const saved=JSON.stringify(f);syncFloraSharedJoints(f);assert.equal(JSON.stringify(f),saved);
 }finally{disposePart(group);}
});

test('whole object group scaling keeps its shared root girth even outside ordinary editable joint limits',()=>{
 const f=defaultFlora(),b=addFloraAsset(f,f.branches[0].id,'flora-basic-branch'),o=addFloraAsset(f,b.id,'flora-forked-bough',1);
 for(const radius of [.03,4])for(const scale of [.1,1,10]){b.radii[1]=radius;o.scale=[scale,scale,scale];syncFloraSharedJoints(f);validateFlora(f);
  const pose=floraSocketPose(o,floraSockets(o.asset)[0]),expected=floraBranchRadius(b,1)*floraBranchScale(f,b),actual=floraBodyJointRadius(o.asset,'joint:0')*pose.scale[0]*Math.cbrt(Math.abs(floraOrganMatrix(f,o).determinant()));assert.ok(Math.abs(actual-expected)<1e-6);
  const field=floraBodyField(o),cap=field.groups.flatMap(g=>g.caps).find(c=>c.length===0&&new T.Vector3(c.x,c.y,c.z).distanceTo(v(pose.point))<1e-8);assert.ok(Math.abs(cap.r*scale-expected)<1e-6,'generated root skin must use the fitted girth, not the old minimum scale');
  assert.deepEqual(validateFlora(JSON.parse(JSON.stringify(f))),f);
 }
});

test('a failed reattachment restores downstream shared joints as well as the dragged part',()=>{
 const f=defaultFlora(),a=addFloraAsset(f,f.branches[0].id,'flora-basic-branch'),body=addFloraAsset(f,a.id,'flora-forked-bough',1),child=addFloraAsset(f,a.id,'flora-basic-branch',0,0,{organ:body.id,socket:'joint:0'}),other=addFloraAsset(f,a.id,'flora-basic-branch',0);other.radii[1]=2;syncFloraSharedJoints(f);const before=structuredClone(f),childRadius=child.radii[0];
 assert.throws(()=>reattachFloraPart(f,body.id,{branch:other.id,at:2}));assert.deepEqual(f,before);assert.equal(child.radii[0],childRadius);validateFlora(f);
});

test('placing a surface part at a body joint projects its attachment onto the bark',()=>{
 for(const asset of ['flora-forked-bough','temp-base-fork']){const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,asset);for(const socket of floraSockets(asset)){const target=floraSurfaceTarget(f,{organ:o.id,branch:o.branch,socket:socket.id}),pin=target.surface;assert.ok(pin);const point=floraBodyPinSurface(o,pin).point;assert.ok(Math.abs(floraBodyField(o).distance(...point.toArray(),false))<.002);}}
});

test('reattached object groups and all socket descendants survive deleting the former host',()=>{
 const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,'flora-basic-branch'),old=addFloraAsset(f,root.id,'flora-basic-branch',1),body=addFloraAsset(f,old.id,'flora-forked-bough',1),child=addFloraAsset(f,old.id,'flora-basic-branch',0,0,{organ:body.id,socket:'joint:2'}),nested=addFloraAsset(f,old.id,'flora-hooked-branch',0,0,{organ:body.id,socket:'joint:3'}),leaf=addFloraAsset(f,old.id,'flora-ginkgo-leaf',0,0,{organ:nested.id,socket:'joint:1'}),other=addFloraAsset(f,root.id,'flora-basic-branch',0);other.points[1]=[2,2,0];
 reattachFloraPart(f,body.id,{branch:other.id,at:1});assert.equal(child.parent,other.id);assert.equal(nested.branch,other.id);assert.equal(leaf.branch,other.id);assert.ok(f.branches.indexOf(other)<f.branches.indexOf(child),'new branch owner serializes before its child');
 const matrix=floraOrganMatrix(f,nested).clone();removeFloraPart(f,old.id);validateFlora(f);assert.ok(f.organs.some(o=>o.id===body.id));assert.ok(f.branches.some(b=>b.id===child.id));assert.deepEqual(floraOrganMatrix(f,nested),matrix);const saved=JSON.parse(JSON.stringify(f));validateFlora(saved);near(floraCurve(saved,child.id).getPoint(0),jointWorld(saved,saved.organs.find(o=>o.id===body.id),'joint:2'));
});

test('changing a body style reprojects existing surface decorations onto its new bark',()=>{
 for(const socket of floraSockets('flora-forked-bough')){const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-forked-bough'),target=floraSurfaceTarget(f,{organ:o.id,branch:o.branch,socket:socket.id}),leaf=addFloraAsset(f,o.branch,'flora-ginkgo-leaf',0,0,target);replaceFloraAsset(f,o.id,'flora-hooked-branch');assert.equal(leaf.parentOrgan,o.id);const point=floraBodyPinSurface(o,leaf.pin).point;assert.ok(Math.abs(floraBodyField(o).distance(...point.toArray(),false))<.002);validateFlora(f);}
});

function continuedBody(){
 const f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'flora-twisting-stem'),nodes=floraSockets(o.asset),tip=nodes.at(-1);o.controls={};
 for(let i=1;i<nodes.length;i++)o.controls[nodes[i].id]={offset:v(nodes[0].point).add(new T.Vector3(0,i*.55,0)).sub(v(nodes[i].point)).toArray(),rotation:[0,0,0],scale:[1,1,1]};
 const b=addFloraAsset(f,o.branch,'flora-basic-branch',0,0,{organ:o.id,socket:tip.id});b.points[1]=new T.Vector3(1,0,0).transformDirection(floraAttachmentFrame(f,b).invert()).multiplyScalar(1.5).toArray();syncFloraSharedJoints(f);return {f,o,b,tip};
}
test('a body-preset continuation removes the unused rounded cap and projects surface pins to the shared section',()=>{
 const {f,o,tip}=continuedBody(),joins=floraBodyCaps(f,o),join=joins.find(j=>j.joint===tip.id),point=v(floraSocketPose(o,tip).point),normal=v(join.normal),radius=floraBodyJointRadius(o.asset,tip.id),probe=point.clone().addScaledVector(normal,radius*.75),plain=floraBodyField(o),joined=floraBodyField(o,joins);
 assert.ok(plain.distance(...probe.toArray(),false)<0,'the original terminal ball occupies the raised nub');assert.ok(joined.distance(...probe.toArray(),false)>radius*.7,'the continued part removes that unused hemisphere');
 const surface=floraBodySurface(o,probe,joins);assert.ok(Math.abs(joined.distance(...surface.point.toArray(),false))<.002);assert.ok(surface.normal.length()>.99);
 for(const p of [[0,0,0],[0,.7,0],[.1,1,0]])assert.equal(joined.distance(...p,false),plain.distance(...p,false),'distant authored skin stays unchanged');
 const geometry=floraBodyGeometry(o,'standard',joins);try{assert.ok(Array.from(geometry.attributes.normal.array).every(Number.isFinite));}finally{geometry.dispose();}
});
test('turning or deleting a continuation refreshes its parent body cap and restores the original free tip',()=>{
 const {f,o,b}=continuedBody(),group=new T.Group(),original=floraBodyGeometry(o);buildFlora(group,f,{}, {editable:true,live:true});const attachment=group.children.find(c=>c.userData.floraOrgan===o.id),mesh=attachment.children.find(m=>m.geometry.userData.floraBodyVolume),before=mesh.geometry;
 b.points[1]=new T.Vector3(0,0,1).transformDirection(floraAttachmentFrame(f,b).invert()).multiplyScalar(1.5).toArray();syncFloraSharedJoints(f);updateFloraPreview(group,f,b.id);assert.notEqual(mesh.geometry,before,'the adjoining preset cap responds to the new direction');
 removeFloraPart(f,b.id);updateFloraPreview(group,f);assert.deepEqual(Array.from(mesh.geometry.attributes.position.array),Array.from(original.attributes.position.array),'removing the branch restores the authored rounded free tip');original.dispose();disposePart(group);
});
