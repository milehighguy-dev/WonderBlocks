import test from 'node:test';import assert from 'node:assert/strict';
import {makePart as makeFixturePart} from '../src/core/model.js';import {defaultHallwayRoute} from '../src/routes/hallway.js';import {routeSnapTargets,nearestRouteBubble} from '../src/routes/route-snap.js';import {PerspectiveCamera,Vector3} from '../vendor/three.module.js';
const part=()=>makePart('stair-route',{route:fixtureHallwayRoute()});
test('start bubbles expose compatible landing sides without mutating either route',()=>{const a=part(),b=part(),before=JSON.stringify([a,b]);assert.equal(routeSnapTargets([a,b],b,'start').length,4);assert.equal(JSON.stringify([a,b]),before);assert.equal(routeSnapTargets([a,b],b,'start',new Set([a.id])).length,0);b.route.width=9;assert.equal(routeSnapTargets([a,b],b,'start').length,0);});
test('end bubble fits a ramp to elevated landing and rejects wrong direction and flat height',()=>{const a=part(),b=part();a.position=[0,3,10];b.route.segments[0].kind='ramp';const targets=routeSnapTargets([a,b],b,'end');assert.equal(targets.length,1);assert.equal(targets[0].ref.side,'back');assert.equal(targets[0].effective.route.segments[0].rise,3);b.route.segments[0].kind='landing';assert.equal(routeSnapTargets([a,b],b,'end').length,0);});
test('bubble hit testing uses screen distance and excludes points behind camera',()=>{const camera=new PerspectiveCamera(60,1,.1,100);camera.updateMatrixWorld();const front={point:new Vector3(0,0,-5)},back={point:new Vector3(0,0,5)},rect={left:0,top:0,width:500,height:500};assert.equal(nearestRouteBubble([back,front],camera,rect,260,250),front);assert.equal(nearestRouteBubble([front],camera,rect,290,250),null);});

// These authored snap fixtures use the original narrow route width.
function makePart(type,options){const p=makeFixturePart(type,options);if(type==='stair-route'&&!options?.route)p.route.width=1.5;return p;}

function fixtureHallwayRoute(){const r=defaultHallwayRoute();r.width=2.5;return r;}
