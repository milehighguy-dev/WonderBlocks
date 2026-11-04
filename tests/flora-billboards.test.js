import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {SWBF_BILLBOARD_PARTS,billboardCards,billboardTexture,validateBillboard,buildBillboardMesh,updateBillboardFacing} from '../src/flora/flora-billboards.js';
import {floraAsset,floraPlacementCategory,floraPaletteCategory,floraIconUrl} from '../src/flora/flora-palette.js';
import {addFloraAsset,floraSockets,floraOrganPosition,floraOrganMatrix,updateFloraPreview,replaceFloraAsset,validateFlora} from '../src/flora/flora.js';
import {testStem} from './flora-fixtures.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {swbfTreesDemo,exportBillboardPlant} from '../examples/generators/swbf-trees-demo.js';
import {exportOBJ} from '../src/export/export.js';

const uprightCard={...SWBF_BILLBOARD_PARTS[0].billboard,count:1,radius:0,height:0,minSize:3,maxSize:3,heightScale:1,facing:'upright',atlas:1,anchor:'bottom'};

test('repeated foliage patches cannot share per-draw transform uniforms',()=>{
 const shared=new T.MeshStandardMaterial({map:billboardTexture('yavin-leaves')}),a=buildBillboardMesh(uprightCard,shared),b=buildBillboardMesh(uprightCard,shared),group=new T.Group(),camera=new T.PerspectiveCamera();
 group.add(a,b);a.position.set(2,3,-1);b.position.set(-4,6,2);b.scale.setScalar(2);group.updateMatrixWorld(true);camera.position.set(7,4,10);camera.lookAt(0,3,0);camera.updateMatrixWorld(true);
 try{
  assert.notEqual(a.material,b.material,'each draw refreshes its own material uniforms');assert.equal(a.material.map,b.material.map,'texture uploads stay shared');assert.equal(a.material.customProgramCacheKey(),b.material.customProgramCacheKey(),'compiled shader programs stay shared');
  const shader=()=>({uniforms:{},vertexShader:'#include <defaultnormal_vertex>\n#include <begin_vertex>'}),sa=shader(),sb=shader();a.material.onBeforeCompile(sa);b.material.onBeforeCompile(sb);a.onBeforeRender(null,null,camera);const prior=sa.uniforms.billboardInverse.value.clone();b.onBeforeRender(null,null,camera);
  assert.deepEqual(sa.uniforms.billboardInverse.value.elements,prior.elements);assert.deepEqual(sa.uniforms.billboardInverse.value.elements,a.matrixWorld.clone().invert().elements);assert.deepEqual(sb.uniforms.billboardInverse.value.elements,b.matrixWorld.clone().invert().elements);assert.notEqual(sa.uniforms.billboardScale,sb.uniforms.billboardScale);
 }finally{for(const m of [a,b]){m.geometry.dispose();m.material.dispose();}shared.dispose();}
});

test('native foliage are joint-free Flora parts with original alpha cutouts',()=>{
 for(const a of SWBF_BILLBOARD_PARTS){assert.equal(floraPlacementCategory(a),'Surface parts');assert.deepEqual(floraSockets(a.id),[]);assert.ok(fs.existsSync(new URL(floraIconUrl(a))));assert.equal(billboardTexture(a.id).colorSpace,T.SRGBColorSpace);const mask=billboardTexture(a.id,true);assert.ok(mask.image.data.some((x,i)=>i%4===1&&x===0));assert.ok(mask.image.data.some((x,i)=>i%4===1&&x>200));}
 assert.equal(floraPaletteCategory(floraAsset('dagobah-vines')),'Leaves');
});
test('canopy layout is reproducible, bounded, and re-seeding changes its distribution',()=>{
 const s=SWBF_BILLBOARD_PARTS[0].billboard,cards=billboardCards(s);assert.deepEqual(cards,billboardCards({...s}));assert.notDeepEqual(cards,billboardCards({...s,seed:99}));
 for(const c of cards){assert.ok(Math.hypot(c.center[0],c.center[2])<=s.radius);assert.ok(Math.abs(c.center[1])<=s.height/2);assert.ok(c.width>=s.minSize&&c.width<=s.maxSize);assert.equal(c.height,c.width*s.heightScale);}
 for(const change of [{count:128.5},{radius:-1},{seed:NaN},{minSize:3,maxSize:2},{darknessMin:1,darknessMax:.5},{facing:'none'}])assert.throws(()=>validateBillboard({...s,...change}));
});
test('cards face the camera from every side without moving their centers, even in scaled rotated trees',()=>{
 const material=new T.MeshStandardMaterial(),mesh=buildBillboardMesh({...SWBF_BILLBOARD_PARTS[0].billboard,count:3},material),parent=new T.Group();parent.position.set(3,4,-2);parent.scale.set(2,3,4);parent.rotation.set(.2,.8,-.3);parent.add(mesh);mesh.rotation.set(.3,.2,.1);
 const camera=new T.PerspectiveCamera(45,1,.1,100);
 for(const position of [[20,10,2],[-10,12,18],[2,30,-15]]){camera.position.fromArray(position);camera.lookAt(3,4,-2);updateBillboardFacing(mesh,camera);const p=mesh.geometry.attributes.position;
  for(let i=0;i<3;i++){const points=Array.from({length:4},(_,j)=>new T.Vector3().fromBufferAttribute(p,i*4+j).applyMatrix4(mesh.matrixWorld)),center=points.reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(.25),expected=new T.Vector3(...mesh.geometry.userData.billboard.cards[i].center).applyMatrix4(mesh.matrixWorld),normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize(),back=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,2).normalize();assert.ok(center.distanceTo(expected)<1e-5);assert.ok(normal.dot(back)>.99999);for(const point of points)assert.ok(mesh.geometry.boundingSphere.containsPoint(point.clone().applyMatrix4(mesh.matrixWorld.clone().invert())));}
 }
 const version=mesh.geometry.attributes.position.version;updateBillboardFacing(mesh,camera);assert.equal(mesh.geometry.attributes.position.version,version,'unchanged camera must not rewrite the buffer');
});
test('upright foliage stays vertical while orbiting and fresh-camera raycasts pick visible cards',()=>{
 const mesh=buildBillboardMesh({...uprightCard,minSize:2,maxSize:2},new T.MeshStandardMaterial({side:T.DoubleSide})),camera=new T.PerspectiveCamera(45,1,.1,100);camera.position.set(6,5,0);camera.lookAt(0,0,0);updateBillboardFacing(mesh,camera);const positions=mesh.geometry.attributes.position,edge=new T.Vector3().fromBufferAttribute(positions,2).sub(new T.Vector3().fromBufferAttribute(positions,1));assert.ok(Math.abs(edge.x)<1e-6&&Math.abs(edge.z)<1e-6);
 camera.position.set(-6,3,0);camera.lookAt(0,1,0);camera.updateMatrixWorld();const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(0,0),camera);assert.ok(ray.intersectObject(mesh).length);assert.equal(mesh.castShadow,false);assert.equal(mesh.material.userData.walkCollision,false);
});
test('each foliage card chooses one native atlas shape; vines hang down and bottom anchors sit on their base',()=>{
 const mesh=buildBillboardMesh(SWBF_BILLBOARD_PARTS[0].billboard,new T.MeshStandardMaterial()),uv=mesh.geometry.attributes.uv;for(let i=0;i<uv.count;i+=4){assert.equal(uv.getX(i+1)-uv.getX(i),.5);assert.equal(uv.getY(i+2)-uv.getY(i+1),.5);}assert.ok(new Set(mesh.geometry.userData.billboard.cards.map(c=>c.tile)).size>1);
 for(const c of billboardCards({...SWBF_BILLBOARD_PARTS[3].billboard,height:0}))assert.equal(c.center[1]+c.height/2,0);
 for(const c of billboardCards(uprightCard))assert.equal(c.center[1]-c.height/2,0);
 const f=testStem(),o=addFloraAsset(f,f.branches[0].id,'yavin-leaves',.8,0,{branchSurface:{angle:1},at:.8}),up=new T.Vector3(0,1,0).transformDirection(floraOrganMatrix(f,o));assert.ok(up.y>.9999,'new canopy should be level when mounted to bark');
});
test('billboards retain camera behavior through batching, parent edits, live density updates, save and reload',()=>{
 const f=testStem(),b=f.branches[0],o=addFloraAsset(f,b.id,'yavin-leaves',1),p=makePart('flora',{flora:f,rotation:[.2,.3,.1],scale:[2,2,2]}),before=floraOrganPosition(f,o);b.points[2][0]+=1;assert.ok(before.distanceTo(floraOrganPosition(f,o))>.5);
 const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Leafpatch',parts:[p]})));
 for(const batch of [true,false]){const group=buildPart(saved.parts[0],{batch,floraLive:true}),cards=[];group.traverse(m=>{if(m.userData.floraBillboard)cards.push(m);});assert.equal(cards.length,1);assert.equal(cards[0].geometry.index.count,180);assert.equal(cards[0].material.alphaMap,billboardTexture(o.asset,true));assert.equal(createWalkCollision(cards).stats.meshesTested,0);const camera=new T.PerspectiveCamera();camera.position.set(12,8,-7);camera.lookAt(0,2,0);updateBillboardFacing(cards[0],camera);disposePart(group);}
 const live=buildPart(p,{floraEditing:true,floraLive:true});o.billboard.count=9;updateFloraPreview(live,f,null,o.id);let card;live.traverse(m=>{if(m.userData.floraBillboard)card=m;});assert.equal(card.geometry.index.count,54);disposePart(live);
 replaceFloraAsset(f,o.id,'flora-ginkgo-leaf');assert.equal(o.billboard,undefined);replaceFloraAsset(f,o.id,'dagobah-canopy');assert.equal(o.billboard.count,30);assert.doesNotThrow(()=>validateFlora(f));
});
test('recreated planet trees contain editable wood and ODF-sized billboards exported as card clusters',()=>{
 const project=swbfTreesDemo();assert.equal(project.parts.length,6);assert.equal(project.parts.filter(p=>p.flora.branches.some(b=>!b.anchor)).length,6);
 for(const p of project.parts){const group=buildPart(p,{floraLive:true}),exported=exportBillboardPlant(p,group);if(p.name.includes('Redwood')){assert.equal(exported.billboards.length,0);assert.ok(exported.meshes.length>1);}else assert.ok(exported.billboards.length);assert.ok(exported.billboards.every(b=>b.cards.length<=128));if(p.name.includes('Broadleaf')){assert.equal(exported.billboards.reduce((n,b)=>n+b.cards.length,0),90);assert.ok(p.flora.organs.every(o=>o.billboard.radius===12&&o.billboard.minSize===7));}disposePart(group);}
});
test('transparent areas of leaf cards let selection rays pass through to the wood',()=>{
 const mask=new T.DataTexture(new Uint8Array([0,0,0,255,255,255,255,255,0,0,0,255,255,255,255,255]),2,2,T.RGBAFormat),material=new T.MeshStandardMaterial({side:T.DoubleSide,alphaMap:mask,alphaTest:.45}),mesh=buildBillboardMesh({...uprightCard,anchor:'center',minSize:2,maxSize:2},material),camera=new T.PerspectiveCamera(45,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(const [x,expected] of [[-.5,0],[.5,1]]){const ray=new T.Raycaster(new T.Vector3(x,0,5),new T.Vector3(0,0,-1));ray.camera=camera;assert.equal(ray.intersectObject(mesh).length>0,!!expected);}
});
test('GPU facing is applied in the current draw and geometry exports freeze the requested view',()=>{
 const mesh=buildBillboardMesh({...uprightCard,anchor:'center'},new T.MeshStandardMaterial()),group=new T.Group(),camera=new T.PerspectiveCamera();group.add(mesh);camera.position.set(5,3,0);camera.lookAt(0,0,0);camera.updateMatrixWorld();group.updateMatrixWorld();
 const shader={uniforms:{},vertexShader:'#include <defaultnormal_vertex>\n#include <begin_vertex>'};mesh.material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('billboardInverse * vec4(billboardWorld'));const version=mesh.geometry.attributes.position.version;mesh.onBeforeRender(null,null,camera);assert.equal(mesh.geometry.attributes.position.version,version,'rendering must not wait for another GPU upload');assert.ok(shader.uniforms.billboardRight.value.distanceTo(new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0))<1e-8);
 const obj=exportOBJ(group,{camera}),vertices=obj.split('\n').filter(l=>l.startsWith('v ')).map(l=>new T.Vector3(...l.split(' ').slice(1).map(Number))),normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize(),back=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,2);assert.ok(normal.dot(back)>.8,'upright exported card faces the requested side');
});
