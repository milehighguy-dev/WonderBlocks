import test from 'node:test';
import assert from 'node:assert/strict';
import {storeysFixture} from './fixtures/storeys-fixture.js';
import {makePart,validateProject} from '../src/core/model.js';
import {validateInterior} from '../src/interiors/interior.js';
import {stairConnection,addStorey} from '../src/interiors/interior-storeys.js';
import {editFloorOpening,dragFloorOpening} from '../src/interiors/interior-floor-openings.js';
import {interiorRouteSeed,interiorRouteStair} from '../src/interiors/interior-route.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {Vector3,Raycaster} from '../vendor/three.module.js';

test('floor opening edits cut actual slabs, preserve stairs and survive project roundtrip',()=>{
 const project=storeysFixture(),part=project.parts[0],base=structuredClone(part.interior),id=base.stairs[0].id;
 part.interior=editFloorOpening(base,id,{width:3});
 assert.equal(base.stairs[0].opening,undefined);
 const {opening,...stair}=part.interior.stairs[0];assert.deepEqual(stair,base.stairs[0]);
 const mesh=buildPart(part);mesh.updateMatrixWorld(true);
 const floors=mesh.children.filter(m=>m.userData.interiorFloor&&m.userData.interiorStorey===base.storeys[0].id),y=base.slab+base.storeys[0].elevation;
 const floorAt=x=>new Raycaster(new Vector3(x,y+.1,0),new Vector3(0,-1,0),0,.3).intersectObjects(floors,true);
 assert.equal(floorAt(1.2).length,0,'newly widened strip must really be open');
 assert.ok(floorAt(1.7).length,'outside the new opening retains its floor');
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);disposePart(mesh);
 assert.deepEqual(editFloorOpening(part.interior,id,null),base,'reset restores the exact automatic plan');
});
test('floor opening edges anchor opposite sides, move without changing size, and reject invalid changes atomically',()=>{
 const base=storeysFixture().parts[0].interior,id=base.stairs[0].id,h=stairConnection(base,base.stairs[0]).hole;
 const next=dragFloorOpening(base,id,'right',{x:.62,z:0},{snap:false}),n=stairConnection(next,next.stairs[0]).hole;
 assert.ok(Math.abs(n.x-h.x)<1e-9);assert.ok(Math.abs(n.w-h.w-.62)<1e-9);
 const moved=dragFloorOpening(next,id,'move',{x:.51,z:.24}),m=stairConnection(moved,moved.stairs[0]).hole;
 assert.ok(Math.abs(m.x-n.x-.5)<1e-9);assert.equal(m.z,n.z+.25);assert.equal(m.w,n.w);assert.equal(m.d,n.d);
 for(const values of [{width:NaN},{depth:0},{offsetX:Infinity},{width:100},{offsetZ:30}])assert.throws(()=>editFloorOpening(base,id,values));
 assert.equal(base.stairs[0].opening,undefined);
 const movedStair=structuredClone(moved);movedStair.stairs[0].x+=.5;validateInterior(movedStair);
 assert.ok(Math.abs(stairConnection(movedStair,movedStair.stairs[0]).hole.x-m.x-.5)<1e-9);
});
test('custom openings survive route edits; reset recovers curved automatic cutouts',()=>{
 const part=makePart('interior');part.interior.height=3;part.interior.rooms[0].w=part.interior.rooms[0].d=12;part.interior=addStorey(part.interior);
 const route=interiorRouteSeed(part,'ground',{x:3,z:2});route.route.segments[0]={kind:'stairs',run:5,rise:3.2,steps:16,turn:'straight',curveAngle:.3};
 part.interior.stairs=[interiorRouteStair(part,'ground',route,'test-stairs')];
 const automatic=stairConnection(part.interior,part.interior.stairs[0]);assert.ok(automatic.cutouts.length>1);
 part.interior=editFloorOpening(part.interior,'test-stairs',{width:3});
 assert.equal(stairConnection(part.interior,part.interior.stairs[0]).cutouts.length,1);
 const updated=interiorRouteStair(part,'ground',route,'test-stairs');assert.deepEqual(updated.opening,part.interior.stairs[0].opening);
 part.interior.stairs=[updated];part.interior=editFloorOpening(part.interior,'test-stairs',null);
 assert.deepEqual(stairConnection(part.interior,part.interior.stairs[0]).cutouts,automatic.cutouts);
});
