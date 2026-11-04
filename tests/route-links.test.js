import test from 'node:test';import assert from 'node:assert/strict';import {makePart as makeFixturePart,validateProject} from '../src/core/model.js';import {defaultHallwayRoute} from '../src/routes/hallway.js';import {resolveRouteLinks,cleanResolvedRoutes} from '../src/routes/route-links.js';import {buildPart,disposePart} from '../src/core/geometry.js';import {Vector3,Raycaster} from '../vendor/three.module.js';
const target=()=>makePart('stair-route',{name:'Old route',route:fixtureHallwayRoute()});
test('new route starts on an existing landing, follows transforms and opens its wall',()=>{
 const a=target(),b=target();b.route.links={start:{partId:a.id,segment:0,side:'left'}};let parts=resolveRouteLinks([a,b]);assert.deepEqual(parts[1].position,[1.25,0,2]);assert.equal(parts[1].rotation[1],Math.PI/2);assert.equal(a.route.externalOpenings,undefined);
 const g=buildPart(parts[0]);g.updateMatrixWorld(true);assert.equal(new Raycaster(new Vector3(0,1,2),new Vector3(1,0,0),0,3).intersectObject(g,true).length,0);disposePart(g);
 a.position=[3,2,5];a.rotation[1]=Math.PI/2;parts=resolveRouteLinks([a,b]);assert.ok(new Vector3(...parts[1].position).distanceTo(new Vector3(5,2,3.75))<1e-6);assert.equal(parts[1].rotation[1],Math.PI);
 const p={format:'open-building-studio',version:1,name:'Linked',parts:cleanResolvedRoutes([a,b])};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
});
test('route end joins another object and fits height; cycles, missing landings and bad approaches are rejected',()=>{
 const a=target(),b=target();a.position=[0,3,10];b.route.segments[0].kind='ramp';b.route.links={end:{partId:a.id,segment:0,side:'back'}};let parts=resolveRouteLinks([a,b]);assert.equal(parts[1].route.segments[0].run,10);assert.equal(parts[1].route.segments[0].rise,3);
 a.position[2]=12;assert.equal(resolveRouteLinks([a,b])[1].route.segments[0].run,12);
 a.position[0]=3;assert.throws(()=>resolveRouteLinks([a,b]),/Aim/);a.position[0]=0;
 a.route.links={start:{partId:b.id,segment:0,side:'back'}};assert.throws(()=>resolveRouteLinks([a,b]),/cycle/);delete a.route.links;
 a.route.segments[0].kind='stairs';assert.throws(()=>resolveRouteLinks([a,b]),/flat landing/);assert.throws(()=>resolveRouteLinks([b]),/another route/);
});

// These authored snap fixtures use the original narrow route width.
function makePart(type,options){const p=makeFixturePart(type,options);if(type==='stair-route'&&!options?.route)p.route.width=1.5;return p;}

function fixtureHallwayRoute(){const r=defaultHallwayRoute();r.width=2.5;return r;}

// Both doorway/platform anchors and route junctions must retain authored steps.
test('end connections preserve implicit and explicit tread pitch, refit resized runs, and remain stable on reload',()=>{
 for(const destination of ['platform','route'])for(const explicit of [false,true]){
  const a=destination==='platform'?makeFixturePart('platform',{position:[0,1.2,7.6]}):target();
  if(destination==='route'){a.position=[0,1.2,3.6];a.route.segments=[{kind:'landing',run:2,rise:0,steps:1,turn:'straight'}];}
  const ref=destination==='platform'?{partId:a.id,platformSection:a.platform.sections[0].id,side:'front'}:{partId:a.id,segment:0,side:'back'};
  const b=makeFixturePart('stair-route',{route:{width:2,thickness:.18,gap:.15,links:{end:ref},segments:[{kind:'stairs',run:3.6,rise:1.2,steps:6,turn:'straight',...(explicit?{treadDepth:.6}:{})}]}});
  const original=structuredClone(b),resolve=host=>resolveRouteLinks([host,b])[1];let fitted=resolve(a),section=fitted.route.segments[0];
  assert.equal(section.steps,6,destination+' must retain six authored steps');assert.ok(Math.abs(section.treadDepth-.6)<1e-8);assert.ok(Math.abs(section.rise/section.steps-.2)<1e-8);assert.deepEqual(b,original,'fitting must not mutate the source');
  const stable=structuredClone(fitted);for(let i=0;i<3;i++)fitted=resolveRouteLinks([a,fitted])[1];assert.deepEqual(fitted,stable);
  const moved=structuredClone(a);moved.position[2]+=1.2;section=resolve(moved).route.segments[0];assert.equal(section.steps,8);assert.ok(Math.abs(section.treadDepth-.6)<1e-8,'longer links retain the same tread pitch');
 }
});
