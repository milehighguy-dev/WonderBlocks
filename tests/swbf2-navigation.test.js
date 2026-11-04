import {SWBF2_VALIDATION_SCRIPT} from '../src/swbf2/swbf2-validation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {planSWBF2,createSWBF2Package} from '../src/swbf2/export-swbf2.js';
import {defaultInterior} from '../src/interiors/interior.js';
import {roomFromRoute} from '../src/interiors/room-route.js';
import {planningFile,barrierFile,navigationFromInput,generateSWBF2Navigation} from '../src/swbf2/swbf2-navigation.js';
import {entranceFixture} from './fixtures/entrance-fixture.js';
import {connectedInteriorDraft,saveConnectedInterior} from '../src/interiors/connected-interior.js';
import {storeysFixture} from './fixtures/storeys-fixture.js';
import {preparedNavigationVoids} from '../src/swbf2/swbf2-navigation-voids.js';
import {curveMeshPoint} from '../src/routes/curved-route.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {navigationPreview} from '../src/swbf2/swbf2-navigation-preview.js';
import {highwayJunctionFixture} from './fixtures/highway-junction-fixture.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createObjectCollision} from '../src/collision/object-collision.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';

const project=parts=>({format:'open-building-studio',version:1,name:'Automatic navigation',parts});
function route({width=4,run=12,rise=0,curveAngle=0,position=[0,5,0],rails='none'}={}){const p=makePart('stair-route',{position});p.route.width=width;p.route.segments=[{kind:rise?'stairs':'landing',run,rise,steps:12,turn:'straight',...(curveAngle?{curveAngle}:{}),railing:{style:rails,sides:'both'}}];return p;}
function crossing(a,b,bar){const start=new T.Vector3(...bar.corners[0]),end=new T.Vector3(...bar.corners[1]),dir=end.clone().sub(start).normalize(),normal=new T.Vector3(-dir.z,0,dir.x),half=[start.distanceTo(end)/2,new T.Vector3(...bar.corners[3]).distanceTo(start)/2],center=start.clone().lerp(end,.5),u=new T.Vector3(...a).sub(center),w=new T.Vector3(...b).sub(center),s=[u.dot(dir),u.dot(normal)],e=[w.dot(dir),w.dot(normal)];let lo=0,hi=1;for(let i=0;i<2;i++){const d=e[i]-s[i];if(Math.abs(d)<1e-8){if(Math.abs(s[i])>half[i])return false;continue;}let x=(-half[i]-s[i])/d,y=(half[i]-s[i])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return false;}return true;}

test('ordinary straight routes simplify without waiting for the native hub limit',()=>{
 for(const width of [2,4]){const r=route({width,rails:'solid'});r.route.segments=Array.from({length:6},()=>({...r.route.segments[0],run:6}));const p=project([r]),before=JSON.stringify(p),n=planSWBF2(p).navigation;
  assert.equal(n.hubs.length,width===2?2:4);assert.equal(n.connections.length,n.hubs.length-1);assert.equal(n.components.length,1);assert.equal(n.barriers.length,4,'one barrier per outer side, including supported end protection');assert.ok(n.stats.compactedRouteSamples>0);assert.ok(n.stats.removedRedundantConnections>0);assert.equal(JSON.stringify(p),before);
  const map=new Map(n.hubs.map(h=>[h.name,h]));for(const c of n.connections)for(const b of n.barriers)assert.equal(crossing(map.get(c.start).position,map.get(c.end).position,b),false);
 }
});

test('straight routes retain authored width transitions and changes of grade',()=>{
 const r=route({width:1.6});r.route.segments=[1.6,2,1.6].map(width=>({kind:'ramp',run:6,rise:0,steps:1,turn:'straight',width}));const n=planSWBF2(project([r])).navigation;
 for(const z of [6,12])assert.ok(n.hubs.some(h=>h.kind==='transition'&&Math.abs(h.position[2]-z)<.01),'width change at '+z);assert.equal(n.components.length,1);
 const slope=route({width:2});slope.route.segments=[{kind:'landing',run:6,rise:0,steps:1,turn:'straight'},{kind:'ramp',run:6,rise:2,steps:1,turn:'straight'},{kind:'landing',run:6,rise:0,steps:1,turn:'straight'}];const ramp=planSWBF2(project([slope])).navigation;assert.equal(ramp.components.length,1);assert.ok(ramp.hubs.length>=4);assert.ok(ramp.hubs.some(h=>h.position[1]>6.9));
});

test('barrier checks cover the ends of a long simplified arc over another walking area',()=>{
 for(const angle of [0,.63]){
 const ground=makePart('block',{position:[0,-.2,60],scale:[300,.2,300]}),upper=route({width:2,position:[0,10,0]}),lower=route({width:4,run:12,position:[-6,0,32]}),wall=makePart('block',{position:[0,0,32],scale:[3,3,.5]});upper.route.segments=Array.from({length:20},()=>({...upper.route.segments[0],run:6}));lower.rotation[1]=Math.PI/2;for(const part of [upper,lower,wall]){part.position=new T.Vector3(...part.position).applyAxisAngle(new T.Vector3(0,1,0),angle).toArray();part.rotation[1]+=angle;}
 const n=planSWBF2(project([ground,upper,lower,wall])).navigation,hubs=new Map(n.hubs.map(h=>[h.name,h]));const long=n.connections.find(c=>{const a=hubs.get(c.start),b=hubs.get(c.end);return a.partIds.includes(upper.id)&&b.partIds.includes(upper.id)&&new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position))>100;});assert.ok(long,'the upper route has a genuinely long arc');assert.ok(n.stats.suppressedBarriers>0);
 for(const b of n.barriers)assert.equal(crossing(hubs.get(long.start).position,hubs.get(long.end).position,b),false,'a lower obstacle must not cut the long upper arc near its end');
 }
});

test('automatic planning follows a curved stair ramp and is independent of export splitting',()=>{
 const r=route({run:18,rise:4,curveAngle:Math.PI/2,rails:'posts'}),p=project([r]),before=JSON.stringify(p),a=planSWBF2(p,{routeSections:1}).navigation,b=planSWBF2(p,{routeSections:6}).navigation;
 assert.deepEqual(a,b);assert.equal(JSON.stringify(p),before);assert.ok(a.hubs.length>=6);assert.equal(a.components.length,1);assert.ok(a.hubs.some(h=>h.position[1]>8.5));assert.ok(a.barriers.length>0);
 assert.ok(a.connections.every(c=>c.flags===3));assert.ok([...a.hubs,...a.connections,...a.barriers].every(n=>n.name.length<=15));
 const hubs=new Map(a.hubs.map(h=>[h.name,h.position]));for(const c of a.connections)for(const bar of a.barriers)assert.equal(crossing(hubs.get(c.start),hubs.get(c.end),bar),false,'barrier must not cross a verified arc');
});

test('a wall crossing a route breaks planning and is estimated as an obstacle',()=>{
 const r=route(),wall=makePart('block',{position:[0,5,6],scale:[5,3,.5]}),nav=planSWBF2(project([r,wall])).navigation,map=new Map(nav.hubs.map(h=>[h.name,h]));
 assert.ok(nav.components.length>=2);assert.ok(nav.barriers.some(b=>b.sourcePartId===wall.id&&b.kind==='wall'));
 for(const c of nav.connections){const a=map.get(c.start).position,b=map.get(c.end).position;assert.equal((a[2]<5.75&&b[2]>6.25)||(b[2]<5.75&&a[2]>6.25),false);}
});

test('native connection widths stay on a curved deck and remain clear of generated barriers',()=>{
 const r=route({run:18,curveAngle:Math.PI/2}),n=planSWBF2(project([r])).navigation,root=buildPart(r,{parts:[r]}),collision=createWalkCollision([root]),hubs=new Map(n.hubs.map(h=>[h.name,h])),ray=new T.Raycaster();
 try{
  assert.ok(n.hubs.some(h=>h.radius>0),'retain physically supported corridor widths');assert.equal(n.components.length,1);
  for(const c of n.connections){const a=hubs.get(c.start),b=hubs.get(c.end),start=new T.Vector3(...a.position),end=new T.Vector3(...b.position),side=new T.Vector3(end.z-start.z,0,start.x-end.x).normalize(),steps=Math.ceil(start.distanceTo(end)/.17);
   for(let i=0;i<=steps;i++){const t=i/steps,center=start.clone().lerp(end,t),extent=T.MathUtils.lerp(a.radius,b.radius,t)+n.rules.agentRadius;
    for(const lane of [-1,-.5,0,.5,1]){const point=center.clone().addScaledVector(side,extent*lane);ray.set(point.clone().add(new T.Vector3(0,.6,0)),new T.Vector3(0,-1,0));ray.near=.0001;ray.far=1.2;const floor=collision.firstHit(ray);
     assert.ok(floor&&Math.abs(floor.point.y-point.y)<=n.rules.step+.03,'native lateral corridor retains floor support');
     for(const bar of n.barriers)assert.equal(crossing(point.toArray(),point.toArray(),bar),false,'barriers must not enter native connection widths');
    }
   }
  }
 }finally{disposePart(root);}
});

test('rooms connect through actual doors and their entrances remain free of AI barriers',()=>{
 const r=route({width:2,run:6}),connected=roomFromRoute(r),p=project([connected.route,connected.room]),nav=planSWBF2(p).navigation;
 assert.equal(nav.components.length,1);assert.ok(nav.hubs.some(h=>h.partIds.includes(connected.room.id)&&new T.Vector3(...h.position).distanceTo(new T.Vector3(...connected.room.position))<1.2));
 const point=connected.room.position;for(const b of nav.barriers)assert.equal(crossing(point,point,b),false);
 const interior=defaultInterior();interior.rooms=[{id:'a',x:0,z:0,w:5,d:5},{id:'b',x:5,z:0,w:5,d:5}];interior.doors=[{axis:'z',line:5,offset:2.5,width:1.3,height:2.3}];
 const two=planSWBF2(project([makePart('interior',{interior})])).navigation;assert.equal(two.components.length,1,'shared wall door joins both rooms');
});

test('nearby rooms without a door never acquire a connection through a wall',()=>{
 const room=makePart('interior'),r=route({position:[3,0,-6],run:6,width:2}),nav=planSWBF2(project([room,r])).navigation;
 assert.ok(nav.components.length>1);assert.ok(!nav.components.some(c=>c.partIds.includes(room.id)&&c.partIds.includes(r.id)));
});

test('projected edge barriers do not obstruct an elevated crossing',()=>{
 const lower=route({position:[0,3,-6],run:12,width:4}),upper=route({position:[-6,9,0],run:12,width:4});upper.rotation[1]=Math.PI/2;
 const nav=planSWBF2(project([lower,upper])).navigation,hubs=new Map(nav.hubs.map(h=>[h.name,h.position]));
 assert.equal(nav.components.length,2);assert.ok(nav.stats.suppressedBarriers>0);
 for(const c of nav.connections){assert.ok(Math.abs(hubs.get(c.start)[1]-hubs.get(c.end)[1])<.01);for(const b of nav.barriers)assert.equal(crossing(hubs.get(c.start),hubs.get(c.end),b),false);}
});

test('platforms get planning, foliage does not, and a large ground block cannot starve routes',()=>{
 const deck=makePart('platform'),nav=planSWBF2(project([deck])).navigation;assert.ok(nav.hubs.length>1);assert.ok(nav.barriers.length>0);assert.equal(nav.components.length,1);
 const ground=makePart('block',{scale:[500,.2,500]}),r=route({position:[0,20,0]}),withGround=planSWBF2(project([ground,r])).navigation;
 assert.ok(withGround.hubs.some(h=>h.partIds.includes(r.id)));assert.ok(!withGround.hubs.some(h=>h.partIds.includes(ground.id)));assert.equal(withGround.stats.limitsReached,false);
 const tree=makePart('flora');assert.equal(planSWBF2(project([tree])).navigation.hubs.length,0);
});

test('native source companions and provenance are included by default and can be disabled',()=>{
 const p=project([route()]),output=createSWBF2Package(p,{shadows:false,lowDetail:false}),n=output.manifest.navigation;
 assert.ok(n.hubs>0);assert.equal(n.unitTypes[0],'soldier');const report=JSON.parse(output.files.get(n.report));assert.equal(output.files.get(n.planningFile),planningFile(report));assert.equal(output.files.get(n.barrierFile),barrierFile(report));assert.match(SWBF2_VALIDATION_SCRIPT,/PathPlanningMunge/);assert.match(output.files.get('world1/automatic_navigation.req'),/"congraph"/);assert.match(SWBF2_VALIDATION_SCRIPT,/GraphIncludedInLevel/);
 const disabled=createSWBF2Package(p,{aiNavigation:false});assert.equal(disabled.manifest.navigation,undefined);assert.ok(![...disabled.files.keys()].some(p=>/\.(pln|bar)$/.test(p)));assert.throws(()=>planSWBF2(p,{aiNavigation:'yes'}),/Invalid export option/);
 const request=output.files.get('world1/automatic_navigation.req');assert.ok(request.indexOf('"congraph"')<request.indexOf('"world"'),'planning must be registered before world instances');assert.match(SWBF2_VALIDATION_SCRIPT,/Packed AI planning must load before its world/);
});

test('broad scenes adapt sampling to native hub and connection limits',()=>{
 const parts=Array.from({length:3},(_,i)=>{const p=makePart('platform',{position:[i*130,5,0]});Object.assign(p.platform.sections[0],{width:100,depth:100});p.platform.railing='none';return p;}),p=project(parts),nav=planSWBF2(p).navigation;
 assert.ok(nav.hubs.length<=255);assert.ok(nav.connections.length<=255);assert.equal(nav.stats.limitsReached,false);assert.equal(nav.components.length,3);for(const part of parts)assert.ok(nav.hubs.some(h=>h.partIds.includes(part.id)));
 const degree=new Map();for(const c of nav.connections)for(const name of [c.start,c.end])degree.set(name,(degree.get(name)??0)+1);assert.ok([...degree.values()].every(d=>d<=8));
});

test('sparse planning on a broad cliff deck still guards its whole exposed perimeter',()=>{
 const deck=makePart('platform',{position:[0,12,0]});Object.assign(deck.platform.sections[0],{width:34,depth:78,radius:0});deck.platform.railing='none';
 const root=buildPart(deck,{collision:'sync'});
 try{
  const nav=generateSWBF2Navigation([deck],[root],{spacing:16.464});
  for(const side of [-1,1]){
   for(let z=-37;z<=37;z+=1)assert.ok(nav.barriers.some(b=>crossing([side*16.3,12,z],[side*17.7,12,z],b)),'lateral cliff edge '+[side,z]);
   for(let x=-16;x<=16;x+=1)assert.ok(nav.barriers.some(b=>crossing([x,12,side*38.3],[x,12,side*39.7],b)),'end cliff edge '+[side,x]);
   for(const end of [-1,1])assert.ok(nav.barriers.some(b=>crossing([side*16.3,12,end*38.3],[side*17.7,12,end*39.7],b)),'exposed corner '+[side,end]);
  }
  const hubs=new Map(nav.hubs.map(h=>[h.name,h.position]));for(const c of nav.connections)for(const b of nav.barriers)assert.equal(crossing(hubs.get(c.start),hubs.get(c.end),b),false,'edge protection leaves planning open');
 }finally{disposePart(root);}
});

test('planning cannot be placed on a route embedded inside a large uncut solid',()=>{
 const r=route({width:4,position:[0,5,0]}),solid=makePart('block',{position:[0,0,6],scale:[20,10,30]}),nav=planSWBF2(project([r,solid])).navigation;
 assert.ok(!nav.hubs.some(h=>h.partIds.includes(r.id)));assert.ok(nav.warnings.some(w=>w.includes('No safe AI planning surface')));
});

test('worker inputs reproduce navigation without rebuilding or changing object collision',()=>{
 const r=route({rise:2,curveAngle:.7}),c=roomFromRoute(r),p=project([c.route,c.room]),direct=planSWBF2(p).navigation,deferred=planSWBF2(p,{},null,{deferNavigation:true}),input=structuredClone(deferred.navigationInput),before=JSON.stringify(input);
 assert.deepEqual(navigationFromInput(input),direct);assert.equal(JSON.stringify(input),before);
});

test('standalone solid walls inform barriers without being mistaken for walking routes',()=>{
 const deck=makePart('platform');Object.assign(deck.platform.sections[0],{width:12,depth:12});const wall=makePart('wall-route',{name:'Boundary wall'});wall.route.segments[0].run=8;
 const n=planSWBF2(project([deck,wall])).navigation;assert.ok(n.barriers.some(b=>b.sourcePartId===wall.id));assert.ok(!n.warnings.some(w=>w.includes('No safe AI planning surface')));assert.ok(!n.hubs.some(h=>h.partIds.includes(wall.id)));
});

test('attached rooms join their arrival route without generating planning on the host roof',()=>{
 const p=entranceFixture(),host=p.parts[0],draft=connectedInteriorDraft(host,host.entrances[0]);p.parts[0]=saveConnectedInterior(draft,draft.part.interior);
 const n=planSWBF2(p).navigation;assert.equal(n.components.length,1);assert.ok(n.hubs.some(h=>h.partIds.includes(host.id)));assert.ok(n.hubs.every(h=>h.position[1]<12));
});

test('interior floors connect through their actual stairs, with both elevations represented',()=>{
 const p=storeysFixture(),n=planSWBF2(p).navigation,room=p.parts[0],groups=n.components.filter(c=>c.partIds.includes(room.id));
 assert.equal(groups.length,1);const roomNodes=n.hubs.filter(h=>h.partIds.includes(room.id));assert.ok(Math.min(...roomNodes.map(h=>h.position[1]))<.3);assert.ok(Math.max(...roomNodes.map(h=>h.position[1]))>3);
});

test('stacked walking surfaces use point hubs so native horizontal hub tests cannot select the wrong floor',()=>{
 const lower=route({position:[0,2,0],run:12,width:4}),upper=route({position:[0,6,0],run:12,width:4}),n=planSWBF2(project([lower,upper])).navigation;
 assert.equal(n.components.length,2);assert.ok(n.hubs.length>3);assert.ok(n.hubs.every(h=>h.layered&&h.radius===0&&h.walkableRadius>0));assert.equal(n.stats.layeredPointHubs,n.hubs.length);
 // Native ConnectivityNode::IsPointInside compares X/Z distance to radius
 // squared and ignores Y. No node circle may capture the lower-floor query.
 const query=n.hubs.find(h=>h.partIds.includes(lower.id)).position;assert.ok(!n.hubs.some(h=>(query[0]-h.position[0])**2+(query[2]-h.position[2])**2<h.radius**2));
 assert.ok(n.connections.every(c=>c.flags===3),'normal and HOVER infantry both retain paths');
});

test('unplanned physical ground also protects elevated hub classification without consuming planning budget',()=>{
 const ground=makePart('block',{scale:[500,.2,500]}),upper=route({position:[0,20,0]}),n=planSWBF2(project([ground,upper])).navigation;
 assert.ok(!n.hubs.some(h=>h.partIds.includes(ground.id)));assert.ok(n.hubs.every(h=>h.radius===0&&h.layered));assert.equal(n.components.length,1);
});

test('large background blocks cannot trigger false source limits or spread sampling away from route intent',()=>{
 for(const y of [0,20]){const ground=makePart('block',{scale:[1000,.2,1000]}),r=route({position:[0,y,0]}),n=planSWBF2(project([ground,r])).navigation;
  assert.equal(n.stats.limitsReached,false);assert.ok(n.hubs.length<20);assert.ok(n.hubs.every(h=>Math.abs(h.position[0])<8&&h.position[2]>-8&&h.position[2]<20));
 }
});

test('floor seams may join but unsupported gaps cannot hide between connection probes',()=>{
 for(const gap of [.08,.16,.24,.26,.32,.36,.5]){
  const a=route({run:6}),b=route({run:6,position:[0,5,6+gap]}),n=planSWBF2(project([a,b])).navigation;
  assert.equal(n.components.length,gap<=n.rules.seamGap?1:2,'floor gap '+gap);
 }
});

test('a maximum-length segmented route retains its far end by compacting verified straight spans',()=>{
 const r=route({run:6});r.route.segments=Array.from({length:256},()=>({...r.route.segments[0]}));const n=planSWBF2(project([r])).navigation;
 assert.ok(n.hubs.length<=255);assert.ok(n.connections.length<=255);assert.equal(n.stats.limitsReached,false);assert.equal(n.components.length,1);assert.ok(n.stats.compactedRouteSamples>0);
 assert.ok(Math.min(...n.hubs.map(h=>h.position[2]))<1);assert.ok(Math.max(...n.hubs.map(h=>h.position[2]))>1535,'far route end remains reachable');
 const hubs=new Map(n.hubs.map(h=>[h.name,h.position]));for(const c of n.connections){const a=hubs.get(c.start),b=hubs.get(c.end),middle=(a[2]+b[2])/2;for(const x of [-2,2])assert.ok(n.barriers.some(bar=>crossing([x-.2,5,middle],[x+.2,5,middle],bar)),'route edges remain guarded midway between sparse hubs');}
});

test('small standalone floors have a usable native connection instead of an untyped lone hub',()=>{
 const deck=makePart('platform');Object.assign(deck.platform.sections[0],{width:2,depth:2,radius:0});deck.platform.railing='none';const n=planSWBF2(project([deck])).navigation;
 assert.equal(n.hubs.length,2);assert.equal(n.connections.length,1);assert.equal(n.stats.pairedIsolatedSamples,1);assert.equal(n.stats.isolatedHubs,0);assert.equal(n.components.length,1);
 assert.equal(new Set(n.hubs.map(h=>h.name)).size,n.hubs.length);assert.ok(n.hubs.every(h=>h.position[0]>=-.7&&h.position[0]<=.7&&h.position[2]>=-.7&&h.position[2]<=.7));
 for(const h of n.hubs)for(const axis of [0,2])assert.ok(Math.abs(h.position[axis])+h.radius+n.rules.agentRadius<=1+.00001,'random hub targets must retain whole-footprint edge clearance');
});

test('world bounds include native obstacle circles and report the mission extent requirement',()=>{
 const deck=makePart('platform',{position:[80,5,-90]});Object.assign(deck.platform.sections[0],{width:2,depth:2,radius:0});deck.platform.railing='none';const output=createSWBF2Package(project([deck]),{shadows:false,lowDetail:false}),nav=JSON.parse(output.files.get(output.manifest.navigation.report)),bounds=output.manifest.worldBounds;
 for(const bar of nav.barriers){const x=bar.corners.reduce((sum,p)=>sum+p[0],0)/4,z=bar.corners.reduce((sum,p)=>sum+p[2],0)/4,r=Math.max(...bar.corners.map(p=>Math.hypot(p[0]-x,p[2]-z)));assert.ok(bounds.min[0]<x-r&&bounds.max[0]>x+r&&bounds.min[2]<z-r&&bounds.max[2]>z+r);}
 assert.ok(output.manifest.navigation.minimumWorldExtent>90);assert.match(output.files.get('README.txt'),new RegExp('SetWorldExtents must be at least '+output.manifest.navigation.minimumWorldExtent));
});

test('sloped and rounded wall faces also inform nearby AI obstacles',()=>{
 const deck=makePart('platform');Object.assign(deck.platform.sections[0],{width:12,depth:12,radius:0});deck.platform.railing='none';const obstacle=makePart('orb',{scale:[3,3,3]}),n=planSWBF2(project([deck,obstacle])).navigation;
 assert.ok(n.barriers.some(b=>b.sourcePartId===obstacle.id&&b.kind==='wall'));
 const hubs=new Map(n.hubs.map(h=>[h.name,h.position]));for(const c of n.connections)for(const b of n.barriers)assert.equal(crossing(hubs.get(c.start),hubs.get(c.end),b),false);
});

test('low movement blockers and head-height obstructions both receive barrier estimates',()=>{
 for(const [height,offset] of [[.8,0],[.25,1.55]]){const deck=makePart('platform');Object.assign(deck.platform.sections[0],{width:12,depth:12,radius:0});deck.platform.railing='none';const obstacle=makePart('block',{position:[0,offset,0],scale:[2,height,2],interiorProp:true}),n=planSWBF2(project([deck,obstacle])).navigation;
  assert.ok(n.barriers.some(b=>b.sourcePartId===obstacle.id&&b.kind==='wall'),'obstacle spanning '+offset+'–'+(offset+height)+'m');
 }
});

test('bark containment exclusions use the real curved passage instead of its bounding rectangle',()=>{
 const r=route({run:12,rise:3,curveAngle:Math.PI/2,position:[8,10,-6]});r.rotation[1]=.6;r.route.cutThroughSolids=true;r.route.cutHeight=3;const before=JSON.stringify(r),inside=preparedNavigationVoids([r]),frame=partMatrix(r);
 for(const z of [1,6,11]){const point=new T.Vector3(...curveMeshPoint(0,3*z/12,z,12,Math.PI/2)).applyMatrix4(frame);assert.equal(inside(point.clone().add(new T.Vector3(0,.9,0))),true);assert.equal(inside(point.clone().add(new T.Vector3(0,5,0))),false);}
 assert.equal(inside(new T.Vector3(-3,1,5).applyMatrix4(frame)),false,'unused inside bend remains solid');assert.equal(JSON.stringify(r),before);r.route.cutThroughSolids=false;assert.equal(preparedNavigationVoids([r])(new T.Vector3(...curveMeshPoint(0,1.5,6,12,Math.PI/2)).applyMatrix4(frame)),false);
});

test('protected flora props do not inherit passage exclusions that never cut their physical skin',()=>{
 const tree=makePart('flora',{interiorProp:true}),r=route({run:4,position:[0,0,-2]});r.route.cutThroughSolids=true;const root=new T.Group(),mesh=new T.Mesh(new T.CylinderGeometry(8,10,30,16,1,true),new T.MeshBasicMaterial());mesh.userData.floraComponent='bark';root.add(mesh);root.userData={partId:tree.id,collision:createObjectCollision(tree,root)};const walkway=buildPart(r,{parts:[tree,r]});
 try{const n=generateSWBF2Navigation([tree,r],[root,walkway]);assert.equal(n.hubs.length,0);assert.ok(n.warnings.some(w=>w.includes('No safe AI planning surface')));}finally{disposePart(root);disposePart(walkway);}
});

test('offline navigation previews include source data safely and are packaged for review',()=>{
 const p=project([route()]),output=createSWBF2Package(p,{shadows:false,lowDetail:false}),path=output.manifest.navigation.preview;assert.equal(path,'ai-navigation-preview.html');assert.ok(output.files.has(path));assert.match(output.files.get('README.txt'),/ai-navigation-preview.html/);
 const nav=JSON.parse(output.files.get(output.manifest.navigation.report)),unsafe={name:'</script><script>window.injected=true</script>',parts:[{id:'p',name:'<img onerror=window.injected=true>'}]},html=navigationPreview(unsafe,nav);
 assert.ok(!html.includes(unsafe.name));assert.ok(!html.includes(unsafe.parts[0].name));const embedded=html.match(/<script id="navigation-data" type="application\/json">([\s\S]*?)<\/script>/)[1];assert.deepEqual(JSON.parse(embedded).navigation,nav);assert.equal(JSON.parse(embedded).project,unsafe.name);assert.ok(!/\b(?:src|href)="https?:/i.test(html));
});

test('a level highway intersection remains connected despite a precise floor seam, while its overpass stays separate',()=>{
 const p=highwayJunctionFixture(),n=planSWBF2(p).navigation;
 assert.equal(n.components.length,2);assert.equal(n.components.filter(c=>c.partIds.includes('highway-main')).length,1);assert.ok(n.components.some(c=>c.partIds.includes('highway-main')&&c.partIds.includes('highway-crossing')));assert.ok(!n.components.some(c=>c.partIds.includes('highway-main')&&c.partIds.includes('highway-overpass')));
});

test('mixed route sections keep identical planning when render assets split at different section boundaries',()=>{
 const r=route({run:12,rise:2,curveAngle:.5,rails:'posts'}),flight={...r.route.segments[0]};r.route.segments=Array.from({length:8},(_,i)=>i%2?{kind:'landing',run:5,rise:0,steps:1,turn:'straight',railing:{style:'posts',sides:'both'}}:{...flight});
 const p=project([r]),one=planSWBF2(p,{routeSections:1}),six=planSWBF2(p,{routeSections:6});assert.ok(one.assets.length>six.assets.length);assert.deepEqual(one.navigation,six.navigation);assert.equal(one.navigation.components.length,1);
});
