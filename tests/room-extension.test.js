import test from 'node:test';import assert from 'node:assert/strict';import {defaultInterior} from '../src/interiors/interior.js';import {extendRoomPreview} from '../src/interiors/room-extension.js';
test('rectangular extensions reuse keyed doorways and preserve their identity',()=>{const p=defaultInterior();p.doors=[{id:'existing',wall:'z:6:0:5',offset:2.5,width:1.2,height:2.2}];const result=extendRoomPreview(p,'room-1','right',3);assert.equal(result.plan.doors.length,1);assert.equal(result.plan.doors[0].id,'existing');assert.equal(p.rooms.length,1);});
test('drag extensions create a room and doorway without modifying the original',()=>{for(const side of ['left','right','front','back']){const p=defaultInterior(),before=structuredClone(p),result=extendRoomPreview(p,p.rooms[0].id,side,3.13);assert.equal(result.plan.rooms.length,2);assert.equal(result.plan.doors.length,1);assert.equal(result.run,3.25);assert.deepEqual(p,before);assert.equal(result.room.ceilingHeight,p.height);}});
test('hallway extensions fit their starting wall and snap to a destination room with two doors',()=>{const p=defaultInterior();p.rooms.push({id:'target',x:10,z:0,w:6,d:5});const result=extendRoomPreview(p,p.rooms[0].id,'right',3.8,{kind:'hallway'});assert.equal(result.run,4);assert.equal(result.joined,'target');assert.equal(result.room.d,3.75);assert.equal(result.plan.doors.length,2);assert.equal(extendRoomPreview(p,p.rooms[0].id,'right',3.8,{snap:false}).run,3.8);});
test('invalid overlaps are rejected and directly adjoining rooms gain just a doorway',()=>{const p=defaultInterior();p.rooms.push({id:'target',x:6,z:0,w:6,d:5});const result=extendRoomPreview(p,p.rooms[0].id,'right',.1);assert.equal(result.plan.rooms.length,2);assert.equal(result.plan.doors.length,1);assert.equal(result.joined,'target');assert.throws(()=>extendRoomPreview(p,p.rooms[0].id,'right',3,{snap:false}),/overlap/);assert.throws(()=>extendRoomPreview(defaultInterior(),'room-1','back',1),/2 metres/);});

test('rectangular and angled hallway extensions share a default width and fit narrow walls',async()=>{
 const {extendRoomEdge}=await import('../src/interiors/room-outline.js');
 for(const width of [5,12]){
  const plan=defaultInterior();plan.rooms[0].w=width;
  const rectangular=extendRoomPreview(plan,'room-1','front',3,{kind:'hallway'});
  const polygon=extendRoomEdge(plan,'room-1',0,3,'hall',{kind:'hallway'});
  assert.equal(rectangular.room.w,Math.min(width,3.75));
  const points=polygon.room.points;
  assert.ok(Math.abs(Math.hypot(points[1].x-points[0].x,points[1].z-points[0].z)-Math.min(width,3.75))<1e-6);
 }
});
