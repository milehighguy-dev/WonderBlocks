import {moveWalker,groundAt} from '../src/walk/walk-physics.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {coruscantResidential} from '../examples/generators/coruscant-residential-demo.js';
import {validateProject} from '../src/core/model.js';
import {junctionPort} from '../src/routes/route-junctions.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {roomPorts} from '../src/interiors/room-route.js';
import {platformPort,platformRailSpans} from '../src/platforms/platform.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {stairConnection} from '../src/interiors/interior-storeys.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {curveMeshPoint} from '../src/routes/curved-route.js';
import * as T from '../vendor/three.module.js';
const find=(p,name)=>p.parts.find(p=>p.name===name);
const destination=(p,ref)=>{const part=p.parts.find(p=>p.id===ref.partId);return ref.platformSection?platformPort(part,ref):ref.roomDoorId?roomPorts(part).find(q=>q.ref.roomDoorId===ref.roomDoorId&&q.ref.levelId===ref.levelId):{point:new T.Vector3(...junctionPort(routeLayout(part.route),ref).point).applyMatrix4(partMatrix(part))};};
const sceneOf=p=>{const scene=new T.Group(),cuts=prepareInteriorCuts(p.parts);for(const part of p.parts)scene.add(buildPart(part,{parts:p.parts,openingCuts:cuts,batch:true}));scene.updateMatrixWorld(true);return scene;};
const sample=(part,l,t,y=0)=>{const s=l.segment,q=curveMeshPoint(0,s.rise*t,s.run*t,s.run,s.curveAngle||0),c=Math.cos(l.heading),n=Math.sin(l.heading);return new T.Vector3(l.start[0]+c*q[0]+n*q[2],l.start[1]+q[1]+y,l.start[2]-n*q[0]+c*q[2]).applyMatrix4(partMatrix(part));};

test('rebuilt district saves and every occupied building and street platform is connected',()=>{
 const p=coruscantResidential();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 const graph=new Map(),edge=(a,b)=>{if(!graph.has(a))graph.set(a,new Set());graph.get(a).add(b);};
 for(const route of p.parts.filter(p=>p.route))for(const ref of Object.values(route.route.links||{})){edge(route.id,ref.partId);edge(ref.partId,route.id);}
 const apartment=find(p,'START · penthouse apartment'),queue=[apartment.id],seen=new Set(queue);
 for(const id of queue)for(const next of graph.get(id)||[])if(!seen.has(next)){seen.add(next);queue.push(next);}
 for(const part of p.parts.filter(p=>p.platform||p.interior))assert.ok(seen.has(part.id),part.name+' is reachable');
});

test('external connectors join neighboring spaces and meet their actual ports',()=>{
 const p=coruscantResidential();
 for(const part of p.parts.filter(p=>p.route)){
  const layout=routeLayout(part.route);
  for(const [end,ref] of Object.entries(part.route.links||{})){
   const point=destination(p,ref).point,actual=new T.Vector3(...(end==='start'?layout[0].start:layout.at(-1).end)).applyMatrix4(partMatrix(part));
   assert.ok(point.distanceTo(actual)<1e-4,part.name+' '+end+' reaches its port');
  }
  if(!/winding undercity street|upper gallery street/.test(part.name)&&part.route.links){
   assert.ok(part.route.segments.reduce((sum,s)=>sum+s.run,0)<=24,part.name+' stays local');
  }
 }
 assert.ok(!p.parts.some(p=>/through-route|public descent|descending covered service stair|dispatch hall|transfer stair/.test(p.name)),'old connector-chain layout is gone');
});

test('residence, market and underground are vertically integrated around shared circulation cores',()=>{
 const p=coruscantResidential(),tower=find(p,'Meridian tower · inhabited circulation core'),plaza=find(p,'Lower market plaza · public concourse'),arrival=find(p,'Undercity arrival square'),apartment=find(p,'START · penthouse apartment');
 assert.equal(apartment.position[1],72);assert.equal(plaza.position[1],36);assert.equal(arrival.position[1],0);
 assert.equal(plaza.position[0],arrival.position[0]);assert.equal(plaza.position[2],arrival.position[2]);
 assert.deepEqual(tower.interior.storeys.map(s=>s.elevation),[12,24,36,48,60,72]);
 assert.equal(p.parts.filter(p=>p.name==='Luxury neighboring tower shaft').length,3);
 for(const core of p.parts.filter(p=>p.interior?.stairs?.length)){
  for(const stair of core.interior.stairs){const connection=stairConnection(core.interior,stair);assert.ok(connection.reached,core.name+' reaches '+stair.to);assert.ok(connection.cutouts.length>0);assert.ok(connection.route.segments.every(s=>s.run<=12&&Math.abs(s.rise)<=6),'short return flights fit within each core');}
 }
});

test('linked platform openings stay clear of railings',()=>{
 const p=coruscantResidential();for(const route of p.parts.filter(p=>p.route))for(const ref of Object.values(route.route.links||{})){
  if(!ref.platformSection)continue;const part=p.parts.find(p=>p.id===ref.partId),port=platformPort(part,ref),point=port.point.clone().applyMatrix4(partMatrix(part).invert());
  for(const [a,b] of platformRailSpans(part,p.parts)){const v=b.clone().sub(a),t=Math.max(0,Math.min(1,point.clone().sub(a).dot(v)/v.lengthSq()));assert.ok(a.clone().addScaledVector(v,t).distanceTo(point)>.3,route.name+' railing gap');}
 }
});

test('scene remains finite and smaller than the old connector-heavy district',()=>{
 const p=coruscantResidential(),scene=sceneOf(p);scene.traverse(m=>{if(m.geometry)assert.ok([...m.geometry.attributes.position.array,...m.geometry.attributes.normal.array].every(Number.isFinite));});
 const stats=geometryStats(scene);assert.ok(p.parts.length<320);assert.ok(stats.triangles<55000,stats.triangles+' triangles');assert.ok(stats.meshes<650,stats.meshes+' batches');disposePart(scene);
});

test('penthouse retains its curved terrace, generous entrance and protected furnishings',()=>{
 const p=coruscantResidential(),apartment=find(p,'START · penthouse apartment'),terrace=find(p,'Penthouse curved reception terrace');assert.ok(apartment.interior.rooms[0].curve);assert.equal(apartment.interior.height,7.2);assert.ok(terrace.platform.sections.some(s=>s.kind==='half-circle'));assert.equal(apartment.interior.doors.find(d=>d.axis==='x'&&d.line===8).width,9.2);
 const sofa=find(p,'Apartment sofa');assert.equal(sofa.interiorProp,true);const mesh=buildPart(sofa,{parts:p.parts,openingCuts:prepareInteriorCuts(p.parts)});assert.equal(geometryStats(mesh).triangles,12);disposePart(mesh);
});

test('the undercity is an inhabited rim approach with connected shops and raised galleries',()=>{
 const p=coruscantResidential(),shops=p.parts.filter(p=>p.interior&&p.name.includes('undercity storefront')),streets=p.parts.filter(p=>p.name.includes('winding undercity street'));
 assert.equal(shops.length,12);assert.equal(streets.length,2);assert.equal(p.parts.filter(p=>p.name.includes('upper gallery street')).length,2);assert.equal(p.parts.filter(p=>p.name.startsWith('Undercity upper crossbridge')).length,3);
 assert.ok(streets.every(p=>p.route.segments.some(s=>s.curveAngle)&&p.route.segments.every(s=>s.fillToGround&&s.cutThroughSolids)));
 const exit=find(p,'Undercity far market square'),freight=find(p,'Rim freight works · vertical cargo circulation');assert.ok(new T.Vector3(...exit.position).distanceTo(new T.Vector3(...freight.position))<55,'street ends at the freight building, not a remote tunnel');
 assert.equal(freight.position[1],-30);assert.equal(freight.interior.storeys.at(-1).elevation,30);
});

test('roads and doors are clear through the retaining shell and surrounding city',()=>{
 const p=coruscantResidential(),scene=sceneOf(p),directions=[new T.Vector3(1,0,0),new T.Vector3(-1,0,0),new T.Vector3(0,0,1),new T.Vector3(0,0,-1)];
 for(const street of p.parts.filter(p=>/winding undercity street|upper gallery street/.test(p.name)))for(const l of routeLayout(street.route))for(const t of [.15,.5,.85]){
  const center=sample(street,l,t,2);
  for(const direction of directions)assert.equal(new T.Raycaster(center,direction,0,.3).intersectObject(scene,true).length,0,street.name+' section '+l.index+' has body clearance');
  const floor=new T.Raycaster(center,new T.Vector3(0,-1,0),0,2.1).intersectObject(scene,true);assert.ok(floor.some(hit=>Math.abs(hit.point.y-street.position[1])<1e-4),street.name+' has a continuous walking surface');
 }
 for(const room of p.parts.filter(p=>p.interior))for(const port of roomPorts(room).filter(q=>q.kind!=='window')){
  const outward=new T.Vector3(Math.sin(port.angle),0,Math.cos(port.angle)),start=port.point.clone().addScaledVector(outward,.6).add(new T.Vector3(0,2,0));
  assert.equal(new T.Raycaster(start,outward.negate(),0,1.2).intersectObject(scene,true).length,0,room.name+' doorway is clear');
 }
 const arrival=find(p,'Undercity arrival square'),floor=new T.Raycaster(new T.Vector3(...arrival.position).add(new T.Vector3(0,2,0)),new T.Vector3(0,-1,0),0,2.1).intersectObject(scene,true);assert.ok(floor.length&&Math.abs(floor[0].point.y)<1e-4,'the courtyard basement is clear beneath the market podium');
 disposePart(scene);
});

test('freight apron sits inside the hollow shaft and the centre remains a deep void',()=>{
 const p=coruscantResidential(),shaft=find(p,'Sinkhole circular retaining shaft'),yard=find(p,'Sinkhole lower loading platform');assert.equal(shaft.type,'ring-body');assert.equal(shaft.parameters.sides,48);assert.equal(p.parts.filter(p=>p.name==='Sinkhole annular service belt').length,5);
 const section=yard.platform.sections[0],matrix=partMatrix(yard),safe=shaft.scale[0]*(.5-shaft.parameters.wallThickness/100)*Math.cos(Math.PI/48);
 for(const x of [-section.width/2,section.width/2])for(const z of [-section.depth/2,section.depth/2]){const v=new T.Vector3(x,0,z).applyMatrix4(matrix);assert.ok(Math.hypot(v.x,v.z-shaft.position[2])<safe-1);}
 const mesh=buildPart(shaft,{parts:p.parts,openingCuts:prepareInteriorCuts(p.parts)});mesh.updateMatrixWorld(true);assert.equal(new T.Raycaster(new T.Vector3(0,100,-266),new T.Vector3(0,-1,0),0,170).intersectObject(mesh,true).length,0);disposePart(mesh);
});


test('internal return stairs have continuous headroom through every floor opening',()=>{
 const p=coruscantResidential(),scene=sceneOf(p);
 for(const core of p.parts.filter(p=>p.interior?.stairs?.length))for(const stair of core.interior.stairs){
  const connection=stairConnection(core.interior,stair),c=Math.cos(connection.yaw),n=Math.sin(connection.yaw),matrix=partMatrix(core);
  for(const l of routeLayout(connection.route).filter(l=>l.segment.kind==='stairs'))for(const t of [.2,.5,.8,.95]){
   const x=l.start[0]+Math.sin(l.heading)*l.segment.run*t,z=l.start[2]+Math.cos(l.heading)*l.segment.run*t;
   const point=new T.Vector3(stair.x+c*x+n*z,connection.from.elevation+l.start[1]+l.segment.rise*t+.25,stair.z-n*x+c*z).applyMatrix4(matrix);
   assert.equal(new T.Raycaster(point,new T.Vector3(0,1,0),0,1.75).intersectObject(scene,true).length,0,core.name+' '+stair.from+' has two metres of clearance above its stairs');
  }
 }
 disposePart(scene);
});


test('the loaded trooper can walk through stairwell openings without hiding ceilings',()=>{
 const p=coruscantResidential(),height=2.083869437337853;
 for(const core of p.parts.filter(p=>p.interior?.stairs?.length)){
  const mesh=buildPart(core,{batch:true});mesh.updateMatrixWorld(true);
  for(const stair of core.interior.stairs){
   const connection=stairConnection(core.interior,stair),flight=routeLayout(connection.route)[2],start=sample({position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},flight,.25);
   const c=Math.cos(connection.yaw),n=Math.sin(connection.yaw),matrix=partMatrix(core);
   let feet=new T.Vector3(stair.x+c*start.x+n*start.z,connection.from.elevation+start.y,stair.z-n*start.x+c*start.z).applyMatrix4(matrix);
   feet.y=groundAt([mesh],feet,.4,.6).point.y;
   const angle=core.rotation[1]+connection.yaw+flight.heading,direction=new T.Vector3(Math.sin(angle),0,Math.cos(angle));
   for(let i=0;i<Math.ceil((flight.segment.run*.75+.5)/.08);i++)feet=moveWalker([mesh],feet,direction.clone().multiplyScalar(.08),height,.24,.4);
   assert.ok(feet.y>=core.position[1]+connection.to.elevation-.01,core.name+' '+stair.from+' must reach the upper floor with the trooper collision body');
  }
  disposePart(mesh);
 }
});
