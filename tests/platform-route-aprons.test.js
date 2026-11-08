import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {platformPort,platformOutline,platformRailSpans} from '../src/platforms/platform.js';
import {kashyyykPlatformDefaults} from '../src/platforms/kashyyyk-platforms.js';
import {platformRouteAprons} from '../src/platforms/platform-route-aprons.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {groundAt,moveWalker} from '../src/walk/walk-physics.js';
import {reusableSceneParts} from '../src/editor/scene-render-dependencies.js';
import {kotorTexture} from '../src/materials/kotor-kashyyyk-textures.js';
import {buildKotorRails,kotorRailNode} from '../src/routes/kotor-kashyyyk.js';

function fixture(style,{end='start',width=2.4,edge=41,curve=0,scaled=false}={}){
 const platform=makePart('platform',{position:[30,12,-8],rotation:[0,.785,0],scale:scaled?[1.2,1,.8]:[1,1,1],color:'#ffffff'});
 Object.assign(platform.platform,kashyyykPlatformDefaults(style,20),{railing:'none'});
 Object.assign(platform.platform.sections[0],{kind:'circle',width:20,depth:scaled?24:20,z:6,rotation:scaled?.3:0});
 const ref={partId:platform.id,platformSection:platform.platform.sections[0].id,edge,edgeT:1},port=platformPort(platform,ref);
 const route=makePart('stair-route',{rotation:[0,port.angle,0],position:port.point.toArray(),route:{width,thickness:.2,gap:0,links:{[end]:ref},segments:[{kind:'landing',run:8,rise:0,steps:1,turn:'straight',...(curve?{curveAngle:curve}:{}),railing:{style:'none'}}]}});
 if(end==='end'){
  route.rotation[1]=port.angle+Math.PI-curve;
  const tip=new T.Vector3(...routeLayout(route.route)[0].end).applyMatrix4(partMatrix(route));
  route.position=new T.Vector3(...route.position).sub(tip.sub(port.point)).toArray();
 }
 return resolveRouteLinks([platform,route]);
}

test('round Kashyyyk junctions support the full route width at vertices, oblique ends and transformed decks',()=>{
 for(const style of ['kashyyyk-thatched','kashyyyk-timber'])for(const options of [{},{end:'end',width:5,edge:1,curve:.55},{scaled:true,width:4}]){
  const parts=fixture(style,options),[platform,route]=parts,ref=Object.values(route.route.links)[0],port=platformPort(platform,ref),end=options.end||'start';
  const root=buildPart(platform,{parts,collision:'sync'});root.updateMatrixWorld(true);
  try{
   const decks=root.children.filter(m=>m.geometry?.userData.platformPart==='deck'),apron=decks.find(m=>m.geometry.userData.platformApron);assert.ok(apron);assert.equal(apron.material.alphaTest,0);
   for(const mesh of decks){const a=mesh.geometry.attributes;assert.equal(a.position.count,a.normal.count);assert.equal(a.position.count,a.uv.count);assert.ok(a.normal.array.every(Number.isFinite));assert.ok(a.uv.array.every(Number.isFinite));}
   const row=routeLayout(route.route)[0],heading=route.rotation[1]+(end==='start'?row.heading:row.endHeading),inward=new T.Vector3(Math.sin(heading),0,Math.cos(heading)).multiplyScalar(end==='start'?-1:1),across=new T.Vector3(Math.cos(heading),0,-Math.sin(heading)),collision=createWalkCollision([root]);
   for(const fraction of [-.98,-.5,0,.5,.98])for(const distance of [.03,.2,.5,.8]){
    const point=port.point.clone().addScaledVector(across,row.width*fraction/2).addScaledVector(inward,distance),hits=new T.Raycaster(point.clone().add(new T.Vector3(0,.05,0)),new T.Vector3(0,-1,0),0,.1).intersectObjects(decks,false);
    assert.equal(hits.filter(h=>!h.object.material.alphaTest).length,1,'one opaque floor, without a coplanar overlay');
    const footing=groundAt(collision,point,.1,.2);assert.ok(footing,'prepared collision supports the entire junction');assert.ok(Math.abs(footing.point.y-port.point.y)<1e-4);
   }
  }finally{disposePart(root);}
 }
});

test('junction geometry follows linked route width and deletion without reusing a stale platform',()=>{
 const before=fixture('kashyyyk-thatched'),after=structuredClone(before);after[1].route.width=4;
 assert.equal(reusableSceneParts(before,after).has(before[0].id),false);
 assert.equal(reusableSceneParts(before,[before[0]]).has(before[0].id),false);
 const far=makePart('block',{position:[100,0,100]});assert.ok(reusableSceneParts([...before,far],[before[0],far]).has(far.id));
 const root=buildPart(before[0],{parts:[before[0]],collision:false});try{assert.ok(root.children.every(m=>!m.geometry.userData.platformApron));}finally{disposePart(root);}
 const [platform]=before;assert.equal(platformRouteAprons(platform,before,platformOutline(platform.platform),ref=>platformPort(platform,ref)).length,1);
});

test('a soldier can cross a thatched junction with its real KOTOR railing opening',()=>{
 const parts=fixture('kashyyyk-thatched',{width:5,edge:1}),[platform,route]=parts;platform.platform.railing='kotor-kashyyyk';route.route.segments[0].railing={style:'kotor-kashyyyk'};
 const roots=parts.map(p=>buildPart(p,{parts,collision:'sync'})),collision=createWalkCollision(roots),port=platformPort(platform,route.route.links.start),inward=new T.Vector3(-Math.sin(port.angle),0,-Math.cos(port.angle));
 try{let feet=port.point.clone().addScaledVector(inward,-1);for(let i=0;i<60;i++){feet=moveWalker(collision,feet,inward.clone().multiplyScalar(.05));const ground=groundAt(collision,feet,.2,.3);assert.ok(ground);feet.y=ground.point.y;}assert.ok(feet.clone().sub(port.point).dot(inward)>1.5,'railing guards leave the route entrance open');}finally{roots.forEach(disposePart);}
});

test('woven connectors continue the route texture and both perimeter rails reach its mouth',()=>{
 const parts=fixture('kashyyyk-thatched',{end:'end',curve:.55,width:5,edge:1}),[platform,route]=parts;
 platform.platform.railing='kotor-kashyyyk';route.route.segments[0].railing={style:'kotor-kashyyyk'};
 const joins=platformRouteAprons(platform,parts,platformOutline(platform.platform),ref=>platformPort(platform,ref)),spans=platformRailSpans(platform,parts);
 const ends=spans.flat().filter(p=>spans.flat().filter(q=>p.distanceTo(q)<1e-5).length===1);
 assert.equal(ends.length,2);for(const point of joins[0].mouth)assert.ok(ends.some(p=>p.distanceTo(new T.Vector3(point.x,0,point.z))<1e-5),'continuous guard ends at the route edge');
 const root=buildPart(platform,{parts,collision:false});try{
  const apron=root.children.find(m=>m.geometry?.userData.platformApron);assert.equal(apron.material.map,kotorTexture('lka_wall01'));
  const uvFrame=new T.Matrix4().fromArray(joins[0].uvMatrix),p=apron.geometry.attributes.position,uv=apron.geometry.attributes.uv;
  for(let i=0;i<p.count;i++){const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(uvFrame);assert.ok(Math.abs(uv.getX(i)-point.x/4)<1e-5);assert.ok(Math.abs(uv.getY(i)-(point.z+joins[0].uvOffset)/4)<1e-5);}
 }finally{disposePart(root);}
 const after=structuredClone(parts);after[1].route.segments[0].componentFinishes={deck:{color:'#654321'}};assert.equal(reusableSceneParts(parts,after).has(platform.id),false,'painting the route updates its matching connector');
});

test('joining KOTOR handrails match the shared end height and leave its post to the route',()=>{
 const root=new T.Group(),baseline=new T.Group(),span=[new T.Vector3(0,0,0),new T.Vector3(0,0,4)];span.inward=new T.Vector3(1,0,0);
 buildKotorRails(baseline,[span],{height:1.15});
 buildKotorRails(root,[span],{height:1.15,terminals:[{point:[.21,0,0],railTop:1.03,postTop:1.4,width:.185}]});
 try{
  assert.ok(root.children.filter(m=>m.userData.kotorPost).every(m=>new T.Vector3(...m.userData.kotorPost.base).setY(0).distanceTo(new T.Vector3(.21,0,0))>.01),'the shared post is not doubled');
  const heights=[];for(const m of root.children.filter(m=>m.geometry.userData.bridgePart==='rails')){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i))<1e-5)heights.push(p.getY(i));}
  const original=[];for(const m of baseline.children.filter(m=>m.geometry.userData.bridgePart==='rails')){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i))<1e-5)original.push(p.getY(i));}
  const shift=1.03-(.1+1.15*kotorRailNode(new T.Vector3(.21,0,0)).rail);
  assert.ok(heights.length);assert.ok(Math.abs(Math.min(...heights)-Math.min(...original)-shift)<1e-5);assert.ok(Math.abs(Math.max(...heights)-Math.max(...original)-shift)<1e-5,'the native rail profile reaches the exact adjacent rail height');
 }finally{disposePart(root);disposePart(baseline);}
});
