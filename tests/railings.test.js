import test from 'node:test';import assert from 'node:assert/strict';
import {defaultRoute,routeLayout,validateRoute} from '../src/routes/stair-route.js';
import {defaultRailing} from '../src/routes/railings.js';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {Box3,Raycaster,Vector3} from '../vendor/three.module.js';
import {surfaceTexture} from '../src/materials/surfaces.js';
function part(style='posts'){const route=defaultRoute({width:1.5});route.segments[0].railing={...defaultRailing(),style};return makePart('stair-route',{route});}
const railMeshes=g=>g.children.filter(m=>m.userData.railing);
test('rails regenerate with length and keep their cross sections under object scaling',()=>{
 const p=part(),g=buildPart(p),count=railMeshes(g).length;p.scale=[3,2,3];const scaled=buildPart(p);scaled.updateMatrixWorld(true);
 assert.ok(railMeshes(scaled).length>count);const post=railMeshes(scaled)[1],bounds=new Box3().setFromObject(post,true);assert.ok(Math.abs(bounds.max.x-bounds.min.x-.07)<1e-5);assert.ok(Math.abs(bounds.max.z-bounds.min.z-.07)<1e-5);
 p.route.segments[0].run=6;const extended=buildPart(p);assert.ok(railMeshes(extended).length>railMeshes(scaled).length);
 for(const m of [g,scaled,extended])disposePart(m);
});
test('solid rail walls follow steps, keep a separate texture, and support one-sided settings',()=>{
 const p=part('solid');p.surface={preset:'stone',scale:1};p.route.segments[0].railing.surface={preset:'wood',scale:2};p.route.segments[0].railing.sides='left';const g=buildPart(p);g.updateMatrixWorld(true);const rails=railMeshes(g);assert.equal(rails.length,2);assert.equal(rails[0].material.map,surfaceTexture('wood'));assert.equal(g.children[0].material.map,surfaceTexture('stone'));
 for(let i=0;i<8;i++){const z=(i+.5)*3/8,y=(i+1)*1.5/8+.1;assert.ok(new Raycaster(new Vector3(0,y,z),new Vector3(1,0,0),0,1).intersectObjects(rails).length);}
 disposePart(g);
});
test('turn landing rails enclose outside edges while leaving walking connections open',()=>{
 for(const turn of ['straight','left','right','return-left','return-right'])for(const style of ['posts','solid','walkway']){
  const p=part(style);p.route.segments=[{kind:'landing',run:2,rise:0,steps:1,turn,railing:{...defaultRailing(),style}}];const g=buildPart(p);g.updateMatrixWorld(true);const rails=railMeshes(g),l=routeLayout(p.route)[0];
  assert.equal(new Raycaster(new Vector3(0,.4,-.1),new Vector3(0,0,1),0,.2).intersectObjects(rails).length,0,turn+' entry');
  const dir=new Vector3(Math.sin(l.endHeading),0,Math.cos(l.endHeading)),end=new Vector3(...l.end);end.y=.4;end.addScaledVector(dir,-.1);assert.equal(new Raycaster(end,dir,0,.2).intersectObjects(rails).length,0,turn+' exit');
  for(const m of rails)for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));disposePart(g);
 }
});
test('railing settings validate and survive saving and undo without sharing segment edits',()=>{
 const p=part(),project={format:'open-building-studio',version:1,name:'Rails',parts:[p]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);const history=new History(project);p.route.segments[0].railing.style='solid';history.push(project);assert.equal(history.undo().parts[0].route.segments[0].railing.style,'posts');
 for(const patch of [{height:0},{spacing:0},{surface:{preset:'missing',scale:1}},{style:'wrong'}]){const r=defaultRoute({width:1.5});r.segments[0].railing={...defaultRailing(),...patch};assert.throws(()=>validateRoute(r));}
});

test('solid stair sides are simple panels beside open-sided flights, independent of step count',()=>{
 for(const steps of [8,64])for(const rise of [1.5,-1.5])for(const hallway of [false,true]){
  const p=part('solid'),s=p.route.segments[0];s.steps=steps;s.rise=rise;
  if(hallway)s.hallway={height:3,thickness:.2,ceiling:false,color:'#ffffff',surface:{preset:'plain',scale:1}};
  const g=buildPart(p);g.updateMatrixWorld(true);const rails=railMeshes(g);
  assert.equal(rails.length,4);
  for(const m of rails){const a=m.geometry.attributes.position;assert.equal((m.geometry.index?.count??a.count)/3,12,'constant panel/handrail budget');}
  const flight=g.children.find(m=>!m.userData.railing),normals=flight.geometry.attributes.normal;
  for(let i=0;i<normals.count;i++)assert.ok(Math.abs(normals.getX(i))<.99,'no covered stair side cap');
  const walls=[rails[1],rails[3]];
  for(const wall of walls){const b=new Box3().setFromObject(wall);assert.ok(b.min.x>=-.75-1e-6&&b.max.x<=.75+1e-6,'panel sits inside the floor edges');}
  for(let i=0;i<steps;i++){
   const z=(i+.5)*s.run/steps,y=rise*z/s.run-.1;
   for(const sign of [-1,1])assert.ok(new Raycaster(new Vector3(0,y,z),new Vector3(sign,0,0),0,2).intersectObjects(walls).length,'wall seals below the tread without serrated gaps');
  }
  disposePart(g);
 }
});

test('one-sided solid walls remove only the covered stair side',()=>{
 const p=part('solid');p.route.segments[0].railing.sides='left';const g=buildPart(p),n=g.children[0].geometry.attributes.normal;
 assert.ok(Array.from({length:n.count},(_,i)=>n.getX(i)).some(x=>x<-.99));
 assert.ok(!Array.from({length:n.count},(_,i)=>n.getX(i)).some(x=>x>.99));disposePart(g);
});

test('solid walls expose outward-facing exterior and interior surfaces',()=>{
 for(const rise of [1.5,-1.5,0])for(const hallway of [false,true]){
  const p=part('solid');p.route.segments[0].rise=rise;
  if(hallway)p.route.segments[0].hallway={height:3,thickness:.2,ceiling:false,color:'#ffffff',surface:{preset:'plain',scale:1}};
  const g=buildPart(p);g.updateMatrixWorld(true);const walls=railMeshes(g),thickness=hallway?.2:.1;
  for(const sign of [-1,1]){
   const outside=new Raycaster(new Vector3(sign*2,rise/2+.5,1.5),new Vector3(-sign,0,0),0,3).intersectObjects(walls)[0];
   const expected=.75;
   assert.ok(outside);assert.ok(Math.abs(outside.point.x-sign*expected)<1e-5,'exterior face is visible, not the back of the inner face');
   const inside=new Raycaster(new Vector3(0,rise/2+.5,1.5),new Vector3(sign,0,0),0,2).intersectObjects(walls)[0];
   assert.ok(inside);assert.ok(Math.abs(inside.point.x-sign*(.75-thickness))<1e-5,'interior face is visible');
  }
  for(const m of walls){const a=m.geometry.attributes.position,n=m.geometry.attributes.normal,idx=m.geometry.index;for(let i=0;i<(idx?.count??a.count);i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k),v=ids.map(j=>new Vector3().fromBufferAttribute(a,j)),cross=v[1].sub(v[0]).cross(v[2].sub(v[0]));assert.ok(cross.dot(new Vector3().fromBufferAttribute(n,ids[0]))>0,'face winding agrees with outward normal');}}
  disposePart(g);
 }
});

test('solid walls align through slopes and landings; caps sit flush and mitre at square corners',()=>{
 for(const rise of [1.5,-1.5])for(const scale of [[1,1,1],[2,1.5,2]]){
  const p=part('solid'),r=p.route,railing={...defaultRailing(),style:'solid',panelThickness:.2,railWidth:.2};
  r.segments=[{kind:'stairs',run:3,rise,steps:8,turn:'straight',railing},{kind:'landing',run:2,rise:0,steps:1,turn:'left',railing},{kind:'stairs',run:3,rise,steps:8,turn:'straight',railing}];p.scale=scale;
  const g=buildPart(p);g.updateMatrixWorld(true);const meshes=railMeshes(g);
  for(const z of [2.9,3.1])for(const sign of [-1,1]){const y=(rise+railing.height/2)*scale[1],hit=new Raycaster(new Vector3(sign*4,y,z*scale[2]),new Vector3(-sign,0,0),0,5).intersectObjects(meshes)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.x-sign*(.75*scale[0]))<1e-5,'consistent outside wall plane');}
  // Outer corner is x=-width/2, z=5; its .2 m cap is fully filled to the square tip.
  const caps=meshes.filter(m=>m.userData.wallLayer==='cap');
  for(const dx of [.02,.1,.18])for(const dz of [.02,.1,.18]){
   const hit=new Raycaster(new Vector3(-.75*scale[0]+dx,10,5*scale[2]-dz),new Vector3(0,-1,0),0,30).intersectObjects(caps)[0];assert.ok(hit,'no missing cap corner');assert.ok(Math.abs(hit.point.y-(rise*scale[1]+railing.height+railing.railHeight/2))<1e-5);
  }
  disposePart(g);
 }
});

test('solid caps share the wall footprint even when saved handrail width differs',()=>{
 for(const turn of ['left','right','return-left','return-right']){
  const p=part('solid'),r={...defaultRailing(),style:'solid',panelThickness:.25,railWidth:.05};
  p.route.segments=[{kind:'landing',run:3,rise:0,steps:1,turn,railing:r}];
  const g=buildPart(p);g.updateMatrixWorld(true);const meshes=railMeshes(g);
  for(let i=0;i<meshes.length;i+=2){const cap=new Box3().setFromObject(meshes[i]),wall=new Box3().setFromObject(meshes[i+1]);for(const axis of ['x','z']){assert.ok(Math.abs(cap.min[axis]-wall.min[axis])<1e-6);assert.ok(Math.abs(cap.max[axis]-wall.max[axis])<1e-6);}assert.ok(Math.abs(cap.min.y-wall.max.y)<1e-6);}
  disposePart(g);
 }
});


test('enclosed flights fit between inner wall faces without changing the route footprint',()=>{
 for(const kind of ['stairs','ramp'])for(const rise of [1.5,-1.5])for(const fillToGround of [false,true])for(const sides of ['left','right','both','hallway'])for(const scale of [[1,1,1],[2,1.5,3]])for(const turn of ['straight','left']){
  const p=part('solid');p.scale=scale;
  const s=p.route.segments[0];Object.assign(s,{kind,rise,fillToGround});s.railing.panelThickness=.2;
  if(sides==='hallway')s.hallway={height:3,thickness:.25,ceiling:false,color:'#ffffff',surface:{preset:'plain',scale:1}};
  else s.railing.sides=sides;
  if(turn==='left')p.route.segments.unshift({kind:'landing',run:2,rise:0,steps:1,turn});
  const index=p.route.segments.length-1,g=buildPart(p),flight=g.children.find(m=>m.userData.routeSegment===index&&!m.userData.railing&&!m.userData.hallway);
  flight.geometry.computeBoundingBox();const b=flight.geometry.boundingBox;
  const thickness=sides==='hallway'?.25:.2,across=turn==='left'?scale[2]:scale[0];
  const right=sides==='right'||sides==='both'||sides==='hallway',left=sides==='left'||sides==='both'||sides==='hallway';
  assert.ok(Math.abs(b.min.x-(-.75+(right?thickness/across:0)))<1e-5,'right tread edge meets inner face');
  assert.ok(Math.abs(b.max.x-(.75-(left?thickness/across:0)))<1e-5,'left tread edge meets inner face');
  assert.ok(Math.abs(b.min.z)<1e-5&&Math.abs(b.max.z-s.run)<1e-5,'endpoints do not move');
  assert.equal(p.route.width,1.5);disposePart(g);
 }
});
test('open and post-railed stairs retain their full tread width',()=>{
 for(const style of ['none','posts']){const p=part(style),g=buildPart(p);g.children[0].geometry.computeBoundingBox();const b=g.children[0].geometry.boundingBox;assert.ok(Math.abs(b.max.x-b.min.x-1.5)<1e-5);disposePart(g);}
});


test('corner floors stop at enclosed inner faces but preserve turn openings',()=>{
 for(const turn of ['left','right','return-left','return-right'])for(const hallway of [false,true])for(const fillToGround of [false,true])for(const scale of [[1,1,1],[2,1.5,3]]){
  const p=part('solid');p.scale=scale;p.position=[0,2,0];
  const s=p.route.segments[0];Object.assign(s,{kind:'landing',run:2,rise:0,turn,fillToGround});s.railing.panelThickness=.2;
  if(hallway)s.hallway={height:3,thickness:.2,ceiling:false,color:'#ffffff',surface:{preset:'plain',scale:1}};
  const g=buildPart(p);g.updateMatrixWorld(true);const floor=g.children.find(m=>!m.userData.railing&&!m.userData.hallway);
  const hit=(x,z)=>new Raycaster(new Vector3(x*scale[0],2.01,z*scale[2]),new Vector3(0,-1,0),0,.03).intersectObject(floor).length>0;
  assert.ok(!hit(0,2-.1/scale[2]),'no floor underneath far wall');
  assert.ok(hit(0,2-.3/scale[2]),'floor meets inside of far wall');
  assert.ok(hit(0,.01),'incoming opening remains supported');
  const l=routeLayout(p.route)[0],direction=new Vector3(Math.sin(l.endHeading),0,Math.cos(l.endHeading));
  assert.ok(hit(l.end[0]-direction.x*.01,l.end[2]-direction.z*.01),'outgoing opening remains supported');
  assert.ok([...floor.geometry.attributes.position.array].every(Number.isFinite));disposePart(g);
 }
});

test('Kamino walkway style survives saves and builds on flat, rising and descending flights',()=>{for(const kind of ['landing','ramp','stairs'])for(const rise of kind==='landing'?[0]:[2,-2]){const p=part('walkway');p.route.segments[0]={...p.route.segments[0],kind,run:6,rise,steps:10};p.route.segments[0].railing={...defaultRailing(),style:'walkway',height:.65,postWidth:.2,panelThickness:.24};const project={format:'open-building-studio',version:1,name:'Walkway',parts:[p]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);const g=buildPart(p),rails=railMeshes(g);assert.ok(rails.length>10);for(const m of rails)for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));disposePart(g);}});

test('measured walkway has a low pentagonal rail and full tapered underbody',()=>{
 const p=part('walkway');p.route.width=3;p.route.segments[0]={...p.route.segments[0],kind:'landing',run:12,rise:0,turn:'straight',railing:{...defaultRailing(),style:'walkway',height:.31,spacing:4.5}};
 const g=buildPart(p),meshes=railMeshes(g),hull=meshes.find(m=>m.geometry.userData.walkwayProfile==='hull');assert.ok(hull);
 hull.geometry.computeBoundingBox();const b=hull.geometry.boundingBox;
 assert.ok(Math.abs(b.min.x+1.5)<1e-5&&Math.abs(b.max.x-1.5)<1e-5,'hull spans the entire deck');
 assert.ok(Math.abs(b.min.y-(-3.547357*3/5.89702-.005))<1e-5,'depth follows source mesh');
 const a=hull.geometry.attributes.position;for(let i=0;i<a.count;i++)if(a.getY(i)<-1.8)assert.ok(Math.abs(a.getX(i))<.83,'bottom tapers inward');
 for(const m of meshes.filter(m=>m!==hull)){m.geometry.computeBoundingBox();assert.ok(m.geometry.boundingBox.max.y<=.31001,'no invented tall posts or second handrail');}
 disposePart(g);
});

test('tapered walkway and Bespin corner hulls meet outgoing flights in every turn direction',()=>{
 const styles=[
  {style:'walkway',options:{height:.31,spacing:4.5},depth:-3.547357*3/5.89702-.005},
  {style:'bespin',options:{height:.7,panelThickness:.29},depth:-3.98958*3/4.98109-.005},
 ];
 for(const {style,options,depth} of styles)for(const turn of ['left','right','return-left','return-right']){
  const label=style+' '+turn,p=part(style);p.route.width=3;p.route.gap=.2;
  const railing={...defaultRailing(),style,...options};
  p.route.segments=[{kind:'landing',run:4,rise:0,steps:1,turn,railing},{kind:'ramp',run:6,rise:2,steps:1,turn:'straight',railing}];
  const layout=routeLayout(p.route),g=buildPart(p);
  try{
   const hulls=railMeshes(g).filter(m=>m.geometry.userData.walkwayProfile==='hull');
   const vectors=m=>{const a=m.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>new Vector3().fromBufferAttribute(a,i));};
   const corner=vectors(hulls[0]),flight=vectors(hulls[1]),l=layout[1];
   const endpoints=flight.filter(v=>Math.abs(v.y-depth)<1e-5&&Math.abs((v.x-l.start[0])*Math.sin(l.heading)+(v.z-l.start[2])*Math.cos(l.heading))<1e-5);
   assert.ok(endpoints.length>=2,label+' has bottom endpoints');
   for(const v of endpoints)assert.ok(corner.some(q=>q.distanceTo(v)<1e-5),label+' bottom profile meets the flight');
   for(const m of railMeshes(g))assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite),label);
  }finally{disposePart(g);}
 }
});

test('Bespin profile matches measured hull depth and has plain solid parapets',()=>{
 const p=part('bespin');p.route.width=3;p.route.segments[0]={kind:'landing',run:8,rise:0,steps:1,turn:'straight',railing:{...defaultRailing(),style:'bespin',height:.7,panelThickness:.29}};
 const g=buildPart(p),meshes=railMeshes(g),hull=meshes.find(m=>m.geometry.userData.walkwayProfile==='hull'),walls=meshes.filter(m=>m.geometry.userData.walkwayProfile==='bespin-parapet');assert.ok(hull);assert.equal(walls.length,2);assert.equal(meshes.length,3,'no invented posts, trim or extra handrails');hull.geometry.computeBoundingBox();assert.ok(Math.abs(hull.geometry.boundingBox.min.y+3.98958*3/4.98109+.005)<1e-5);
 for(const m of walls){m.geometry.computeBoundingBox();assert.ok(Math.abs(m.geometry.boundingBox.max.y-.7)<1e-5);assert.ok(Math.abs(m.geometry.boundingBox.max.x-m.geometry.boundingBox.min.x-.29)<1e-5);}
 const floor=g.children.find(m=>!m.userData.railing);floor.geometry.computeBoundingBox();assert.ok(Math.abs(floor.geometry.boundingBox.max.x-1.21)<1e-5);disposePart(g);
});

test('Bespin underbodies meet the deck soffit instead of crowding the walking surface',()=>{for(const style of ['bespin','bespin-arches'])for(const kind of ['landing','ramp','stairs']){const p=part(style);p.route.segments[0]={kind,run:8,rise:kind==='landing'?0:3,steps:16,turn:'straight',railing:{...defaultRailing(),style}};const g=buildPart(p),hull=railMeshes(g).find(m=>m.geometry.userData.walkwayProfile==='hull'),a=hull.geometry.attributes.position;const backing=p.route.thickness+(kind==='stairs'?Math.min(.08,p.route.thickness):0);for(let i=0;i<a.count;i++){const slope=3*a.getZ(i)/8;assert.ok(a.getY(i)<=(kind==='landing'?0:slope)-backing+1e-5,'underbody begins at the soffit');}for(const wall of railMeshes(g).filter(m=>m.geometry.userData.walkwayProfile==='bespin-parapet')){wall.geometry.computeBoundingBox();assert.ok(Math.abs(wall.geometry.boundingBox.min.y+backing)<1e-5,'parapet closes the side down to the hull');}disposePart(g);}});
