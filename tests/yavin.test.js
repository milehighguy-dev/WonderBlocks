import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {YAVIN_PRESETS} from '../src/parts/yavin-presets.js';
import {yavinBlocking} from '../examples/generators/yavin-demo.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {curveMeshPoint} from '../src/routes/curved-route.js';
import {physicalSurface} from '../src/collision/object-collision.js';
import {boxSurface,weldSurface,assertClosedSurface} from '../src/collision/collision-geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {planSWBF2} from '../src/swbf2/export-swbf2.js';
import {materialTargets,readMaterial} from '../src/editor/material-editing.js';

const ray=(g,p,d,max=30)=>new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d),0,max).intersectObject(g,true);
function collisionProxy(g,mask=1){const group=new T.Group();for(const body of g.userData.collision.bodies){if(!(body.mask&mask))continue;const s=body.surface||boxSurface(body.primitive),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(s.positions.flat(),3));geometry.setIndex(s.triangles.flat());group.add(new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide})));}group.position.copy(g.position);group.quaternion.copy(g.quaternion);group.updateMatrixWorld(true);return group;}

test('arena gallery has a real underpass, a continuous upper lane and closed low-poly solids',()=>{
 const p=makePart('yavin-gallery'),g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);const collision=collisionProxy(g);
 try{
  for(const x of [-.45,0,.45])for(const y of [.1,1.1,2.3]){assert.equal(ray(g,[x,y,6],[0,0,-1],12).length,0);assert.equal(ray(collision,[x,y,6],[0,0,-1],12).length,0);}
  for(const x of [-6,0,6])assert.ok(Math.abs(ray(g,[x,5.5,1],[0,-1,0],3)[0].point.y-4.2)<1e-5);
  for(const mesh of g.children)assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(mesh,new T.Matrix4())));
  assert.ok(geometryStats(g).triangles<220);
  const edited=makePart('yavin-gallery',{parameters:{bayWidth:20,bayDepth:8,terraceHeight:5.4,passageHeight:4.2,passageWidth:4.8,pierHeight:2}});assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Edited bay',parts:[edited]}));edited.parameters.terraceHeight=3.6;assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Blocked headroom',parts:[edited]}),/underpass/);
 }finally{disposePart(g);disposePart(collision);}
});

test('Yavin stepped wall has trapezoidal windows, solid sills and complete rear faces',()=>{
 const p=makePart('wall-route',structuredClone(YAVIN_PRESETS[2].preset)),g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);const collision=collisionProxy(g);
 try{
  assert.equal(ray(g,[-2,1.5,2],[1,0,0],4).length,0);assert.equal(ray(collision,[-2,1.5,2],[1,0,0],4).length,0);
  assert.ok(ray(g,[-2,.4,2],[1,0,0],4).length);assert.ok(ray(g,[2,.4,2],[-1,0,0],4).length);
  assert.ok(ray(g,[-2,2.5,2],[1,0,0],4).length);assert.ok(ray(g,[0,4,2],[0,-1,0],4).length);
  const surfaces=g.children.filter(m=>m.isMesh).map(m=>physicalSurface(m,new T.Matrix4()));assert.doesNotThrow(()=>assertClosedSurface(weldSurface(surfaces)));
 }finally{disposePart(g);disposePart(collision);}
});

test('Yavin passage routes keep turns open and their stepped shoulders face both sides',()=>{
 const p=yavinBlocking().parts.find(p=>p.route?.segments[0].hallway),g=buildPart(p,{collision:false});g.updateMatrixWorld(true);
 try{
  // Horizontal shoulder ledges must face up outside and down inside.
  assert.ok(ray(g,[20.325,3.7,-22],[0,-1,0],1).some(h=>Math.abs(h.point.y-3.2)<1e-5));
  assert.ok(ray(g,[20.075,2.8,-22],[0,1,0],.5).some(h=>Math.abs(h.point.y-3.2)<1e-5));
  for(const l of routeLayout(p.route).slice(0,-1)){const a=new T.Vector3(l.end[0],1.8,l.end[2]).applyMatrix4(g.matrixWorld),d=new T.Vector3(Math.sin(l.endHeading),0,Math.cos(l.endHeading)).transformDirection(g.matrixWorld);assert.equal(ray(g,a.clone().addScaledVector(d,-.2).toArray(),d.toArray(),.4).length,0);}assert.ok(g.children.some(m=>m.userData.hallwayInspired));}finally{disposePart(g);}
});

test('ruined Yavin walls have solid feet, open-topped damage and closed straight, corner and curved shells',()=>{
 for(const shape of ['straight','corner','curve']){
  const p=makePart('wall-route',structuredClone(YAVIN_PRESETS[3].preset)),s=p.route.segments[0];
  if(shape==='corner'){s.run=11;p.route.segments.push({...structuredClone(s),run:7,pathStart:{point:[0,0,11],heading:Math.PI/2}});}
  if(shape==='curve')s.curveAngle=-Math.PI/2;
  const g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);const collision=collisionProxy(g);
  try{
   assert.doesNotThrow(()=>assertClosedSurface(weldSurface(g.children.filter(m=>m.isMesh).map(m=>physicalSurface(m,new T.Matrix4())))));
   if(shape==='corner'){
    const points=g.children.filter(m=>m.isMesh&&m.userData.routeSegment===0).flatMap(m=>{const a=m.geometry.getAttribute('position');return Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i));});
    const inside=points.filter(p=>p.y>0&&p.z>.5&&p.z<s.run-.5),front=inside.filter(p=>Math.abs(p.x-.25)<1e-5),back=inside.filter(p=>Math.abs(p.x+.25)<1e-5);
    assert.ok(front.length>10);
    for(const p of front)assert.ok(back.some(q=>Math.abs(q.z-p.z)<1e-5&&Math.abs(q.y-p.y)<1e-5),'a turn must not skew the broken courses diagonally across the wall thickness');
   }
   if(shape==='straight'){
    for(let z=.25;z<16;z+=.5){assert.ok(ray(g,[-2,.2,z],[1,0,0],4).length);assert.ok(ray(collision,[-2,.2,z],[1,0,0],4).length);}
    assert.equal(ray(g,[-2,1.5,4],[1,0,0],4).length,0);assert.equal(ray(collision,[-2,1.5,4],[1,0,0],4).length,0);
    assert.ok(ray(g,[-2,2.4,6.5],[1,0,0],4).length);assert.ok(ray(g,[2,2.4,6.5],[-1,0,0],4).length);
    assert.ok(geometryStats(g).triangles<220);
   }
   assert.ok(!materialTargets(p).some(([key])=>key==='recesses'));
   s.railing.height=8;s.railing.spacing=16;assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Tall ruin',parts:[p]}));
  }finally{disposePart(g);disposePart(collision);}
 }
});

test('the blocking workshop keeps editable routes and gallery controls through save and native export',()=>{
 const p=yavinBlocking();assert.equal(p.parts.length,16);assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 const bay=YAVIN_PRESETS[0];for(const p of bay.parts.filter(p=>p.route)){const end=routeLayout(p.route).at(-1).end,point=new T.Vector3(...end).applyEuler(new T.Euler(...p.rotation)).add(new T.Vector3(...p.position));assert.ok(Math.abs(point.y-4.2)<1e-5);assert.ok(Math.abs(point.z-3.5)<1e-5);assert.ok(p.route.segments[0].rise/p.route.segments[0].steps<=.2);}
 const plan=planSWBF2(p,{aiNavigation:false,includeCollision:true});assert.ok(plan.assets.length>0);assert.ok(plan.materials.some(m=>m.texture));
});

test('Yavin aqueduct alternates open spans and enclosed piers with a continuous clear walkway',()=>{
 const p=yavinBlocking().parts.find(p=>p.assemblyId==='yavin-study-walkway'),g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);const movement=collisionProxy(g),ordnance=collisionProxy(g,16),floor=20.8;
 try{
  assert.deepEqual(p.route.segments.map(s=>s.railing.enclosed),[true,false,true,false,true]);
  assert.deepEqual(p.route.segments.map(s=>s.run),[12,18,12,18,12]);
  for(const x of [29.55,30,30.55])for(const y of [floor+.1,floor+1.8,floor+2.3]){
   assert.equal(ray(g,[x,y,37],[0,0,1],74).length,0,'clear visual passage through all five sections');
   assert.equal(ray(movement,[x,y,37],[0,0,1],74).length,0,'clear movement passage across every boundary');
  }
  for(let z=38.5;z<110;z+=1){for(const mesh of [g,movement])assert.ok(Math.abs(ray(mesh,[30,floor+.5,z],[0,-1,0],1)[0].point.y-floor)<1e-5,'no missing floor or raised threshold');}
  for(const z of [44,74,104]){
   assert.ok(Math.abs(ray(g,[30,floor+1.8,z],[0,1,0],5)[0].point.y-(floor+4.6))<1e-5,'enclosed pier has a roof');
   assert.ok(ray(g,[24,floor+1.8,z],[1,0,0],12).length,'pier passage has solid side walls');
   assert.ok(ray(movement,[24,floor+1.8,z],[1,0,0],12).length);
   assert.ok(Math.abs(ray(g,[30,-1,z],[0,1,0],2)[0].point.y)<1e-4,'the monumental pier reaches ground level');
  }
  for(const z of [59,89]){
   assert.equal(ray(g,[30,floor+1,z],[0,1,0],10).length,0,'open span has open sky');
   assert.equal(ray(movement,[24,floor+1.8,z],[1,0,0],12).length,0,'no invisible tall railing above low curbs');
   assert.equal(ray(ordnance,[24,floor+1.8,z],[1,0,0],12).length,0);
   assert.ok(ray(movement,[24,floor+.15,z],[1,0,0],12).length,'low curbs retain physical collision');
  }
  for(const m of g.children.filter(m=>m.isMesh))assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(m,new T.Matrix4())));
  assert.ok(geometryStats(g).triangles<700,'the five section route stays inexpensive');
  assert.deepEqual(materialTargets(p).filter(([key])=>key!=='all').map(([,label])=>label),['Aqueduct paving','Aqueduct body','Low curbs','Passage walls','Passage roof']);
 }finally{disposePart(g);disposePart(movement);disposePart(ordnance);}
});

test('aqueduct section dimensions, corners, curves and independent roof finishes survive saving',()=>{
 for(const shape of ['straight','corner','curve','ramp']){
  const p=makePart('stair-route',structuredClone(YAVIN_PRESETS[6].preset)),s=p.route.segments[0];
  s.railing.height=5;s.componentFinishes.ceiling={color:'#ffffff',surface:{preset:'yavin-floor',scale:.4}};
  if(shape==='corner'){s.turn='right';p.route.segments.push({...structuredClone(s),turn:'straight'});}
  if(shape==='curve'){s.run=24;s.curveAngle=Math.PI/2;}
  if(shape==='ramp'){s.kind='ramp';s.rise=2;}
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Aqueduct',parts:[p]}))).parts[0],p);
  const g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);const movement=collisionProxy(g);
  try{
   for(const m of g.children.filter(m=>m.isMesh))assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(m,new T.Matrix4())),shape);
   assert.ok(g.children.some(m=>m.userData.yavinAqueductPart==='ceiling'));
   assert.ok(g.children.filter(m=>m.userData.yavinAqueductPart==='ceiling').every(m=>m.material.map?.userData?.surfacePreset==='yavin-floor'));
   for(const l of routeLayout(p.route)){
    if(shape==='curve'){for(let z=.5;z<s.run-.5;z+=.5){const a=curveMeshPoint(0,1.8,z,s.run,s.curveAngle),b=curveMeshPoint(0,1.8,z+.4,s.run,s.curveAngle),d=new T.Vector3(...b).sub(new T.Vector3(...a));for(const mesh of [g,movement])assert.equal(ray(mesh,a,d.clone().normalize().toArray(),d.length()).length,0,'curved player passage');}continue;}
    const a=new T.Vector3(...l.start).add(new T.Vector3(Math.sin(l.heading),0,Math.cos(l.heading)).multiplyScalar(.2));a.y+=1.8;
    const d=[Math.sin(l.heading),shape==='ramp'?s.rise/s.run:0,Math.cos(l.heading)],length=shape==='ramp'?Math.hypot(s.run,s.rise)-.4:(l.segment.turn==='straight'?s.run-.4:s.run-l.width/2-.4);
    for(const mesh of [g,movement])assert.equal(ray(mesh,a.toArray(),new T.Vector3(...d).normalize().toArray(),length).length,0,shape+' player passage');
   }
  }finally{disposePart(g);disposePart(movement);}
 }
});

test('large Temple bridge has continuous transverse support slabs, a clear roadway and independently painted sides',()=>{
 const p=makePart('stair-route',structuredClone(YAVIN_PRESETS[5].preset));p.position=[0,4.7,0];
 const g=buildPart(p,{collision:'sync'});g.updateMatrixWorld(true);const movement=collisionProxy(g),ordnance=collisionProxy(g,16);
 try{
  for(const m of g.children.filter(m=>m.isMesh))assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(m,new T.Matrix4())));
  assert.ok(Math.abs(ray(g,[0,6,12],[0,-1,0],3)[0].point.y-4.7)<1e-5);
  assert.equal(ray(g,[0,6,-1],[0,0,1],26).length,0);assert.equal(ray(movement,[0,6,-1],[0,0,1],26).length,0);
  const slabs=g.children.filter(m=>m.userData.yavinBridgeSupport);assert.equal(slabs.length,5);
  // The web is solid across the bridge, rather than two legs around a hole.
  for(const x of [-4,0,4])for(const y of [.5,1.8,3.5])for(const mesh of [g,movement,ordnance])assert.ok(ray(mesh,[x,y,-1],[0,0,1],26).length,'solid transverse support web');
  for(const mesh of [g,movement,ordnance])assert.equal(ray(mesh,[-9,1.8,4.5],[1,0,0],18).length,0,'lateral underpass between successive support slabs');
  for(const m of slabs){const box=new T.Box3().setFromObject(m);assert.ok(box.max.x-box.min.x>15,'full-width flared footing');}
  const split=structuredClone(p);split.route.segments[0].run=12;split.route.segments.push({...structuredClone(split.route.segments[0]),run:12});const splitMesh=buildPart(split,{collision:false});try{assert.equal(splitMesh.children.filter(m=>m.userData.yavinBridgeSupport).length,slabs.length,'splitting a span preserves support spacing');}finally{disposePart(splitMesh);}
  assert.equal(ray(g,[-6,5.7,1.5],[1,0,0],12).length,0);assert.equal(ray(ordnance,[-6,5.7,1.5],[1,0,0],12).length,0,'shots pass between side blocks');
  assert.ok(ray(movement,[-6,5.7,1.5],[1,0,0],12).length,'guarded sides prevent walking through the openings');
  assert.ok(ray(g,[-6,5.7,3],[1,0,0],12).length);assert.ok(ray(g,[-6,7,1.5],[1,0,0],12).length);
  assert.ok(geometryStats(g).triangles<1000);
  assert.deepEqual(materialTargets(p).filter(([k])=>k!=='all').map(([,label])=>label),['Bridge deck','Bridge structure','Side blocks','Cap beams','Base curbs']);
  assert.equal(readMaterial(p,'rails').preset,'yavin-bridge-trim');
  for(const m of g.children.filter(m=>m.userData.yavinTempleBridgePart==='rails')){
   const uv=m.geometry.getAttribute('yavinTrimUV');assert.ok(uv);for(let i=0;i<uv.count;i++)assert.ok(uv.getY(i)>-1e-5&&uv.getY(i)<1.00001,'the cap artwork occupies the beam height once');
  }
 }finally{disposePart(g);disposePart(movement);disposePart(ordnance);}
 for(const shape of ['curve','corner']){
  const q=structuredClone(p),s=q.route.segments[0];if(shape==='curve')s.curveAngle=Math.PI/2;else{s.turn='right';q.route.segments.push({...structuredClone(s),run:12,turn:'straight'});}
  const mesh=buildPart(q,{collision:false});mesh.updateMatrixWorld(true);try{
   for(const m of mesh.children.filter(m=>m.isMesh))assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(m,new T.Matrix4())),shape);
   if(shape==='corner'){
    const seams=new Map();for(const m of mesh.children.filter(m=>m.userData.yavinTempleBridgePart==='rails')){const a=m.geometry.getAttribute('position'),uv=m.geometry.getAttribute('yavinTrimUV');for(let i=0;i<a.count;i++){const key=[a.getX(i),a.getY(i),a.getZ(i)].map(v=>Math.round(v*1e5)).join(',');if(!seams.has(key))seams.set(key,[]);seams.get(key).push({segment:m.userData.routeSegment,u:uv.getX(i)});}}
    const shared=[...seams.values()].filter(v=>new Set(v.map(p=>p.segment)).size>1);assert.ok(shared.length>0);for(const points of shared)assert.ok(Math.max(...points.map(p=>p.u))-Math.min(...points.map(p=>p.u))<1e-5,'carved cap artwork stays continuous across a corner');
   }
  }finally{disposePart(mesh);}
 }
});
