import test from 'node:test';import assert from 'node:assert/strict';
import {snapRouteToSurface} from '../src/editor/surface-snap.js';
import {defaultRoute,dragDimensions} from '../src/routes/stair-route.js';
import {makePart as makeFixturePart} from '../src/core/model.js';import {buildPart,disposePart} from '../src/core/geometry.js';
function target(x=0,y=0,z=3,w=2,h=2,d=2){const g=buildPart(makePart('block',{name:'Platform',position:[x,y,z],scale:[w,h,d]}));g.updateMatrixWorld(true);return g;}
function values(p,run=3,rise=1.85){return dragDimensions(p.route,0,run,rise,0,false);}
test('surface snap reaches actual platform height without stretching tread depth',()=>{
 const p=makePart('stair-route'),g=target();const snap=snapRouteToSurface(p,0,values(p),[g]);assert.equal(snap.rise,2);assert.equal(snap.run,3);assert.equal(snap.run/snap.steps,.375);assert.equal(snap.surfaceSnap,'Platform');assert.equal(snap.locked,false);disposePart(g);
});
test('surface snap may add a whole tread to reach the edge but never snaps across empty space',()=>{
 const p=makePart('stair-route'),g=target(0,0,3.6,2,2,.6); // starts at z=3.3
 assert.equal(snapRouteToSurface(p,0,values(p),[g]),null); // next .375 step exceeds .35 capture radius
 const result=snapRouteToSurface(p,0,values(p),[g],{tolerance:.4});assert.equal(result.run,3.375);assert.equal(result.steps,9);
 g.position.x=5;g.updateMatrixWorld(true);assert.equal(snapRouteToSurface(p,0,values(p),[g]),null);disposePart(g);
});
test('surface snap ignores hidden/self targets, rail caps and surfaces outside capture height',()=>{
 const p=makePart('stair-route'),g=target();g.visible=false;assert.equal(snapRouteToSurface(p,0,values(p),[g]),null);g.visible=true;g.children[0].material.userData.railing=true;assert.equal(snapRouteToSurface(p,0,values(p),[g]),null);delete g.children[0].material.userData.railing;assert.equal(snapRouteToSurface(p,0,values(p,3,.8),[g]),null);disposePart(g);
});
test('surface heights convert correctly for scaled rotated routes; landings stay level',()=>{
 const p=makePart('stair-route',{position:[1,1,0],rotation:[0,Math.PI/2,0],scale:[1,2,2]}),g=target(7,0,0,2,5,2);
 assert.ok(Math.abs(snapRouteToSurface(p,0,values(p,3,1.9),[g]).rise-2)<1e-6);
 p.route.segments[0].kind='landing';assert.equal(snapRouteToSurface(p,0,values(p),[g]),null);disposePart(g);
});

test('descending flights snap down to a lower platform',()=>{
 const p=makePart('stair-route',{position:[0,4,0]}),g=target();
 const snap=snapRouteToSurface(p,0,values(p,3,-1.85),[g]);assert.ok(snap);assert.equal(snap.rise,-2);assert.equal(snap.surfacePoint[1],2);disposePart(g);
});


test('arrival requires support across the route width, not just under its centre',()=>{
 const p=makePart('stair-route'),narrow=target(0,0,3,.5,2,2),wide=target();
 assert.equal(snapRouteToSurface(p,0,values(p),[narrow]),null);
 assert.ok(snapRouteToSurface(p,0,values(p),[wide]));disposePart(narrow);disposePart(wide);
});
test('arrival rejects a low ceiling and accepts character headroom',()=>{
 const p=makePart('stair-route'),platform=target(),ceiling=target(0,3.5,3,3,.2,2);
 assert.equal(snapRouteToSurface(p,0,values(p),[platform,ceiling]),null);
 ceiling.position.y=4.5;ceiling.updateMatrixWorld(true);
 assert.ok(snapRouteToSurface(p,0,values(p),[platform,ceiling]));disposePart(platform);disposePart(ceiling);
});
test('flat paths snap only to surfaces at their existing level',()=>{
 const p=makePart('stair-route',{position:[0,2,0]});p.route.segments[0].kind='landing';p.route.segments[0].rise=0;
 const g=target();assert.ok(snapRouteToSurface(p,0,{run:3,rise:0,steps:1},[g]));
 g.position.y=.15;g.updateMatrixWorld(true);assert.equal(snapRouteToSurface(p,0,{run:3,rise:0,steps:1},[g]),null);disposePart(g);
});

// These authored snap fixtures use the original narrow route width.
function makePart(type,options){const p=makeFixturePart(type,options);if(type==='stair-route'&&!options?.route)p.route.width=1.5;return p;}
