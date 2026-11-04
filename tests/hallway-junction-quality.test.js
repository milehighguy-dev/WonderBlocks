import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {defaultHallway} from '../src/routes/hallway.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {junctionHoles,landingBounds} from '../src/routes/route-junctions.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
import {hallwayRibFits} from '../src/routes/railings.js';
import {Raycaster,Vector3} from '../vendor/three.module.js';
const segment=(run,width)=>({kind:'landing',run,rise:0,steps:1,turn:'straight',...(width?{width}:{}),hallway:{...defaultHallway(),style:'death-star-prison',height:4}});
const route=()=>({width:4,thickness:.18,gap:.15,segments:[segment(14),{...segment(5,2),branchFrom:{segment:0,side:'left'}},segment(5,3)]});
test('enclosed branch crown leaves full-height opening clear, including resized branches',()=>{
 for(const width of [3,4]){const r=route();r.segments[2].width=width;const l=routeLayout(r);assert.deepEqual(junctionHoles(r,0,'left'),[[7-width/2,7+width/2]]);assert.equal(hallwayRibFits(r,l[0],0,7,.3),false);
 const g=buildPart(makePart('stair-route',{route:r}));g.updateMatrixWorld(true);
 // Above normal player height: the old crown rib crossed this branch opening.
 const hits=new Raycaster(new Vector3(0,3.8,7),new Vector3(1,0,0),0,3).intersectObject(g,true);assert.equal(hits.length,0,'crown does not block junction');
 for(const x of [1.8,2,2.2])assert.ok(new Raycaster(new Vector3(x,.05,7),new Vector3(0,-1,0),0,.1).intersectObject(g,true).length,'floor meets through wall opening');disposePart(g);
 }
});
test('separate connected routes use actual landing width and update opening on resize',()=>{
 const host=makePart('stair-route',{route:{width:4,thickness:.18,gap:.15,segments:[segment(14)]}}),branch=makePart('stair-route',{route:{width:2,thickness:.18,gap:.15,segments:[segment(5),segment(5,3)],links:{start:{partId:host.id,segment:0,side:'left'}}}});
 for(const width of [3,4]){branch.route.segments[1].width=width;const resolved=resolveRouteLinks([host,branch]);assert.equal(resolved[0].route.externalOpenings[0].width,width);assert.equal(routeLayout(resolved[1].route)[0].width,width);}
 assert.equal(host.route.externalOpenings,undefined);
});
test('independent path origins do not inflate neighboring junction landings',()=>{
 const r=route();r.segments[1]={...segment(5,8),pathStart:{point:[30,0,0],heading:0}};assert.equal(landingBounds(r,0).width,4);assert.equal(landingBounds(r,1).width,8);
});
