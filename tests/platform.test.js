import test from 'node:test';import assert from 'node:assert/strict';import {defaultPlatform,platformOutline,appendPlatformSection,platformPorts,platformRailSpans,snapPlatform,layoutPlatform} from '../src/platforms/platform.js';import {makePart as makeFixturePart,validateProject} from '../src/core/model.js';import {resolveRouteLinks} from '../src/routes/route-links.js';import {routeSnapTargets} from '../src/routes/route-snap.js';import {buildPart} from '../src/core/geometry.js';import {Box3} from '../vendor/three.module.js';
const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a.x*b.z-b.x*a.z;},0)/2);
test('platform shapes produce one merged outline with no internal seams',()=>{let p=defaultPlatform();p=appendPlatformSection(p,0,'half-circle','front');p=appendPlatformSection(p,0,'half-circle','back');const loops=platformOutline(p);assert.equal(loops.length,1);assert.ok(Math.abs(area(loops[0])-(64+Math.PI*16))<.2);p.sections[0].depth=12;layoutPlatform(p);assert.equal(platformOutline(p).length,1);assert.ok(Math.abs(area(platformOutline(p)[0])-(96+Math.PI*16))<.2);});
test('overlapping circle and rounded rectangle retain a clean union',()=>{let p=defaultPlatform();p.sections[0].radius=2;p=appendPlatformSection(p,0,'circle','back');assert.equal(platformOutline(p).length,1);assert.ok(area(platformOutline(p)[0])>80);});
test('hull snap closes the gap and suppresses only the adjacent railing',()=>{const p=makePart('platform',{position:[0,4,8.3]}),hull=makePart('block',{scale:[12,10,8]});const result=snapPlatform(p,[hull]);assert.ok(result.snapped);assert.ok(Math.abs(result.part.position[2]-8)<1e-6);const span=platformRailSpans(result.part,[hull]);assert.equal(span.length,3);const away={...result.part,position:[0,20,8]};assert.equal(platformRailSpans(away,[hull]).length,4);});
test('route links follow a moved platform and cut a route-width gap',()=>{const p=makePart('platform'),port=platformPorts(p).find(p=>p.ref.side==='back'),r=makePart('stair-route',{route:{width:2,thickness:.2,gap:.15,segments:[{kind:'landing',run:4,rise:0,steps:1,turn:'straight'}],links:{start:port.ref}}});let resolved=resolveRouteLinks([p,r]);assert.deepEqual(resolved[1].position,[0,0,4]);const spans=platformRailSpans(p,resolved);const total=spans.reduce((n,[a,b])=>n+a.distanceTo(b),0);assert.ok(total<30&&total>29);p.position=[10,8,0];resolved=resolveRouteLinks([p,r]);assert.deepEqual(resolved[1].position,[10,8,4]);assert.ok(routeSnapTargets([p],r,'start').length);});
test('platform project round trips and mesh has correct deck elevation',()=>{const p=makePart('platform',{position:[0,5,0]});const saved=validateProject({format:'open-building-studio',version:1,name:'Platform',parts:[p]});assert.deepEqual(saved.parts[0].platform,p.platform);const b=new Box3().setFromObject(buildPart(p));assert.ok(Math.abs(b.min.y-4.65)<1e-5);assert.ok(b.max.y>6);});
import {extendPlatformFlow,platformFromRoute} from '../src/platforms/platform-flow.js';
test('turning platform strips keep width and stay connected around a courtyard',()=>{let p=defaultPlatform();p.sections[0].width=4;p.sections[0].depth=20;for(const turn of ['right','right'])p=extendPlatformFlow(p,p.sections.length-1,turn,'rectangle',20);assert.equal(platformOutline(p).length,1);assert.deepEqual(p.sections.map(s=>s.width),[4,4,4]);assert.equal(p.sections[1].rotation,Math.PI/2);assert.equal(p.sections[2].rotation,Math.PI);p.sections[0].depth=24;layoutPlatform(p);assert.equal(platformOutline(p).length,1);});
test('route to platform to route preserves floor heights and links',()=>{const r=makePart('stair-route',{position:[3,8,2],rotation:[0,Math.PI/2,0]});const result=platformFromRoute(r),resolved=resolveRouteLinks([result.route,result.platform]);assert.ok(Math.abs(resolved[0].route.segments[0].run-r.route.segments[0].run)<1e-8);assert.equal(resolved[0].route.segments[0].rise,r.route.segments[0].rise);const port=platformPorts(result.platform).find(p=>p.ref.side==='back'),out=makePart('stair-route');out.route.links={start:port.ref};const all=resolveRouteLinks([...resolved,out]);assert.deepEqual(all[2].position,port.point.toArray());});
import {platformExtensionAnchor} from '../src/platforms/platform-flow.js';
test('turn controls coincide with their actual attachment edges even on short sections',()=>{for(const depth of [2,8,20]){const p=defaultPlatform();p.sections[0].width=8;p.sections[0].depth=depth;const a=platformExtensionAnchor(p.sections[0],'right'),n=extendPlatformFlow(p,0,'right').sections[1];assert.ok(Math.abs(n.x-n.depth/2-a.x)<1e-6);assert.ok(Math.abs(n.z-a.z)<1e-6);assert.ok(Math.abs(a.z)<=depth/2);}});
test('rounded caps follow extensions and duplicate branches are rejected',()=>{let p=defaultPlatform();p=extendPlatformFlow(p,0,'straight','half-circle');assert.throws(()=>extendPlatformFlow(p,1),/caps/);p=extendPlatformFlow(p,0,'straight','rectangle',20);assert.equal(p.sections[1].attachment.sectionId,p.sections[2].id);assert.equal(platformOutline(p).length,1);assert.throws(()=>extendPlatformFlow(p,0,'straight'),/already continues/);});
test('half-circle made from a route keeps its flat edge anchored and curves forward',()=>{for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){const route=makePart('stair-route',{rotation:[0,heading,0]});const {platform,route:linked}=platformFromRoute(route),oldPort=platformPorts(platform).find(p=>p.ref.side==='front').point.clone();const s=platform.platform.sections[0];s.kind='half-circle';s.width=12;s.depth=6;layoutPlatform(platform.platform);const port=platformPorts(platform).find(p=>p.ref.side==='front');assert.ok(port.point.distanceTo(oldPort)<1e-8);const result=resolveRouteLinks([platform,linked]);assert.ok(Math.abs(result[1].route.segments[0].run-route.route.segments[0].run)<1e-8);s.width=20;s.depth=10;layoutPlatform(platform.platform);assert.ok(platformPorts(platform).find(p=>p.ref.side==='front').point.distanceTo(oldPort)<1e-8);}});

import {resizePlatformSection} from '../src/platforms/platform-flow.js';
test('length edits keep the entry edge fixed and move attached sections with the far edge',()=>{
 for(const rotation of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  let p=defaultPlatform();p.sections[0].rotation=rotation;
  p=extendPlatformFlow(p,0,'straight','rectangle',8);
  const root=p.sections[0],entry=platformExtensionAnchor(root,'back');
  resizePlatformSection(root,'depth',20);layoutPlatform(p);
  const after=platformExtensionAnchor(root,'back'),exit=platformExtensionAnchor(root,'straight'),nextEntry=platformExtensionAnchor(p.sections[1],'back');
  assert.ok(Math.hypot(entry.x-after.x,entry.z-after.z)<1e-8);
  assert.ok(Math.hypot(exit.x-nextEntry.x,exit.z-nextEntry.z)<1e-8);
  resizePlatformSection(root,'depth',4);layoutPlatform(p);
  const shortened=platformExtensionAnchor(root,'back');
  assert.ok(Math.hypot(entry.x-shortened.x,entry.z-shortened.z)<1e-8);
 }
});

import {extendPlatformTurn,roundPlatformEnds} from '../src/platforms/platform-flow.js';
test('rounded L matches two strips, quarter-disc corner and two semicircular end caps',()=>{
 for(const turn of ['left','right'])for(const rotation of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  let p=defaultPlatform();Object.assign(p.sections[0],{width:8,depth:16,rotation});
  p=extendPlatformTurn(p,0,turn,'rectangle',12,'exit',true);p=roundPlatformEnds(p);
  assert.equal(p.sections.length,5);assert.equal(p.sections.filter(s=>s.kind==='corner').length,1);
  const loops=platformOutline(p);assert.equal(loops.length,1);
  assert.ok(Math.abs(area(loops[0])-(8*(16+12)+Math.PI*64/4+Math.PI*16))<.3);
  assert.equal(roundPlatformEnds(p).sections.length,5);
  const part=makePart('platform',{platform:p});assert.ok(new Box3().setFromObject(buildPart(part)).max.y>1);
  assert.equal(validateProject({format:'open-building-studio',version:1,name:'Rounded L',parts:[part]}).parts[0].platform.sections.length,5);
  resizePlatformSection(p.sections[0],'width',10);layoutPlatform(p);assert.equal(platformOutline(p).length,1);
 }
});

import {roundedPlatformFixture} from './fixtures/rounded-platform-fixture.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {Vector3} from '../vendor/three.module.js';
test('rounded L demonstration has an actual elevated route link and an open railing at its threshold',()=>{
 const project=roundedPlatformFixture(),p=project.parts.find(p=>p.platform),r=project.parts.find(p=>p.route);
 assert.equal(r.route.links.start.partId,p.id);
 const port=platformPorts(p).find(q=>q.ref.platformSection===r.route.links.start.platformSection&&q.ref.side==='front');
 assert.ok(new Vector3(...r.position).distanceTo(port.point)<1e-8);
 assert.equal(r.position[1],p.position[1]);
 assert.ok(Math.abs(r.route.segments[0].run-10)<1e-8);
 const local=port.point.clone().applyMatrix4(partMatrix(p).invert());
 for(const [a,b] of platformRailSpans(p,project.parts)){const v=b.clone().sub(a),t=Math.max(0,Math.min(1,local.clone().sub(a).dot(v)/v.lengthSq()));assert.ok(a.clone().addScaledVector(v,t).distanceTo(local)>=r.route.width/2);}
 assert.equal(p.platform.sections.filter(s=>s.kind==='half-circle').length,2);
 validateProject(project);
});

import {platformPostPositions,buildPlatformRails} from '../src/platforms/platform.js';
import {defaultRailing} from '../src/routes/railings.js';
import {Group} from '../vendor/three.module.js';
test('platform posts follow perimeter distance and route railing dimensions rather than curve facets',()=>{
 const p=roundedPlatformFixture().parts.find(p=>p.platform),spans=platformRailSpans(p),r=defaultRailing(),posts=platformPostPositions(spans,r.spacing);
 assert.ok(posts.length<55);assert.ok(posts.length>30);
 assert.equal(new Set(posts.map(p=>p.toArray().map(v=>v.toFixed(5)).join(','))).size,posts.length);
 const group=new Group();buildPlatformRails(group,p);const post=group.children.find(m=>m.userData.railingPart==='post');
 post.geometry.computeBoundingBox();const size=post.geometry.boundingBox.getSize(new Vector3());
 assert.ok(Math.abs(size.x-r.postWidth)<1e-5);assert.ok(Math.abs(size.y-r.height)<1e-5);
 assert.equal(post.material.color.getHexString(),r.color.slice(1));
 assert.equal(group.children.filter(m=>m.userData.railingPart==='rail').length,spans.length);
});

import {platformPort,nearestPlatformEdge} from '../src/platforms/platform.js';
import {PerspectiveCamera} from '../vendor/three.module.js';
import {platformEdgeRouteTarget} from '../src/routes/route-snap.js';
test('arbitrary platform edge references follow resizing and preserve a route-width railing gap',()=>{
 const p=makePart('platform',{position:[3,5,7],rotation:[0,.7,0]}),ref={partId:p.id,platformSection:p.platform.sections[0].id,edge:1,edgeT:.31},port=platformPort(p,ref),r=makePart('stair-route');r.route.links={start:ref};
 const before=resolveRouteLinks([p,r]);assert.ok(new Vector3(...before[1].position).distanceTo(port.point)<1e-8);
 p.platform.sections[0].depth=16;const moved=resolveRouteLinks([p,r]);assert.ok(new Vector3(...moved[1].position).distanceTo(platformPort(p,ref).point)<1e-8);assert.notDeepEqual(before[1].position,moved[1].position);
 assert.ok(platformRailSpans(p,moved).length>platformRailSpans(p,[p]).length);validateProject({format:'open-building-studio',version:1,name:'Edge link',parts:moved});
 assert.equal(platformPort(p,{...ref,edgeT:2}),null);
});
test('edge hover supports arbitrary positions, midpoint bias, regular intervals and precision override',()=>{
 const p=makePart('platform');p.platform.sections[0].depth=20;const camera=new PerspectiveCamera(45,1,.1,100);camera.position.set(0,30,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();const rect={left:0,top:0,width:1000,height:1000};
 const pick=(z,bias)=>{const screen=new Vector3(4,0,z).project(camera);return nearestPlatformEdge(p,camera,rect,(screen.x+1)*500,(1-screen.y)*500,{bias});};
 const free=pick(3.3,false);assert.ok(Math.abs(free.point.z-3.3)<1e-7);
 assert.ok(Math.abs(pick(.1,true).point.z)<1e-7);assert.ok(Math.abs(pick(4.1,true).point.z-4)<1e-7);
 const r=makePart('stair-route',{position:[12,0,3.3],rotation:[0,-Math.PI/2,0]});r.route.segments=[{kind:'landing',run:4,rise:0,steps:1,turn:'straight'}];const screen=free.point.clone().project(camera);
 const target=platformEdgeRouteTarget([p],r,'end',new Set(),camera,rect,(screen.x+1)*500,(1-screen.y)*500);assert.ok(target);assert.ok(Math.abs(target.effective.route.segments[0].run-8)<1e-7);
});

test('curved platform edges accept persistent route starts without fixed cardinal ports',()=>{
 const p=makePart('platform');Object.assign(p.platform.sections[0],{kind:'circle',width:12,depth:12});
 const ref={partId:p.id,platformSection:p.platform.sections[0].id,edge:5,edgeT:.37},port=platformPort(p,ref),r=makePart('stair-route');r.route.links={start:ref};
 const resolved=resolveRouteLinks([p,r]);assert.ok(new Vector3(...resolved[1].position).distanceTo(port.point)<1e-8);assert.ok(Math.abs(resolved[1].rotation[1]-port.angle)<1e-8);
 const before=platformRailSpans(p,[p]).reduce((n,[a,b])=>n+a.distanceTo(b),0),after=platformRailSpans(p,resolved).reduce((n,[a,b])=>n+a.distanceTo(b),0);assert.ok(after<before-r.route.width);
 validateProject({format:'open-building-studio',version:1,name:'Curved edge',parts:resolved});
});

import {removePlatformSection} from '../src/platforms/platform-flow.js';
test('square and rounded modes place middle branches identically without moving end caps',()=>{
 let p=defaultPlatform();p=extendPlatformFlow(p,0,'straight','rectangle',12,'middle');p=extendPlatformFlow(p,1,'straight','rectangle',8,'end');p=roundPlatformEnds(p);
 const a=extendPlatformTurn(p,1,'left','rectangle',6,'branch',true),b=extendPlatformTurn(p,1,'left','rectangle',6,'branch',false);
 assert.deepEqual(a,b);assert.deepEqual(a.sections.slice(0,p.sections.length),p.sections);assert.equal(platformOutline(a).length,1);
 // A square side extension from an end must not steal its forward cap.
 let cap=defaultPlatform();cap=extendPlatformFlow(cap,0,'straight','half-circle',4,'cap');const before=structuredClone(cap.sections[1]);cap=extendPlatformTurn(cap,0,'right','rectangle',6,'side',false);assert.deepEqual(cap.sections.find(s=>s.id==='cap'),before);
});
test('removing middle sections leaves surviving branches in place and round trips',()=>{
 let p=defaultPlatform();p=extendPlatformFlow(p,0,'straight','rectangle',12,'middle');p=extendPlatformFlow(p,1,'straight','rectangle',8,'end');p=extendPlatformTurn(p,1,'left','rectangle',6,'branch',true);
 const before=structuredClone(p),next=removePlatformSection(p,1);assert.deepEqual(p,before);
 for(const s of next.sections){const old=before.sections.find(a=>a.id===s.id);assert.equal(s.x,old.x);assert.equal(s.z,old.z);assert.equal(s.rotation,old.rotation);assert.notEqual(s.attachment?.sectionId,'middle');}
 const part=makePart('platform',{platform:next});validateProject({format:'open-building-studio',version:1,name:'Removed middle',parts:[part]});buildPart(part);assert.equal(platformOutline(next).length,3);
});
test('non-square rounded elbows retain matching outgoing strip width',()=>{
 let p=defaultPlatform();p=extendPlatformTurn(p,0,'right','rectangle',12,'exit',true);const corner=p.sections[1];corner.freeDimensions=true;corner.depth=12;layoutPlatform(p);
 assert.equal(p.sections[2].width,12);assert.equal(platformOutline(p).length,1);
});
test('round free ends includes the front of a deck with only side branches and is idempotent',()=>{
 let p=defaultPlatform();p=extendPlatformTurn(p,0,'left','rectangle',8,'side',false);p=roundPlatformEnds(p);const root=p.sections[0];assert.ok(p.sections.some(s=>s.kind==='half-circle'&&s.attachment.sectionId===root.id&&s.attachment.turn==='straight'));assert.deepEqual(roundPlatformEnds(p),p);
});

// These authored snap fixtures use the original narrow route width.
function makePart(type,options){const p=makeFixturePart(type,options);if(type==='stair-route'&&!options?.route)p.route.width=1.5;return p;}
