import test from 'node:test';import assert from 'node:assert/strict';
import {makePart as makeFixturePart} from '../src/core/model.js';import {defaultHallwayRoute} from '../src/routes/hallway.js';import {unionConnectedRoutes} from '../src/routes/route-union.js';import {routeLayout} from '../src/routes/stair-route.js';import {removeRouteSegment,continueSelectedPath} from '../src/routes/route-actions.js';import {drawnRouteSnapTargets} from '../src/routes/route-snap.js';import {resolveRouteLinks} from '../src/routes/route-links.js';import {buildPart,disposePart} from '../src/core/geometry.js';
const part=()=>makePart('stair-route',{route:fixtureHallwayRoute()});
test('joining two routes unions their editable sections and preserves world endpoints',()=>{
 const a=part(),b=part();a.position=[1.3,3,12];a.rotation[1]=.12;
 const target=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');assert.ok(target);
 const input=[a,target.effective],before=JSON.stringify(input),result=unionConnectedRoutes(input,b.id),merged=result.parts[0];assert.equal(result.parts.length,1);assert.equal(merged.id,b.id);assert.equal(merged.route.segments.length,a.route.segments.length+target.effective.route.segments.length);
 assert.equal(merged.route.segments.at(-1).joinTo.segment,0);const layout=routeLayout(merged.route);assert.ok(Math.hypot(...layout[0].start.map((n,i)=>n-a.position[i]))<1e-6);assert.ok(Math.hypot(...layout.at(-1).end.map((n,i)=>n-target.point.toArray()[i]))<1e-5);
 assert.equal(JSON.stringify(input),before);assert.doesNotThrow(()=>resolveRouteLinks(JSON.parse(JSON.stringify(result.parts))));const mesh=buildPart(merged);disposePart(mesh);
});
test('deleting a middle section leaves both remaining pieces where they were and they can extend',()=>{
 const p=part();let route=continueSelectedPath(p.route,0,'stairs','stairs').route;route=continueSelectedPath(route,1,'landing','landing').route;const before=routeLayout(route),next=removeRouteSegment(route,1),after=routeLayout(next);
 assert.deepEqual(after[1].start,before[2].start);assert.deepEqual(after[1].end,before[2].end);assert.ok(next.segments[1].pathStart);const extended=continueSelectedPath(next,0,'landing','landing');assert.deepEqual(routeLayout(extended.route).at(-1).start,before[2].start);
});
test('deleting a union junction disconnects the link and preserves the remaining route',()=>{
 const a=part(),b=part();a.position=[0,3,12];const target=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back'),merged=unionConnectedRoutes([a,target.effective],b.id).parts[0],before=routeLayout(merged.route),route=removeRouteSegment(merged.route,0);
 assert.equal(route.segments.at(-1).joinTo,undefined);assert.deepEqual(routeLayout(route).at(-1).end,before.at(-1).end);
});

import {platformPorts,platformRailSpans} from '../src/platforms/platform.js';
test('merging keeps platform attachments, railing gaps, and other routes anchored to remapped sections',()=>{
 const platform=makePart('platform'),a=part(),b=part(),c=part();a.route.links={start:platformPorts(platform).find(p=>p.ref.side==='back').ref};
 b.route.links={start:{partId:a.id,segment:0,side:'left'}};c.route.links={start:{partId:b.id,segment:0,side:'front'}};
 const original=resolveRouteLinks([platform,a,b,c]),total=parts=>platformRailSpans(platform,parts).reduce((sum,[a,b])=>sum+a.distanceTo(b),0),before=total(original),result=unionConnectedRoutes(original,b.id),merged=result.parts.find(p=>p.id===b.id),third=result.parts.find(p=>p.id===c.id);
 assert.equal(result.parts.length,3);assert.equal(merged.route.attachments[0].ref.partId,platform.id);assert.equal(third.route.links.start.segment,1);assert.ok(Math.abs(total(result.parts)-before)<1e-6);
 assert.deepEqual(third.position,original.find(p=>p.id===c.id).position);
});

import {roomFromRoute} from '../src/interiors/room-route.js';
import {platformFromRoute} from '../src/platforms/platform-flow.js';
test('room and platform actions use a selected path endpoint inside a merged route',()=>{
 const p=part();p.route.segments.push({...structuredClone(p.route.segments[0]),pathStart:{point:[10,3,0],heading:0}});
 for(const result of [roomFromRoute(p,0),platformFromRoute(p,0)]){
  const destination=result.room||result.platform;assert.deepEqual(destination.position,[0,0,4]);assert.equal(result.route.route.attachments[0].index,0);assert.equal(result.route.route.links?.end,undefined);
  assert.doesNotThrow(()=>resolveRouteLinks([result.route,destination]));assert.deepEqual(routeLayout(result.route.route).at(-1).start,[10,3,0]);
 }
});

// These authored snap fixtures use the original narrow route width.
function makePart(type,options){const p=makeFixturePart(type,options);if(type==='stair-route'&&!options?.route)p.route.width=1.5;return p;}

function fixtureHallwayRoute(){const r=defaultHallwayRoute();r.width=2.5;return r;}

test('merging a plain route into a textured route keeps its original deck material',()=>{
 const a=part(),b=part();a.position=[0,0,10];delete a.surface;
 b.surface={preset:'metal',scale:.5};b.route.links={end:{partId:a.id,segment:0,side:'back'}};
 const merged=unionConnectedRoutes([a,b],b.id).parts[0];
 assert.equal(merged.route.segments[0].floorFinish.surface.preset,'plain');
 assert.equal(merged.route.segments.at(-1).floorFinish.surface.preset,'metal');
 const mesh=buildPart(merged),plain=mesh.children.find(m=>m.userData.routeSegment===0&&m.userData.routeFloor);
 assert.ok(plain);assert.equal(plain.material.map,null);
 disposePart(mesh);
});

test('merging preserves open-section cutting choices and clearance without applying them to other paths',()=>{const a=part(),b=part();for(const p of [a,b])delete p.route.segments[0].hallway;a.route.cutThroughSolids=true;a.route.cutHeight=3;a.position=[0,3,12];const target=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');assert.ok(target);const merged=unionConnectedRoutes([a,target.effective],b.id).parts[0];assert.equal(merged.route.segments[0].cutThroughSolids,true);assert.equal(merged.route.segments[0].cutHeight,3);assert.equal(merged.route.segments.at(-1).cutThroughSolids,false);});
