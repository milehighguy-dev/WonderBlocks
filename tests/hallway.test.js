import test from 'node:test';import assert from 'node:assert/strict';
import {defaultHallway,defaultHallwayRoute} from '../src/routes/hallway.js';
import {makePart,validateProject,History} from '../src/core/model.js';import {buildPart,disposePart} from '../src/core/geometry.js';import {routeLayout,validateRoute} from '../src/routes/stair-route.js';import {Vector3,Raycaster} from '../vendor/three.module.js';import {exportOBJ} from '../src/export/export.js';
const ray=(g,start,dir,distance)=>new Raycaster(new Vector3(...start),new Vector3(...dir),0,distance).intersectObject(g,true);
test('hallway has open ends, solid side walls and optional ceiling',()=>{
 const r=fixtureHallwayRoute(),p=makePart('stair-route',{route:r}),g=buildPart(p);g.updateMatrixWorld(true);
 assert.equal(ray(g,[0,1.7,-1],[0,0,1],6).length,0);
 assert.ok(ray(g,[0,1.7,2],[1,0,0],2).length);
 assert.ok(Math.abs(ray(g,[0,.1,2],[0,1,0],5)[0].point.y-3)<1e-5);
 assert.ok(ray(g,[0,1,2],[0,-1,0],2).length);
 disposePart(g);r.segments[0].hallway.ceiling=false;const open=buildPart(p);open.updateMatrixWorld(true);assert.equal(ray(open,[0,.1,2],[0,1,0],5).length,0);disposePart(open);
});
test('hallway corners connect to stairs with walkable clear junctions',()=>{
 for(const turn of ['left','right','return-left','return-right']){
  const r=fixtureHallwayRoute();r.segments.push({kind:'landing',run:2.5,rise:0,steps:1,turn,hallway:defaultHallway()},{kind:'stairs',run:3,rise:1.5,steps:8,turn:'straight',hallway:defaultHallway()},{kind:'landing',run:4,rise:0,steps:1,turn:'straight',hallway:defaultHallway()});
  const layout=routeLayout(r),g=buildPart(makePart('stair-route',{route:r}));g.updateMatrixWorld(true);
  for(let i=0;i<layout.length-1;i++){
   const l=layout[i],end=l.end,d=[Math.sin(l.endHeading),0,Math.cos(l.endHeading)];
   for(const height of [1,2.08])assert.equal(ray(g,[end[0]-d[0]*.3,end[1]+height,end[2]-d[2]*.3],d,.6).length,0,turn+' joint '+i);
  }
  assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));disposePart(g);
 }
});
test('hallway enclosure survives save and undo; invalid dimensions are rejected',()=>{
 const p={format:'open-building-studio',version:1,name:'Hall',parts:[makePart('stair-route',{route:fixtureHallwayRoute()})]},history=new History(p);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);p.parts[0].route.segments[0].hallway.ceiling=false;history.push(p);assert.equal(history.undo().parts[0].route.segments[0].hallway.ceiling,true);
 for(const change of [{height:1},{height:NaN},{thickness:0},{ceiling:'yes'},{surface:{preset:'bogus',scale:1}}]){const r=fixtureHallwayRoute();Object.assign(r.segments[0].hallway,change);assert.throws(()=>validateRoute(r));}
});

test('courtyard demonstration has a continuous clear walk across both levels',async()=>{
 const {hallwayClearanceFixture}=await import('./fixtures/hallway-clearance-fixture.js');const {Group}=await import('../vendor/three.module.js');
 const p=hallwayClearanceFixture();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 const route=p.parts.find(p=>p.route),g=new Group();p.parts.filter(p=>p.type!=='character-reference').forEach(p=>g.add(buildPart(p)));g.updateMatrixWorld(true);
 const layout=routeLayout(route.route);assert.equal(layout.at(-1).end[1],3);
 for(const l of layout)for(let i=1;i<20;i++){
  const t=i/20,s=l.segment,y=l.start[1]+(s.kind==='stairs'?Math.ceil(t*s.steps)*s.rise/s.steps:0),x=landingSample(l,t)[0],z=route.position[2]+landingSample(l,t)[1];
  assert.equal(ray(g,[x,y+.03,z],[0,1,0],2.1).length,0,'headroom segment '+layout.indexOf(l));
  const ground=ray(g,[x,y+.02,z],[0,-1,0],.04)[0];assert.ok(ground,'floor segment '+layout.indexOf(l));
 }
 disposePart(g);
});

test('adding a ramp after a hallway starts level and preserves its enclosure',async()=>{
 const {appendRouteSegment}=await import('../src/routes/route-actions.js');const original=fixtureHallwayRoute(),next=appendRouteSegment(original,'ramp');
 assert.equal(original.segments.length,1);assert.equal(next.segments[1].kind,'ramp');assert.equal(next.segments[1].rise,0);assert.equal(next.segments[1].width,2.5);assert.deepEqual(next.segments[1].hallway,original.segments[0].hallway);
 const g=buildPart(makePart('stair-route',{route:next}));g.updateMatrixWorld(true);
 assert.equal(ray(g,[0,1.7,-1],[0,0,1],10).length,0);assert.ok(Math.abs(ray(g,[0,.1,6],[0,1,0],5)[0].point.y-3)<1e-5);disposePart(g);
 next.segments[1].rise=1.5;validateRoute(next);const rising=buildPart(makePart('stair-route',{route:next}));rising.updateMatrixWorld(true);assert.equal(ray(rising,[0,1.7,3.8],[0,0,1],.4).length,0);disposePart(rising);
});

test('enclosed ramps and stairs descend with supported floors, headroom, and connected corners',async()=>{
 const {dragDimensions}=await import('../src/routes/stair-route.js');const {appendRouteSegment}=await import('../src/routes/route-actions.js');
 for(const kind of ['ramp','stairs']){
  let r=fixtureHallwayRoute();Object.assign(r.segments[0],{kind,run:4,rise:-2,steps:10,treadDepth:.4});
  const dragged=dragDimensions(r,0,4,-2,Math.atan2(-2,4),true);assert.equal(dragged.rise,-2);assert.equal(dragged.locked,true);
  r=appendRouteSegment(r,'left');assert.equal(r.segments.at(-1).kind,kind);assert.equal(r.segments.at(-1).rise,-2);
  const p=makePart('stair-route',{position:[0,5,0],route:r}),g=buildPart(p);g.updateMatrixWorld(true);
  for(const l of routeLayout(r))for(let i=0;i<10;i++){
   const t=(i+.5)/10,s=l.segment,y=5+l.start[1]+(s.kind==='landing'?0:s.kind==='stairs'?(s.rise<0?Math.floor(t*s.steps):Math.ceil(t*s.steps))*s.rise/s.steps:t*s.rise),x=landingSample(l,t)[0],z=landingSample(l,t)[1];
   assert.ok(ray(g,[x,y+.01,z],[0,-1,0],.03).length,'supported floor '+kind);
   assert.equal(ray(g,[x,y+.01,z],[0,1,0],2.1).length,0,'headroom '+kind);
  }
  assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));disposePart(g);
 }
});

// Follow the walking centreline around corners instead of sampling into the far wall.
function landingSample(l,t){
 const s=l.segment;let x=0,z=s.run*t;
 if(s.kind==='landing'&&(s.turn==='left'||s.turn==='right')){
  const forward=s.run-l.nextWidth/2,side=l.width/2,distance=t*(forward+side);
  z=Math.min(forward,distance);x=(s.turn==='left'?1:-1)*Math.max(0,distance-forward);
 }
 return [l.start[0]+Math.cos(l.heading)*x+Math.sin(l.heading)*z,l.start[2]-Math.sin(l.heading)*x+Math.cos(l.heading)*z];
}

// Fixed authored dimensions for geometry and clearance checks.
function fixtureHallwayRoute(){const r=defaultHallwayRoute();r.width=2.5;for(const s of r.segments)s.hallway.height=3;return r;}
