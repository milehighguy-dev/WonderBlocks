import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultInterior,validateInterior} from '../src/interiors/interior.js';
import {addWorkflowFloor,editWorkflowFloor,createFloorSelection,removeWorkflowFloor} from '../src/interiors/floor-workflow.js';
import {editMaterial,readMaterial,materialTargets} from '../src/editor/material-editing.js';
import {makePart} from '../src/core/model.js';
import {polygonRoom,shellInner} from '../src/interiors/polygon-plan.js';

test('new open floors and copied layouts grow the shell, leaving their source unchanged',()=>{
 const source=defaultInterior();source.shell={width:8,depth:8,height:4.4,inset:.2};source.rooms=[{id:'base',x:-3,z:-3,w:6,d:6}];source.partitions=[{id:'divider',roomId:'base',a:{x:0,z:-3},b:{x:0,z:0}}];source.doors=[{id:'door',axis:'x',line:-3,offset:0,width:2,height:3,kind:'door',entranceId:'entry'}];
 const copy=addWorkflowFloor(source,'ground',true);assert.equal(copy.plan.storeys[0].plan.partitions.length,1);assert.equal(copy.plan.storeys[0].plan.doors.length,1);assert.equal(copy.plan.storeys[0].plan.doors[0].entranceId,undefined);assert.ok(copy.plan.shell.height>source.shell.height);assert.equal(source.storeys,undefined);assert.equal(source.doors[0].entranceId,'entry');
 const blank=addWorkflowFloor(source);assert.equal(blank.plan.storeys[0].plan.partitions.length,0);assert.equal(blank.plan.storeys[0].plan.doors.length,0);assert.equal(blank.plan.storeys[0].plan.rooms.length,1);validateInterior(blank.plan);
});
test('floor settings reject overlaps atomically and apply height to each room',()=>{
 const first=addWorkflowFloor(defaultInterior()),id=first.levelId;
 assert.throws(()=>editWorkflowFloor(first.plan,id,{elevation:2}),/below the next floor/);assert.equal(first.plan.storeys[0].elevation,4.2);
 const next=editWorkflowFloor(first.plan,id,{elevation:5,height:5.4});assert.equal(next.storeys[0].elevation,5);assert.equal(next.storeys[0].plan.height,5.4);assert.equal(first.plan.storeys[0].plan.height,4);
 assert.throws(()=>editWorkflowFloor(next,'ground',{elevation:1}),/Move the building/);
});
test('floor selection survives modes, remembers buildings and recovers after undo removes a floor',()=>{
 const memory=createFloorSelection(),first=addWorkflowFloor(defaultInterior());memory.set('building','interior',{levelId:first.levelId,peek:true});assert.equal(memory.read('building','interior',first.plan).levelId,first.levelId);assert.equal(memory.read('another','interior',first.plan).levelId,'ground');assert.equal(memory.read('building','interior',defaultInterior()).levelId,'ground');
});
test('open floor retains the outline of a concave standalone room',()=>{
 const plan=defaultInterior();const shell={height:4.4,inset:.2,points:[{x:0,z:0},{x:8,z:0},{x:8,z:4},{x:4,z:4},{x:4,z:8},{x:0,z:8}]};plan.rooms=[polygonRoom('base',shell.points)];const next=addWorkflowFloor(plan);assert.ok(next.plan.storeys[0].plan.rooms[0].points);validateInterior(next.plan);
});
test('roof scope paints its own finish without repainting floor or walls',()=>{
 const part=makePart('interior'),before=structuredClone(part.interior.finishes);assert.deepEqual(materialTargets(part,{levelId:'roof'}),[['roof','Roof / top surface']]);editMaterial(part,'roof',{color:'#123456',preset:'metal',scale:2},{levelId:'roof'});assert.equal(readMaterial(part,'roof',{levelId:'roof'}).color,'#123456');assert.deepEqual(part.interior.finishes.wall,before.wall);assert.deepEqual(part.interior.finishes.floor,before.floor);
});

test('removing a floor removes only its stair connections and leaves the source intact',()=>{const added=addWorkflowFloor(defaultInterior());added.plan.stairs=[{id:'incoming',from:'ground',to:added.levelId}];const next=removeWorkflowFloor(added.plan,added.levelId);assert.equal(next.storeys.length,0);assert.equal(next.stairs.length,0);assert.equal(added.plan.storeys.length,1);assert.equal(added.plan.stairs.length,1);assert.throws(()=>removeWorkflowFloor(added.plan,'ground'),/cannot be removed/);});
