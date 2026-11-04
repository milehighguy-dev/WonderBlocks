import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {FELUCIA_FLORA_PARTS} from '../src/flora/felucia-flora.js';
import {FLORA_TREE_PRESETS,instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {floraAsset,floraPlacementCategory,floraIconUrl} from '../src/flora/flora-palette.js';
import {floraSockets,floraOrganMatrix,addFloraAsset,updateFloraPreview,validateFlora,removeFloraPart,branchGeometry,floraAttachmentFrame,floraOrganPosition,defaultFlora,floraNeedsWeld} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {floraMuscleShape} from '../src/flora/flora-muscle.js';
import {testStem} from './flora-fixtures.js';

test('Felucia reusable organs preserve native UVs and distinguish cutouts from opaque pod skins',()=>{
 assert.equal(FELUCIA_FLORA_PARTS.filter(a=>!a.profile&&!a.paletteHidden).length,15);
 for(const asset of FELUCIA_FLORA_PARTS.filter(a=>!a.profile)){
  assert.equal(floraPlacementCategory(asset),'Surface parts');assert.equal(floraSockets(asset.id).length,0);
  assert.ok(fs.existsSync(new URL(floraIconUrl(asset))));
  assert.ok(asset.triangles<=320);assert.equal(!!asset.alphaMap(),asset.cutout);
  const map=asset.textureMap();assert.equal(map.colorSpace,T.SRGBColorSpace);assert.equal(map.wrapS,T.RepeatWrapping);assert.equal(map.wrapT,T.RepeatWrapping);if(asset.alphaMap()){assert.equal(asset.alphaMap().wrapS,T.RepeatWrapping);assert.equal(asset.alphaMap().wrapT,T.RepeatWrapping);}
  for(let i=3;i<map.image.data.length;i+=4)assert.equal(map.image.data[i],255);
  for(const mesh of asset.meshes){assert.equal(mesh.positions.length,mesh.normals.length);assert.equal(mesh.uv.length,mesh.positions.length/3*2);assert.ok(mesh.positions.every(Number.isFinite));}
  const f=testStem(),o=addFloraAsset(f,f.branches[0].id,asset.id,.5),part=makePart('flora',{flora:f}),group=buildPart(part,{floraEditing:true,floraLive:true});
  const organ=group.children.find(g=>g.userData.floraOrgan===o.id),material=organ.children[0].material;
  assert.equal(!!material.alphaMap,asset.cutout);assert.equal(material.alphaTest,asset.cutout?.45:0);assert.equal(material.map,map);
  disposePart(group);
 }
});

test('Felucia presets retain their native organs while edits move attached pieces immediately',()=>{
 const presets=FLORA_TREE_PRESETS.filter(p=>p.planet==='Felucia');assert.equal(presets.length,6);
 for(const preset of presets){
  const part=makePart('flora',instantiateFloraTreePreset(preset.id)),f=part.flora;
  assert.ok(f.branches.every(b=>!b.anchor&&floraAsset(b.profile)?.profile));
  assert.ok(f.organs.every(o=>floraAsset(o.asset)&&!o.billboard));assert.ok(!f.organs.some(o=>['felucia-ground-fronds','felucia-mottled-leaves'].includes(o.asset))); 
  const group=buildPart(part,{floraEditing:true,floraLive:true}),o=f.organs.find(o=>o.at>0),b=f.branches.find(b=>b.id===o.branch),before=floraOrganMatrix(f,o).clone();
  b.points[Math.round(o.at*(b.points.length-1))][0]+=.8;validateFlora(f);updateFloraPreview(group,f,b.id);
  const after=floraOrganMatrix(f,o),attachment=group.children.find(g=>g.userData.floraOrgan===o.id);
  assert.ok(!before.equals(after));assert.ok(attachment.matrix.equals(after));
  assert.deepEqual(attachment.children[0].geometry.attributes.position.array,Float32Array.from(floraAsset(o.asset).meshes[0].positions));
  const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Felucia',parts:[part]})));
  assert.deepEqual(saved.parts[0].flora.organs.map(o=>o.asset),f.organs.map(o=>o.asset));disposePart(group);
 }
});

test('decorations pin to Felucia vessel skins and follow host transforms without introducing joints',()=>{
 const f=instantiateFloraTreePreset('felucia-inflated-pod-plant').flora,host=f.organs.find(o=>o.asset==='felucia-inflated-pod');
 const child=addFloraAsset(f,host.branch,'felucia-hanging-whiskers',host.at,0,{organ:host.id,surface:{mesh:0,triangle:40,bary:[.2,.3,.5]}}),before=floraOrganMatrix(f,child);
 host.rotation[1]+=.7;host.scale=host.scale.map(v=>v*1.2);host.offset[0]+=.4;
 assert.ok(!before.equals(floraOrganMatrix(f,child)));assert.equal(child.socket,undefined);assert.equal(floraSockets(host.asset).length,0);
 assert.doesNotThrow(()=>validateFlora(f));
 const group=buildPart(makePart('flora',{flora:f}),{floraEditing:true,floraLive:true});assert.ok(group.children.some(g=>g.userData.floraOrgan===child.id));disposePart(group);
 removeFloraPart(f,host.id);assert.ok(!f.organs.some(o=>o.id===host.id||o.id===child.id));assert.doesNotThrow(()=>validateFlora(f));
});


test('Golden Whisker separates a textured base trunk from its pinned crown and whisker details through joint edits and finishing',()=>{
 const f=instantiateFloraTreePreset('felucia-golden-whisker-plant').flora,b=f.branches[0],asset=floraAsset(b.profile),shape=floraMuscleShape(b.profile);
 assert.equal(b.profile,'felucia-whisker-stalk');assert.equal(b.points.length,5);assert.equal(f.organs.length,6);assert.equal(floraNeedsWeld(f),false);
 const native=branchGeometry(f,b);assert.equal(native.index.count,asset.meshes[0].indices.length);assert.ok(Math.max(...asset.meshes[0].positions.filter((_,i)=>i%3===1))<=shape.length+1e-5);assert.equal(floraAsset('felucia-whisker-crown').paletteCategory,'Details');
 for(let i=0;i<shape.mesh.positions.length;i++)assert.ok(Math.abs(native.attributes.position.array[i]-shape.mesh.positions[i]*shape.length)<2e-6,'Native silhouette must survive neutral placement');
 assert.deepEqual([...native.attributes.uv.array],Array.from(Float32Array.from(shape.mesh.uv)));native.dispose();
 const rootMatrices=f.organs.map(o=>floraOrganMatrix(f,o).clone());
 for(const edit of [()=>b.points[3][0]+=.7,()=>b.radii[3]*=1.5,()=>b.jointRotations={3:[0,.9,.3]}]){
  edit();validateFlora(f);
  for(const o of f.organs){assert.ok(o.branchSurface.pin);assert.equal(o.branchSurface.followFrame,true);assert.deepEqual(o.offset,[0,0,0]);
   const mounted=new T.Vector3().setFromMatrixPosition(floraAttachmentFrame(f,o));assert.ok(mounted.distanceTo(floraOrganPosition(f,o))<1e-8,'Whisker root must remain on its actual deformed skin triangle');
   const source=floraAsset(o.asset).meshes[0],highest=Math.max(...source.positions.filter((_,i)=>i%3===1)),root=new T.Vector3();let count=0;
   for(let i=0;i<source.positions.length;i+=3)if(source.positions[i+1]>=highest-.025){root.add(new T.Vector3().fromArray(source.positions,i));count++;}
   root.divideScalar(count);if(o.asset==='felucia-whisker-crown')root.set(0,0,0);root.applyMatrix4(floraOrganMatrix(f,o));
   const rendered=branchGeometry(f,b),contact=new T.Vector3(),pin=o.branchSurface.pin;
   for(let i=0;i<3;i++)contact.addScaledVector(new T.Vector3().fromBufferAttribute(rendered.attributes.position,rendered.index.getX(pin.triangle*3+i)),pin.bary[i]);
   assert.ok(root.distanceTo(contact)<(o.depth||0)+1e-5,'Rendered strand root must physically touch the rendered skin after bending, thickness and twist');rendered.dispose();
  }
 }
 assert.ok(f.organs.every((o,i)=>!floraOrganMatrix(f,o).equals(rootMatrices[i])));
 for(const live of [true,false]){const group=buildPart(makePart('flora',{flora:f}),{floraEditing:live,floraLive:live}),skin=group.children.find(m=>m.userData.floraBranch===b.id);assert.ok(skin);assert.equal(skin.material.map,asset.textureMap());assert.equal(skin.userData.floraWeldSource,false);assert.equal(skin.material.userData.walkCollision,true);assert.deepEqual([...skin.geometry.attributes.uv.array],Array.from(Float32Array.from(shape.mesh.uv)));disposePart(group);}
 const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Golden',parts:[makePart('flora',{flora:f})]})));assert.deepEqual(saved.parts[0].flora,f);
});

test('the native Golden Whisker palette part retains its full joint chain when dragged into an empty plant',()=>{
 const f=defaultFlora(),b=addFloraAsset(f,f.branches[0].id,'felucia-whisker-stalk');assert.equal(f.branches.length,1);assert.equal(b.points.length,5);assert.equal(b.parent,null);assert.doesNotThrow(()=>validateFlora(f));
 const o=addFloraAsset(f,b.id,'felucia-hanging-whiskers',.9,0,{at:.9,branchSurface:{angle:0,pin:{triangle:40,bary:[.2,.3,.5]}}});assert.equal(o.branchSurface.followFrame,true);assert.doesNotThrow(()=>validateFlora(f));
});


test('trimmed vessels have their mounting neck at the origin, and Scarlet petals follow the complete calyx',()=>{
 for(const id of ['felucia-flared-pitcher','felucia-slender-pitcher','felucia-inflated-pod','felucia-flower-pod','felucia-flower-calyx']){const a=floraAsset(id),ys=a.meshes[0].positions.filter((_,i)=>i%3===1);assert.equal(Math.min(...ys),0,id+' must not retain a cropped stalk below its mount');}
 const f=instantiateFloraTreePreset('felucia-scarlet-bloom-plant').flora,calyx=f.organs.find(o=>o.asset==='felucia-flower-calyx'),petals=f.organs.find(o=>o.asset==='felucia-scarlet-flower');
 assert.equal(petals.parentOrgan,calyx.id);assert.ok(petals.pin);assert.ok(calyx.branchSurface.pin);
 assert.ok(floraOrganMatrix(f,petals).elements.every((v,i)=>Math.abs(v-floraOrganMatrix(f,calyx).elements[i])<1e-5),'Native calyx and petals must align in the same authored frame');
 const before=floraOrganMatrix(f,petals);calyx.rotation[2]+=.6;calyx.scale=calyx.scale.map(x=>x*1.4);assert.ok(!before.equals(floraOrganMatrix(f,petals)));assert.doesNotThrow(()=>validateFlora(f));
 const group=buildPart(makePart('flora',{flora:f}),{floraEditing:true,floraLive:true});assert.ok(group.children.find(g=>g.userData.floraOrgan===petals.id));disposePart(group);
});


test('trimmed bulb and flower roots intersect the finished welded stalk rather than floating above it',()=>{
 for(const id of ['felucia-flared-pitcher-plant','felucia-slender-pitcher-plant','felucia-inflated-pod-plant','felucia-scarlet-bloom-plant']){
  const f=instantiateFloraTreePreset(id).flora,group=buildPart(makePart('flora',{flora:f}));group.updateMatrixWorld(true);
  for(const o of f.organs.filter(o=>o.branchSurface)){const root=floraOrganPosition(f,o);let distance=Infinity,signed=Infinity;
   group.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.floraComponent!=='bark')return;const positions=mesh.geometry.attributes.position,index=mesh.geometry.index;
    for(let i=0;i<(index?.count??positions.count);i+=3){const triangle=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(positions,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld))),point=triangle.closestPointToPoint(root,new T.Vector3()),d=point.distanceTo(root);if(d<distance){distance=d;signed=root.clone().sub(point).dot(triangle.getNormal(new T.Vector3()));}}
   });assert.ok(signed<=1e-5,id+' '+o.asset+' must enter the visible finished wood');
  }disposePart(group);
 }
});


test('pitcher feelers grow through the bulb interior and inherit the complete vessel pose, including their tips',()=>{
 for(const [id,vesselId,tip] of [
  ['felucia-flared-pitcher-plant','felucia-flared-pitcher',[3.425060587,7.7,.525441538]],
  ['felucia-slender-pitcher-plant','felucia-slender-pitcher',[-1.414,3.594,.374]]
 ]){
  const f=instantiateFloraTreePreset(id).flora,vessel=f.organs.find(o=>o.asset===vesselId),feeler=f.branches.find(b=>b.parentOrgan===vessel.id),cap=f.organs.find(o=>o.branch===feeler.id),asset=floraAsset(vesselId);
  assert.ok(feeler.pin);assert.equal(feeler.socket,undefined);assert.deepEqual(feeler.points[0],[0,0,0]);
  const local=floraOrganMatrix(f,vessel).invert().multiply(floraAttachmentFrame(f,feeler));
  assert.ok(new T.Vector3().setFromMatrixPosition(local).length()<.03,'Feeler starts inside the bulb mount, never beside the supporting trunk');
  const end=new T.Vector3(...feeler.points.at(-1)).applyMatrix4(local).add(new T.Vector3(...asset.anchor));
  assert.ok(end.distanceTo(new T.Vector3(...tip))<1e-6,'Stem follows the native vessel-relative curve');
  const relativeCap=floraOrganMatrix(f,vessel).invert().multiply(floraOrganMatrix(f,cap));
  const group=buildPart(makePart('flora',{flora:f}),{floraEditing:true,floraLive:true});
  for(const edit of [()=>vessel.offset[0]+=.7,()=>vessel.rotation[2]+=.6,()=>vessel.scale=[1.4,.75,1.2]]){
   edit();validateFlora(f);updateFloraPreview(group,f,vessel.id);
   const inverse=floraOrganMatrix(f,vessel).invert();
   for(const [actual,expected] of [[inverse.clone().multiply(floraAttachmentFrame(f,feeler)),local],[inverse.clone().multiply(floraOrganMatrix(f,cap)),relativeCap]])assert.ok(actual.elements.every((v,i)=>Math.abs(v-expected.elements[i])<1e-6),'Vessel edits must carry both the stalk and its cap in the original local pose');
   const branchMesh=group.children.find(m=>m.userData.floraBranch===feeler.id),capMesh=group.children.find(m=>m.userData.floraOrgan===cap.id);
   assert.ok(branchMesh.matrix.equals(floraAttachmentFrame(f,feeler)));assert.ok(capMesh.matrix.equals(floraOrganMatrix(f,cap)));
  }
  disposePart(group);
  const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Pitcher',parts:[makePart('flora',{flora:f})]})));
  assert.deepEqual(saved.parts[0].flora,f);
  removeFloraPart(f,vessel.id);assert.ok(!f.branches.some(b=>b.id===feeler.id));assert.ok(!f.organs.some(o=>o.id===cap.id));assert.doesNotThrow(()=>validateFlora(f));
 }
});
