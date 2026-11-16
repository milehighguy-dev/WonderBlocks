import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRoute,routeLayout,validateRoute} from '../src/routes/stair-route.js';
import {removeRouteSegment} from '../src/routes/route-actions.js';
import {routeEditEndpoints} from '../src/routes/route-handles.js';
import {dragRouteStart} from '../src/routes/route-drawing.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const point=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
function fixture(kind='stairs',curveAngle=1.1){
 const r=defaultRoute({width:2}),base=r.segments[0];
 r.segments=[{...base,kind:'landing',run:5,rise:0},{...base,kind:'landing',run:4,rise:0},{...base,kind,run:8,rise:kind==='landing'?0:3,steps:24,treadDepth:1/3,...(curveAngle!=null?{curveAngle}:{})},{...base,kind:'landing',run:5,rise:0}];
 return removeRouteSegment(r,1);
}
test('deleting a middle section exposes an editable start on the surviving section',()=>{
 const route=fixture(),layout=routeLayout(route),handles=routeEditEndpoints(route,1);
 assert.deepEqual(handles.map(h=>h.end),['end','start']);assert.deepEqual(handles[1].point,layout[1].start);
 assert.deepEqual(routeEditEndpoints(route,0).map(h=>h.end),['end']);assert.deepEqual(routeEditEndpoints(route,2).map(h=>h.end),['end']);
 route.attachments=[{index:1,end:'start',ref:{partId:'host'}}];assert.deepEqual(routeEditEndpoints(route,1).map(h=>h.end),['end'],'connected starts are not offered as free ends');
});
test('reshaping a cut curved start preserves its far endpoint, tangent and every other section',()=>{
 for(const kind of ['stairs','ramp','landing'])for(const bend of [1.1,-1.1,0]){
  const route=fixture(kind,bend),source=structuredClone(route),before=routeLayout(route),values=dragRouteStart(route,1,[1,0,-1],{snap:false,lockAngle:false}),next=structuredClone(route);
  const {endpoint,...dimensions}=values;assert.equal(endpoint,'start');Object.assign(next.segments[1],dimensions);validateRoute(next);const after=routeLayout(next);
  assert.ok(Math.hypot(...after[1].start.map((v,i)=>v-before[1].start[i]))>.1);point(after[1].end,before[1].end);near(Math.sin(after[1].endHeading-before[1].endHeading),0);
  assert.deepEqual(after[0],before[0]);point(after[2].start,before[2].start);point(after[2].end,before[2].end);assert.deepEqual(next.segments[2],route.segments[2]);assert.deepEqual(route,source);
  near(next.segments[1].rise,source.segments[1].rise);if(kind==='stairs')near(values.run,values.steps*values.treadDepth);
 }
});
test('straight and height-only start drags keep the surviving path fixed and remain stable on reload',()=>{
 for(const bend of [null,1.1]){
  const route=fixture('stairs',bend),before=routeLayout(route),heading=before[1].heading+(bend??0)/2;
  const values=dragRouteStart(route,1,[-Math.sin(heading),.7,-Math.cos(heading)],{reshapeCurve:false,lockAngle:false}),next=structuredClone(route);
  const {endpoint,...dimensions}=values;Object.assign(next.segments[1],dimensions);const after=routeLayout(next);
  point(after[1].end,before[1].end);point(after[2].end,before[2].end);near(next.segments[1].rise,2.3);assert.equal(next.segments[1].curveAngle,bend??undefined);assert.doesNotThrow(()=>routeLayout(JSON.parse(JSON.stringify(next))));
  assert.deepEqual(dragRouteStart(route,1,[0,0,-1]),dragRouteStart(route,1,[0,0,-1]),'pointer frames always use the gesture snapshot');
 }
});
