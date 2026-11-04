import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {kotorPlatformDefaults,kotorRailingDefaults,KOTOR_KASHYYYK_STYLE,kotorRailLayout,KOTOR_LIP,buildKotorRails} from '../src/routes/kotor-kashyyyk.js';
import {KOTOR_KASHYYYK_SOURCE as source} from '../src/routes/data/kotor-kashyyyk-source.js';
import {wovenPlatformsFixture} from './fixtures/woven-platforms-fixture.js';
import {platformMaterialPart} from '../src/platforms/platform-finishes.js';
import {routeMeshPart,routeFinishParts} from '../src/routes/route-finishes.js';
import {editMaterial,materialTargets} from '../src/editor/material-editing.js';
import {platformRailSpans} from '../src/platforms/platform.js';
import {groundAt,moveWalker} from '../src/walk/walk-physics.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {curveMeshPoint} from '../src/routes/curved-route.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {weldSurface,assertClosedSurface} from '../src/collision/collision-geometry.js';
const project=parts=>({format:'open-building-studio',version:1,name:'KOTOR kit',parts});

test('boardwalk underside UVs have area and metre-based density on flat and curved decks',()=>{
 for(const angle of [0,1.5,-1.5]){const p=route('landing',0,angle),root=buildPart(p,{collision:false});try{
  let checked=0;for(const mesh of meshes(root).filter(m=>m.userData.routeFloor&&routeMeshPart(m)==='underbody')){const g=mesh.geometry,pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pos.count;i+=3){const a=new T.Vector3().fromBufferAttribute(pos,i),b=new T.Vector3().fromBufferAttribute(pos,i+1),c=new T.Vector3().fromBufferAttribute(pos,i+2),normal=T.Triangle.getNormal(a,b,c,new T.Vector3());if(normal.y>-.5)continue;const area=new T.Triangle(a,b,c).getArea(),uvArea=Math.abs((uv.getX(i+1)-uv.getX(i))*(uv.getY(i+2)-uv.getY(i))-(uv.getY(i+1)-uv.getY(i))*(uv.getX(i+2)-uv.getX(i)))/2;assert.ok(uvArea>area*.05&&uvArea<area,'underside texture must not collapse or stretch');checked++;}}
  assert.ok(checked>0);
 }finally{disposePart(root);}}
});
test('curved KOTOR construction volumes follow the rendered rails without leaving straight invisible barriers',()=>{
 for(const bend of [-2.1,2.1])for(const [kind,rise] of [['landing',0],['ramp',1],['stairs',1.5],['stairs',-1.5]]){
  const p=makePart('stair-route',{position:[11,20,-8],rotation:[0,.4,0],scale:[1.2,1,.8],route:{width:3.6,thickness:.35,gap:0,segments:[{kind,run:5.2,rise,steps:20,turn:'straight',curveAngle:bend,railing:kotorRailingDefaults()}]}}),root=buildPart(p,{collision:'sync'}),collision=createWalkCollision([root]),matrix=partMatrix(p),at=z=>new T.Vector3(...curveMeshPoint(0,rise*z/5.2,z,5.2,bend)).applyMatrix4(matrix);root.updateMatrixWorld(true);
  try{for(const m of root.children.filter(m=>m.userData.structuralVolume))assert.doesNotThrow(()=>assertClosedSurface(weldSurface([m.userData.structuralVolume])),'closed curved rail hint');let feet=at(.08);feet.y=groundAt(collision,feet,.4,.4).point.y;
   for(let i=1;i<=30;i++){const target=at(.08+5.04*i/30);for(let j=0;j<24&&feet.clone().setY(0).distanceTo(target.clone().setY(0))>.035;j++)feet=moveWalker(collision,feet,target.clone().sub(feet).setY(0).normalize().multiplyScalar(.025));assert.ok(feet.clone().setY(0).distanceTo(target.clone().setY(0))<.04,kind+' curve '+bend+' reaches sample '+i);}
  }finally{disposePart(root);}
 }
});
function platform(kind='rectangle'){const p=makePart('platform',{color:'#ffffff',position:[0,8,0]});Object.assign(p.platform,kotorPlatformDefaults());Object.assign(p.platform.sections[0],{kind,width:12,depth:kind==='half-circle'?6:12});return p;}
function route(kind='landing',rise=0,curveAngle=0){return makePart('stair-route',{color:'#ffffff',position:[0,8,0],route:{width:4,thickness:.5,gap:.15,segments:[{kind,run:12,rise,steps:8,turn:'straight',...(curveAngle?{curveAngle}:{}),railing:kotorRailingDefaults()}]}});}
function meshes(g){const m=[];g.traverse(o=>{if(o.isMesh)m.push(o);});return m;}
function bounds(g){const a=g.attributes.position;for(const v of a.array)assert.ok(Number.isFinite(v));assert.equal(g.attributes.uv.count,a.count);const n=g.attributes.normal;for(const v of n.array)assert.ok(Number.isFinite(v));}

test('KOTOR handrail side faces point outward and remain visible from outside at every heading and slope',()=>{
 for(const [a,b] of [[[0,0,0],[0,0,20]],[[3,7,-2],[19,11,10]],[[8,12,6],[-9,5,-7]]]){
  const group=new T.Group(),start=new T.Vector3(...a),end=new T.Vector3(...b),axis=end.clone().sub(start).normalize();
  buildKotorRails(group,[[start,end]]);group.updateMatrixWorld(true);
  try{const rails=meshes(group).filter(m=>m.geometry.userData.bridgePart==='rails'),shells=rails.filter(m=>m.geometry.attributes.position.count===36);assert.ok(shells.length>=6);
   for(const mesh of shells){const pos=mesh.geometry.attributes.position,points=Array.from({length:pos.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i)),along=points.map(p=>p.dot(axis)),lo=Math.min(...along),hi=Math.max(...along),ring=value=>{const vertices=points.filter((p,i)=>Math.abs(along[i]-value)<.08);return vertices.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(vertices.length);},line=new T.Line3(ring(lo),ring(hi));
    for(let i=0;i<pos.count;i+=3){const tri=points.slice(i,i+3),center=tri.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(3),normal=T.Triangle.getNormal(...tri,new T.Vector3()),outward=center.clone().sub(line.closestPointToPoint(center,false,new T.Vector3())).normalize();
     assert.ok(normal.dot(outward)>.5,'rail side normal points away from the beam axis');
     const ray=new T.Raycaster(center.clone().addScaledVector(outward,.03),outward.clone().negate(),0,.05),hit=ray.intersectObject(mesh)[0];
     assert.ok(hit&&hit.point.distanceTo(center)<1e-5,'the exterior face is visible with front-face culling');
    }
   }
  }finally{disposePart(group);}
 }
});

test('KOTOR kit retains authored low-poly wood profiles and atlas UVs without importing lamps or struts',()=>{
 assert.ok(source.postHeight>1.1&&source.postHeight<1.3);assert.equal(source.post[0].positions.length/9,12);assert.equal(source.post[1].positions.length/9,6);assert.equal(source.rail[0].positions.length/9,12);
 for(const part of [...source.post,...source.rail]){assert.equal(part.positions.length/3,part.uv.length/2);assert.ok(part.positions.every(Number.isFinite));}
 const p=platform(),g=buildPart(p);try{const m=meshes(g),tags=new Set(m.map(platformMaterialPart));assert.deepEqual([...tags].sort(),['base','railings','top']);assert.ok(!m.some(m=>/lamp|lantern|strut/i.test(m.name)));assert.ok(m.every(m=>m.material.map));assert.ok(m.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)<1300);m.forEach(m=>bounds(m.geometry));const post=m.find(m=>m.geometry.userData.bridgePart==='posts');assert.deepEqual(Array.from(post.geometry.attributes.uv.array),Array.from(new Float32Array(source.post[0].uv)));}finally{disposePart(g);}
});

test('all platform footprints stay closed, material parts separate and supports optional',()=>{
 for(const kind of ['rectangle','circle','half-circle'])for(const supports of [false,true]){
  const p=platform(kind);p.platform.supports=supports;const g=buildPart(p,{batch:true});try{const m=meshes(g),tags=new Set(m.map(platformMaterialPart));assert.equal(tags.has('pillars'),supports);assert.ok(tags.has('top')&&tags.has('base')&&tags.has('railings'));m.forEach(m=>bounds(m.geometry));if(supports){g.updateMatrixWorld(true);for(const mesh of m.filter(m=>platformMaterialPart(m)==='pillars')){mesh.geometry.computeBoundingBox();assert.ok(Math.abs(mesh.geometry.boundingBox.min.y+p.position[1])<1e-4);}}}finally{disposePart(g);}assert.equal(validateProject(JSON.parse(JSON.stringify(project([p])))).parts[0].platform.style,KOTOR_KASHYYYK_STYLE);
 }
});

test('walkways follow flats, curved floors, ascending / descending ramps and steps with independently finishable wood',()=>{
 for(const [kind,rise,angle] of [['landing',0,0],['landing',0,Math.PI/2],['ramp',2,0],['ramp',-2,Math.PI/2],['stairs',2,0],['stairs',-2,-Math.PI/2]]){
  const p=route(kind,rise,angle);validateProject(project([p]));assert.deepEqual(routeFinishParts(p.route.segments[0]),['deck','underbody','rails','posts']);const g=buildPart(p);
  try{const m=meshes(g),parts=new Set(m.map(routeMeshPart));assert.deepEqual([...parts].sort(),['deck','posts','rails','underbody']);m.forEach(m=>bounds(m.geometry));assert.ok(m.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)<2000);
   // There is one source floor shell, not an imported overlapping top skin.
   const floors=m.filter(m=>m.userData.routeFloor);assert.equal(floors.length,2);assert.deepEqual(floors.map(routeMeshPart).sort(),['deck','underbody']);if(angle)assert.ok(m.every(m=>m.userData.routeCurved));
  }finally{disposePart(g);}
 }
});

test('native finishes support independent painting, undo and save / load',()=>{
 for(const p of [platform(),route()]){
  const h=new History();h.push(project([p]));const keys=p.platform?['top','base','railings']:['deck','underbody','rails','posts'];
  const targets=materialTargets(p).map(([key])=>key);for(const key of keys)assert.ok(targets.includes(key),key);
  for(const [i,key] of keys.entries())editMaterial(p,key,{color:['#aa3311','#227744','#7799aa','#883377'][i],preset:'wood',scale:1.5});h.push(project([p]));const undone=h.undo().parts[0];assert.equal(undone.platform?.componentFinishes??undone.route?.segments[0]?.componentFinishes,undefined);
  const loaded=validateProject(JSON.parse(JSON.stringify(project([p])))).parts[0],g=buildPart(loaded);try{for(const m of meshes(g)){assert.equal(m.material.map.userData.surfacePreset,'wood');assert.equal(m.material.userData.surfaceScale,1.5);}}finally{disposePart(g);}
 }
});

test('tinting KOTOR wood preserves its original maps and atlas UVs',()=>{
 const p=route(),before=buildPart(p);editMaterial(p,'posts',{color:'#775533'});const after=buildPart(p);try{const a=meshes(before).filter(m=>routeMeshPart(m)==='posts'),b=meshes(after).filter(m=>routeMeshPart(m)==='posts');assert.equal(a.length,b.length);for(let i=0;i<a.length;i++){assert.equal(a[i].material.map,b[i].material.map);assert.deepEqual(Array.from(a[i].geometry.attributes.uv.array),Array.from(b[i].geometry.attributes.uv.array));assert.equal(b[i].material.color.getHexString(),'775533');}}finally{disposePart(before);disposePart(after);}
});

test('ordinary walking crosses the native deck dividers and linked platforms',()=>{
 const p=wovenPlatformsFixture(),parts=p.parts.filter(p=>p.type!=='character-reference'),groups=parts.map(part=>buildPart(part,{parts:p.parts,batch:true}));groups.forEach(g=>g.updateMatrixWorld(true));
 try{let feet=new T.Vector3(-4,6,-12);feet.copy(groundAt(groups,feet,.5,1).point);for(let i=0;i<130;i++)feet.copy(moveWalker(groups,feet,new T.Vector3(0,0,.2)));assert.ok(feet.z>13.9);assert.ok(Math.abs(feet.y-6)<.05);}finally{groups.forEach(disposePart);}
});

test('demo links open the platform railings and preserve the reusable shapes',()=>{
 const p=wovenPlatformsFixture();validateProject(p);assert.equal(p.parts.filter(p=>p.platform).length,3);assert.equal(p.parts.filter(p=>p.route).length,2);assert.ok(p.parts.filter(p=>p.platform).every(p=>!p.platform.supports));for(const part of p.parts.filter(p=>p.platform)){const open=platformRailSpans(part,p.parts).reduce((n,[a,b])=>n+a.distanceTo(b),0),closed=platformRailSpans(part).reduce((n,[a,b])=>n+a.distanceTo(b),0);assert.ok(open<closed-3);}
});

test('irregular bays are repeatable, pin corners, and do not inherit circle tessellation spacing',()=>{
 const line=[[new T.Vector3(0,0,0),new T.Vector3(0,0,18)]],a=kotorRailLayout(line),b=kotorRailLayout(line);
 assert.deepEqual(a,b);const nodes=a[0].nodes,gaps=nodes.slice(1).map((n,i)=>n.d-nodes[i].d);
 assert.ok(Math.max(...gaps)-Math.min(...gaps)>.3);assert.ok(Math.max(...nodes.map(n=>n.height))-Math.min(...nodes.map(n=>n.height))>.1);assert.ok(Math.max(...nodes.map(n=>n.rail))-Math.min(...nodes.map(n=>n.rail))>.07);
 assert.deepEqual(nodes[0].point.toArray(),[0,0,0]);assert.deepEqual(nodes.at(-1).point.toArray(),[0,0,18]);
 const p=platform('circle'),spans=platformRailSpans(p),run=kotorRailLayout(spans)[0];assert.equal(run.closed,true);assert.ok(run.nodes.length<spans.length);assert.deepEqual(run.nodes[0].point.toArray(),run.nodes.at(-1).point.toArray());
 const corner=kotorRailLayout([[new T.Vector3(0,0,0),new T.Vector3(0,0,8)],[new T.Vector3(0,0,8),new T.Vector3(8,0,8)]])[0];assert.ok(corner.nodes.some(n=>n.point.distanceTo(new T.Vector3(0,0,8))<1e-5));
});

test('posts stand inside the raised lip and lips end at walking openings with separate deck finishes',()=>{
 for(const p of [platform(),platform('circle'),platform('half-circle'),route()]){
  const g=buildPart(p);g.updateMatrixWorld(true);
  try{const lip=meshes(g).filter(m=>m.userData.kotorLip),posts=meshes(g).filter(m=>m.userData.kotorPost);assert.ok(lip.length&&posts.length);
   for(const m of lip){m.geometry.computeBoundingBox();assert.ok(Math.abs(m.geometry.boundingBox.max.y-KOTOR_LIP.height)<1e-5);assert.equal(p.platform?platformMaterialPart(m):routeMeshPart(m),p.platform?'top':'deck');}
   for(const m of posts){const base=m.userData.kotorPost.base;assert.ok(Math.abs(base[1]-KOTOR_LIP.height)<1e-5);const origin=new T.Vector3(...base).applyMatrix4(g.matrixWorld).add(new T.Vector3(0,.02,0)),hit=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,.05).intersectObjects(lip)[0];assert.ok(hit,'the post actually rests on the lip');}
   assert.ok(posts[0].userData.kotorPost.height!==posts[2].userData.kotorPost.height);
  }finally{disposePart(g);}
 }
 const demo=wovenPlatformsFixture(),p=demo.parts.find(p=>p.name==='KOTOR · circular lookout'),g=buildPart(p,{parts:demo.parts});g.updateMatrixWorld(true);try{const lip=meshes(g).filter(m=>m.userData.kotorLip),origin=new T.Vector3(-4,6.2,8.99);assert.equal(new T.Raycaster(origin,new T.Vector3(0,-1,0),0,.3).intersectObjects(lip).length,0,'lip leaves the linked entry open');}finally{disposePart(g);}
});
