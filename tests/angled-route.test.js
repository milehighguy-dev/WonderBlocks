import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRoute,routeLayout,validateRoute} from '../src/routes/stair-route.js';
import {drawRouteSection,snapDirection} from '../src/routes/route-drawing.js';
import {continueSelectedAngle,resizeRouteWidth} from '../src/routes/route-actions.js';
import {angledLanding,angledFootprint} from '../src/routes/angled-landing.js';
import {buildPart} from '../src/core/geometry.js';
import {makePart,validateProject} from '../src/core/model.js';
import {defaultHallway} from '../src/routes/hallway.js';
import {landingRailEdges} from '../src/routes/railings.js';
test('free drag turns retain requested headings and flat connections between straight flights',()=>{for(const degrees of [15,30,45,67,-37,-120,150]){
 const r=defaultRoute({width:1.5}),angle=degrees*Math.PI/180,result=drawRouteSection(r,{type:'end',index:0},12*Math.sin(angle),12*Math.cos(angle),'stairs',false),layout=routeLayout(result.route),corner=layout[1],flight=layout[2];
 assert.equal(result.route.segments.length,3);assert.ok(Math.abs(flight.heading-angle)<1e-8);assert.equal(corner.segment.kind,'landing');assert.equal(corner.segment.rise,0);assert.deepEqual(corner.end,flight.start);assert.equal(flight.segment.turn,'straight');assert.equal(flight.segment.turnAngle,undefined);assert.ok(Math.abs(flight.segment.steps*flight.segment.treadDepth-flight.segment.run)<1e-8);
 const shape=angledLanding(corner),localEnd=shape.end;assert.ok(Math.abs(localEnd[0]-corner.end[0])<1e-8);assert.ok(landingRailEdges(result.route,corner,1).every(e=>e.a!==shape.points[0]));validateRoute(result.route);
}});
test('direction snap uses 45 degree increments including right angles; Alt retains precision',()=>{const a=46*Math.PI/180;assert.ok(Math.abs(snapDirection(a)-Math.PI/4)<1e-8);assert.equal(snapDirection(a,false),a);assert.equal(snapDirection(38*Math.PI/180),Math.PI/4);for(const degrees of [-178,-136,-91,-48,-5,5,38,88,132,178]){const angle=degrees*Math.PI/180;assert.ok(Math.abs(snapDirection(angle)/(Math.PI/4)-Math.round(angle/(Math.PI/4)))<1e-8);assert.equal(snapDirection(angle,false),angle);}});
test('angled floors, walls, ceilings and measured walkway geometry stay finite and serialize',()=>{for(const style of ['posts','solid','hallway','walkway'])for(const angle of [Math.PI/4,-.65,2.1]){
 const r=defaultRoute({width:1.5});r.width=2.5;if(style==='hallway')r.segments[0].hallway=defaultHallway();else r.segments[0].railing={style};const next=continueSelectedAngle(r,0,angle,'stairs').route,part=makePart('stair-route',{route:next}),mesh=buildPart(part);
 for(const child of mesh.children){const attr=child.geometry?.attributes.position;if(attr)for(const value of attr.array)assert.ok(Number.isFinite(value));}
 assert.ok(mesh.children.some(m=>m.userData.routeSegment===1));validateProject({format:'open-building-studio',version:1,name:'Angled',parts:[part]});
 const widened=resizeRouteWidth(next,3);validateRoute(widened);
 const l=routeLayout(next)[1],outline=angledLanding(l),floor=angledFootprint(l,.2);assert.equal(floor.length,outline.points.length);
}});
