import test from 'node:test';import assert from 'node:assert/strict';
import {appendRouteSegment} from '../src/routes/route-actions.js';import {defaultRoute,routeLayout} from '../src/routes/stair-route.js';import {defaultHallway} from '../src/routes/hallway.js';
test('every floor shape can turn into every other floor shape while reusing existing level sections',()=>{
 for(const from of ['stairs','ramp','landing'])for(const to of ['stairs','ramp','landing'])for(const turn of ['left','right','return-left','return-right'])for(const enclosed of [false,true]){
  const r=defaultRoute({width:1.5});Object.assign(r.segments[0],{kind:from,run:6,rise:from==='landing'?0:-2});if(enclosed)r.segments[0].hallway=defaultHallway();const before=structuredClone(r);
  const n=appendRouteSegment(r,turn,to);assert.deepEqual(r,before);const corner=from==='landing'?0:1;assert.equal(n.segments.length,corner+2);if(corner)assert.deepEqual(n.segments[0],before.segments[0]);else assert.equal(n.segments[0].run,6);assert.equal(n.segments[corner].kind,'landing');assert.equal(n.segments[corner].turn,turn);assert.equal(n.segments.at(-1).kind,to);assert.equal(!!n.segments.at(-1).hallway,enclosed);if(to==='landing')assert.equal(n.segments.at(-1).rise,0);const layout=routeLayout(n);assert.deepEqual(layout[corner].end,layout[corner+1].start);assert.equal(layout[corner].endHeading,layout[corner+1].heading);
 }
});
test('turns default to the current shape, including flat ramps without hallway mode',()=>{
 for(const kind of ['stairs','ramp','landing']){const r=defaultRoute({width:1.5});Object.assign(r.segments[0],{kind,rise:0});const n=appendRouteSegment(r,'left');assert.equal(n.segments.at(-1).kind,kind);assert.equal(n.segments.at(-1).rise,0);}
});

test('stair landing turns sideways without inserting forward floor, and only short corners grow',()=>{
 for(const run of [.4,1.5,5])for(const turn of ['left','right']){
  const r=defaultRoute({width:1.5});r.segments.push({kind:'landing',run,rise:0,steps:1,turn:'straight',hallway:defaultHallway()});
  const before=routeLayout(r),n=appendRouteSegment(r,turn,'landing'),after=routeLayout(n);
  assert.equal(n.segments.length,3);assert.deepEqual(n.segments[0],r.segments[0]);assert.equal(n.segments[1].run,Math.max(1.5,run));
  assert.equal(after[1].start[2]+n.segments[1].run,before[1].start[2]+Math.max(1.5,run));
  assert.equal(after[2].start[0],turn==='left'?.75:-.75);assert.equal(after[2].start[2],before[1].start[2]+Math.max(1.5,run)-.75);
 }
});

import {branchRoute,continueSelectedPath,selectedPathEnd} from '../src/routes/route-actions.js';
test('selecting the original path after branching extends it and leaves the branch in place',()=>{
 let r=defaultRoute({width:1.5});Object.assign(r.segments[0],{kind:'landing',run:5,rise:0});r=appendRouteSegment(r,'landing');r=branchRoute(r,0,'left','landing');
 const before=routeLayout(r),result=continueSelectedPath(r,0,'left','landing'),after=routeLayout(result.route);
 assert.equal(selectedPathEnd(r,0),1);assert.equal(result.index,2);assert.equal(result.route.segments[1].turn,'left');assert.deepEqual(after[3].start,before[2].start);assert.equal(after[3].heading,before[2].heading);assert.deepEqual(r.segments[1].turn,'straight');
});
test('continuing selected branch keeps other paths and reindexes later junction references',()=>{
 let r=defaultRoute({width:1.5});Object.assign(r.segments[0],{kind:'landing',run:5,rise:0});r=branchRoute(r,0,'left','landing');r=branchRoute(r,1,'right','landing');
 const before=routeLayout(r),result=continueSelectedPath(r,0,'right','ramp'),after=routeLayout(result.route);
 assert.equal(result.route.segments[0].turn,'straight');assert.equal(result.route.segments[3].branchFrom.segment,0);assert.equal(result.route.segments[4].branchFrom.segment,3);assert.deepEqual(after[3].start,before[1].start);assert.deepEqual(after[4].start,before[2].start);
 const branch=continueSelectedPath(result.route,3,'landing','landing');assert.equal(branch.index,4);assert.deepEqual(branch.route.segments.slice(0,3),result.route.segments.slice(0,3));assert.equal(branch.route.segments[5].branchFrom.segment,3);
});

import {resizeRouteWidth} from '../src/routes/route-actions.js';
import {minimumRun,dragDimensions,validateRoute} from '../src/routes/stair-route.js';

test('widening tight curved flights grows their run and preserves whole stair treads',()=>{
 for(const kind of ['stairs','ramp','landing'])for(const angle of [-Math.PI,Math.PI]){
  const r=defaultRoute({width:1.5});r.width=2;Object.assign(r.segments[0],{kind,curveAngle:angle,run:4,rise:kind==='landing'?0:2,steps:16,treadDepth:.25});
  const before=structuredClone(r),n=resizeRouteWidth(r,6),s=n.segments[0];assert.ok(s.run>=minimumRun(n,0));validateRoute(n);assert.deepEqual(r,before);
  if(kind==='stairs'){assert.equal(s.run,s.steps*.25);assert.equal(s.treadDepth,.25);}
  n.segments.push({kind:'landing',turn:'straight',run:3,rise:0,steps:1});const [a,b]=routeLayout(n);assert.deepEqual(a.end,b.start);assert.equal(a.endHeading,b.heading);
 }
});

test('tight-curve dragging never cuts the last tread short and rejects impossible step budgets',()=>{
 const r=defaultRoute({width:1.5});r.width=5;Object.assign(r.segments[0],{curveAngle:Math.PI,run:12,rise:2,steps:40,treadDepth:.3});
 const dimensions=dragDimensions(r,0,.2,1,0,false);assert.equal(dimensions.run,dimensions.steps*dimensions.treadDepth);assert.ok(dimensions.run>=minimumRun(r,0));Object.assign(r.segments[0],dimensions);validateRoute(r);
 r.segments[0].treadDepth=.05;assert.throws(()=>dragDimensions(r,0,.2,1,0,false),/64 steps/);
 assert.throws(()=>resizeRouteWidth(r,10),/64 steps/);
});

test('new sections inherit support and floor finish from the section being extended',()=>{
 const r=defaultRoute({width:1.5});r.segments[0].fillToGround=true;r.segments[0].floorFinish={color:'#ff0000'};
 r.segments.push({kind:'landing',turn:'straight',run:4,rise:0,steps:1,floorFinish:{color:'#ffffff'}});
 const n=appendRouteSegment(r,'stairs'),added=n.segments.at(-1);assert.equal(added.fillToGround,undefined);assert.deepEqual(added.floorFinish,{color:'#ffffff'});added.floorFinish.color='#00ff00';assert.equal(r.segments[1].floorFinish.color,'#ffffff');
 r.segments[1].fillToGround=false;assert.equal(appendRouteSegment(r,'ramp').segments.at(-1).fillToGround,false);
});

test('whole-route width clears overrides and fits corners when widening or narrowing',()=>{
 const landing=(run,width,turn='straight')=>({kind:'landing',run,rise:0,steps:1,turn,width});
 const stepped=defaultRoute({width:1.5});stepped.segments[0].width=2;stepped.segments.push(landing(2,2,'left'));
 const cases=[
  {name:'widen then narrow',route:stepped,targets:[4,2],corner:1},
  {name:'narrow an oversized corner',route:{width:8,thickness:.18,gap:.15,segments:[landing(8,8,'left'),landing(2,8)]},targets:[2],corner:0,end:[1,0,1]},
 ];
 for(const {name,route,targets,corner,end} of cases){
  const before=structuredClone(route);let resized=route;
  for(const width of targets){
   resized=resizeRouteWidth(resized,width);
   assert.equal(resized.width,width,name);
   assert.ok(resized.segments.every(s=>s.width===undefined),name+' clears every override');
   const layout=routeLayout(resized);
   assert.ok(layout.every(l=>l.width===width),name+' uses the width throughout');
   assert.equal(resized.segments[corner].run,width,name+' fits the corner');
   if(end)assert.deepEqual(layout[corner].end,end,name+' retains the expected endpoint');
  }
  assert.deepEqual(route,before,name+' leaves its source unchanged');
 }
});
test('route width gives side junctions room and preserves deliberately long landings',()=>{let r=defaultRoute({width:1.5});r.segments=[{kind:'landing',turn:'straight',run:3,rise:0,steps:1}];r=branchRoute(r,0,'left');const n=resizeRouteWidth(r,5);assert.equal(n.segments[0].run,5);assert.ok(routeLayout(n).every(l=>l.width===5));n.segments[1]={kind:'landing',turn:'left',run:8,rise:0,steps:1};assert.equal(resizeRouteWidth(n,2).segments[1].run,8);assert.throws(()=>resizeRouteWidth(r,NaN),/width/);assert.throws(()=>resizeRouteWidth(r,0),/width/);});

test('continuations inherit cutting settings from the selected endpoint rather than an older flight',()=>{const r=defaultRoute({width:1.5});r.segments[0].cutThroughSolids=true;r.segments[0].cutHeight=8;r.segments.push({kind:'landing',run:4,rise:0,steps:1,turn:'straight',cutThroughSolids:false,cutHeight:3});for(const action of ['stairs','ramp','landing','left']){const n=appendRouteSegment(r,action,'stairs');assert.equal(n.segments.at(-1).cutThroughSolids,false);assert.equal(n.segments.at(-1).cutHeight,3);}delete r.segments[1].cutThroughSolids;delete r.segments[1].cutHeight;const n=appendRouteSegment(r,'stairs');assert.equal(n.segments.at(-1).cutThroughSolids,undefined);assert.equal(n.segments.at(-1).cutHeight,undefined);});
