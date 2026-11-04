import test from 'node:test';import assert from 'node:assert/strict';import {drawRouteSection} from '../src/routes/route-drawing.js';import {defaultRoute,routeLayout} from '../src/routes/stair-route.js';
const flat=()=>{const r=defaultRoute({width:1.5});Object.assign(r.segments[0],{kind:'landing',rise:0,run:4});return r;};
test('drawing start chooses a cardinal direction and retains whole stair treads',()=>{for(const [x,z,heading] of [[4,0,Math.PI/2],[0,4,0],[-4,0,-Math.PI/2]]){const result=drawRouteSection(flat(),{type:'start'},x,z,'stairs');assert.equal(result.heading,heading);const s=result.route.segments[0];assert.ok(Math.abs(s.steps*s.treadDepth-s.run)<1e-6);}});
test('drag sideways creates one corner and previews never accumulate sections',()=>{const r=flat(),before=structuredClone(r);const a=drawRouteSection(r,{type:'end',index:0},5,0,'landing'),b=drawRouteSection(r,{type:'end',index:0},8,0,'landing');assert.equal(a.route.segments.length,2);assert.equal(b.route.segments.length,2);assert.equal(b.route.segments[0].turn,'left');assert.deepEqual(r,before);assert.ok(routeLayout(b.route)[1].end[0]>routeLayout(a.route)[1].end[0]);});
test('drawing a branch preserves its parent and chooses the requested shape',()=>{const r=flat();const result=drawRouteSection(r,{type:'branch',index:0,side:'left'},5,0,'ramp');assert.deepEqual(result.route.segments[0],r.segments[0]);assert.equal(result.route.segments[1].kind,'ramp');assert.deepEqual(result.route.segments[1].branchFrom,{segment:0,side:'left'});});

test('curved drawing fits the selected section width rather than the wider route default',()=>{
 const r=flat();r.width=7.5;r.segments[0].width=2;
 const result=drawRouteSection(r,{type:'end',index:0},2,2,'curved-landing');
 const section=result.route.segments[result.index];
 assert.equal(section.width,2);
 assert.ok(section.run<4,'a narrow curve should not inflate to the full route width');
 assert.ok(routeLayout(result.route).every(l=>Number.isFinite(l.end[0])));
 assert.equal(r.segments.length,1);
});
