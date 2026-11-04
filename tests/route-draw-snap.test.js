import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart as makeFixturePart} from '../src/core/model.js';
import {defaultHallwayRoute} from '../src/routes/hallway.js';
import {drawnRouteSnapTargets,routeAnchorTargets} from '../src/routes/route-snap.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
const part=()=>makePart('stair-route',{route:fixtureHallwayRoute()});
test('drawing toward another route offers an exact connection before the mouse is aligned',()=>{
 const a=part(),b=part();a.position=[0,0,12];const before=JSON.stringify([a,b]);
 const target=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');
 assert.ok(target);assert.deepEqual(routeLayout(target.effective.route).at(-1).end,[0,0,12]);
 const resolved=resolveRouteLinks([a,target.effective]);assert.ok(resolved[0].route.externalOpenings.some(o=>o.side==='back'));
 assert.equal(JSON.stringify([a,b]),before);
 assert.equal(drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing',new Set([a.id])).length,0);
});
test('a drawn ramp keeps its style and a flat gesture automatically creates stairs between heights',()=>{
 const a=part(),b=part();a.position=[0,3,12];
 const target=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'ramp').find(t=>t.ref.side==='back');assert.ok(target);assert.equal(routeLayout(target.effective.route).at(-1).end[1],3);
 const automatic=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');assert.ok(automatic);assert.equal(automatic.effective.route.segments.at(-1).kind,'stairs');assert.equal(routeLayout(automatic.effective.route).at(-1).end[1],3);assert.equal(automatic.effective.route.segments.length,2);
});
test('a new side branch connects to the facing anchor of a parallel route',()=>{
 const a=part(),b=part();a.position=[8,0,0];
 const target=drawnRouteSnapTargets([a,b],b,{type:'branch',index:0,side:'left'},'landing').find(t=>t.ref.side==='right');assert.ok(target);
 assert.deepEqual(target.effective.route.links.end,target.ref);assert.equal(target.effective.route.segments.at(-1).branchFrom.segment,0);
});

test('destination anchors stay visible before dragging even when the current endpoint cannot connect',()=>{
 const a=part(),b=part();a.position=[8,3,12];b.rotation[1]=.31;
 const before=JSON.stringify([a,b]),anchors=routeAnchorTargets([a,b],b);
 assert.equal(anchors.length,4);assert.ok(anchors.every(t=>t.guide&&!t.effective));
 assert.equal(JSON.stringify([a,b]),before);
 assert.equal(routeAnchorTargets([a,b],b,new Set([a.id])).length,0);
});

test('offset routes fit an approach and remain connected after resolving the saved link',()=>{
 for(const angle of [0,.12,.6]){
 const a=part(),b=part();a.position=[1.3,0,12];a.rotation[1]=angle;const before=JSON.stringify([a,b]);
 const target=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');assert.ok(target,`angle ${angle}`);
 const linked=resolveRouteLinks([a,target.effective]).find(p=>p.id===b.id),end=routeLayout(linked.route).at(-1).end;
 assert.ok(Math.hypot(end[0]-target.point.x,end[2]-target.point.z)<1e-4);
 assert.ok(Math.abs(Math.atan2(Math.sin(routeLayout(linked.route).at(-1).endHeading-angle),Math.cos(routeLayout(linked.route).at(-1).endHeading-angle)))<1e-4);
 assert.equal(JSON.stringify([a,b]),before);
 }
});

test('automatic connections descend and fit rotated elevated destinations without manual height changes',()=>{
 for(const height of [-3,3]){
 const a=part(),b=part();a.position=[1.3,height,12];a.rotation[1]=.12;
 const target=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');assert.ok(target);
 const layout=routeLayout(target.effective.route),flight=layout.find(l=>l.segment.kind==='stairs');assert.ok(flight);assert.equal(flight.segment.rise,height);
 const end=layout.at(-1).end;assert.ok(Math.hypot(end[0]-target.point.x,end[1]-target.point.y,end[2]-target.point.z)<1e-4);
 assert.ok(target.effective.route.segments.filter(s=>s.kind==='landing').every(s=>s.rise===0));
 }
});
test('automatic height fitting preserves ramp preference and leaves same-height joins flat',()=>{
 const a=part(),b=part();b.route.segments[0].kind='ramp';b.route.segments[0].rise=1;a.position=[0,4,12];
 const ramp=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');assert.ok(ramp);assert.equal(ramp.effective.route.segments.at(-1).kind,'ramp');assert.equal(ramp.effective.route.segments.at(-1).rise,3);
 a.position[1]=1;const flat=drawnRouteSnapTargets([a,b],b,{type:'end',index:0},'landing').find(t=>t.ref.side==='back');assert.ok(flat);assert.equal(flat.effective.route.segments.at(-1).kind,'landing');assert.equal(flat.effective.route.segments.length,2);assert.equal(flat.effective.route.segments.at(-1).run,8);
});

// These authored snap fixtures use the original narrow route width.
function makePart(type,options){const p=makeFixturePart(type,options);if(type==='stair-route'&&!options?.route)p.route.width=1.5;return p;}

function fixtureHallwayRoute(){const r=defaultHallwayRoute();r.width=2.5;return r;}
