import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRoute,routeLayout,validateRoute} from '../src/routes/stair-route.js';
import {dragCurvedEndpoint,drawRouteSection} from '../src/routes/route-drawing.js';
import {appendRouteSegment} from '../src/routes/route-actions.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const route=()=>{const r=defaultRoute({width:2});Object.assign(r.segments[0],{run:8,rise:3,steps:24,treadDepth:1/3,curveAngle:Math.PI/2});return r;};

test('editing a curved endpoint can move sideways and change its bend without inserting a new section',()=>{
 const source=route(),before=structuredClone(source),entry=routeLayout(source)[0];
 for(const delta of [[2,0,-1],[-2,0,1],[-7,0,0]]){
  const values=dragCurvedEndpoint(source,0,delta,{snap:false,lockAngle:false}),next=structuredClone(source);Object.assign(next.segments[0],values);validateRoute(next);
  assert.notEqual(values.curveAngle,source.segments[0].curveAngle);assert.equal(next.segments.length,1);assert.deepEqual(routeLayout(next)[0].start,entry.start);close(values.rise,3);close(values.run,values.steps/3);close(values.treadDepth,1/3);
 }
 assert.deepEqual(source,before);assert.deepEqual(dragCurvedEndpoint(source,0,[2,0,-1]),dragCurvedEndpoint(source,0,[2,0,-1]),'every pointer frame starts from the captured route');
});

test('the green drawing arrow and orange endpoint use the same snapped and free curve fitting',()=>{
 const source=route();Object.assign(source.segments[0],{kind:'landing',rise:0});const old=routeLayout(source)[0].end;
 for(const snap of [false,true])for(const target of [[5,7],[-5,7],[7,-2]]){
  const values=dragCurvedEndpoint(source,0,[target[0]-old[0],0,target[1]-old[2]],{snap,lockAngle:false}),drawn=drawRouteSection(defaultRoute({width:2}),{type:'start',index:0},...target,'curved-landing',snap);
  close(values.curveAngle,drawn.route.segments[0].curveAngle);close(values.run,drawn.route.segments[0].run);
 }
});

test('editing a later curved flight preserves its incoming connection and tangent continuation',()=>{
 const source=route();source.segments[0].curveAngle=-.7;let next=appendRouteSegment(source,'stairs');Object.assign(next.segments[1],{run:8,rise:-2,steps:24,treadDepth:1/3,curveAngle:1.2});next=appendRouteSegment(next,'landing');const before=routeLayout(next);
 const values=dragCurvedEndpoint(next,1,[-2,0,1],{snap:false,lockAngle:false});Object.assign(next.segments[1],values);validateRoute(next);const after=routeLayout(next);
 assert.deepEqual(after[0],before[0]);assert.deepEqual(after[1].start,before[1].start);assert.deepEqual(after[1].end,after[2].start);close(after[1].endHeading,after[2].heading);close(values.rise,-2);
});

test('tight drags and a temporarily straight curve stay valid and can bend again',()=>{
 const source=route();for(const delta of [[-5,0,-5],[0,0,-12],[0,0,50]]){const values=dragCurvedEndpoint(source,0,delta,{snap:false});const next=structuredClone(source);Object.assign(next.segments[0],values);validateRoute(next);assert.ok(values.run<=30);assert.ok(Math.abs(values.curveAngle)<=Math.PI*1.5);}
 source.segments[0].curveAngle=0;assert.ok(dragCurvedEndpoint(source,0,[3,0,0],{snap:false}).curveAngle>0);
});
