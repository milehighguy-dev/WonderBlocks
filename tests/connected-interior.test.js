import test from 'node:test';import assert from 'node:assert/strict';
import {entranceFixture} from './fixtures/entrance-fixture.js';
import {connectedInteriorDraft,saveConnectedInterior} from '../src/interiors/connected-interior.js';
import {validateProject} from '../src/core/model.js';import {buildPart,disposePart} from '../src/core/geometry.js';
import {Raycaster,Vector3} from '../vendor/three.module.js';import {routeSnapTargets} from '../src/routes/route-snap.js';import {interiorFromShell} from '../src/interiors/interior.js';import {entranceFrame} from '../src/interiors/entrances.js';
function through(){const original=entranceFixture(),host=original.parts[0],context=connectedInteriorDraft(host,host.entrances[0]),plan=context.part.interior;Object.assign(plan.rooms[0],{z:-8.8,d:8.6});plan.doors.push({axis:'x',line:-8.8,offset:0,width:2,height:2.5,kind:'door'});return {original,host:saveConnectedInterior(context,plan)};}
test('entrance landing becomes one elevated editable room, without intermediate floors',()=>{const host=entranceFixture().parts[0],context=connectedInteriorDraft(host,host.entrances[0]);assert.equal(context.part.position[1],10);assert.equal(context.part.interior.rooms.length,1);assert.equal(host.entranceInteriors,undefined,'cancel does not mutate host');const saved=saveConnectedInterior(context,context.part.interior);assert.equal(saved.entrances[0].interiorId,saved.entranceInteriors[0].id);assert.deepEqual(validateProject({format:'open-building-studio',version:1,name:'Room',parts:[saved]}).parts[0],saved);});
test('a door on the opposite shell wall becomes a linked entrance in the same interior',()=>{const {host}=through();assert.equal(host.entrances.length,2);assert.equal(host.entrances[0].interiorId,host.entrances[1].interiorId);const context=connectedInteriorDraft(host,host.entrances[1]);assert.equal(context.part.interior.doors.length,2);const again=saveConnectedInterior(context,context.part.interior);assert.deepEqual(again.entrances.map(e=>e.id),host.entrances.map(e=>e.id),'reopening does not duplicate entrances');const g=buildPart(host);g.updateMatrixWorld(true);for(const [z,sign] of [[5,-1],[-5,1]])assert.equal(new Raycaster(new Vector3(0,11,z),new Vector3(0,0,sign),0,10).intersectObject(g,true).length,0,'passage is open right through');assert.ok(new Raycaster(new Vector3(0,11,0),new Vector3(0,-1,0),0,1.1).intersectObject(g,true).length,'shared floor remains');disposePart(g);});
test('removing an exterior door removes its entrance but keeps its shared room',()=>{const {host}=through(),context=connectedInteriorDraft(host,host.entrances[0]);context.part.interior.doors.pop();const saved=saveConnectedInterior(context,context.part.interior);assert.equal(saved.entrances.length,1);assert.equal(saved.entranceInteriors[0].plan.rooms.length,1);});
test('connected rooms retain their shape outside the host',()=>{const host=entranceFixture().parts[0],context=connectedInteriorDraft(host,host.entrances[0]);context.part.interior.rooms[0].z=-20;context.part.interior.rooms[0].d=19.8;const saved=saveConnectedInterior(context,context.part.interior);assert.equal(saved.entranceInteriors[0].plan.rooms[0].d,19.8);assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Overhang',parts:[saved]}));const root=buildPart(saved,{batch:true});root.updateMatrixWorld(true);const inside=new Vector3(0,11,-10);for(const direction of [new Vector3(1,0,0),new Vector3(-1,0,0),new Vector3(0,-1,0),new Vector3(0,1,0),new Vector3(0,0,-1)])assert.ok(new Raycaster(inside,direction,0,8).intersectObject(root,true).length,'overhang stays enclosed');disposePart(root);});

test("shell conversion preserves the connected room elevation and orientation",()=>{const {host}=through(),before=entranceFrame(host,host.entranceInteriors[0]),converted=interiorFromShell(host),after=entranceFrame(converted,converted.entranceInteriors[0]);assert.deepEqual(after.elements,before.elements);});

test('an overhanging door keeps its entrance ID and can reopen after saving',()=>{const initial=entranceFixture().parts[0],context=connectedInteriorDraft(initial,initial.entrances[0]),id=initial.entrances[0].id;context.part.interior.rooms[0].d+=2;context.part.interior.doors[0].line+=2;const saved=saveConnectedInterior(context,context.part.interior);assert.equal(saved.entrances[0].id,id);assert.ok(entranceFrame(saved,saved.entrances[0]).elements[14]>6);const reopened=connectedInteriorDraft(saved,saved.entrances[0]);assert.equal(saveConnectedInterior(reopened,reopened.part.interior).entrances[0].id,id);});
test('an interior without entrances remains reopenable by its space ID',()=>{const initial=entranceFixture().parts[0],context=connectedInteriorDraft(initial,initial.entrances[0]);context.part.interior.doors=[];const saved=saveConnectedInterior(context,context.part.interior);assert.equal(saved.entrances.length,0);const reopened=connectedInteriorDraft(saved,{interiorId:saved.entranceInteriors[0].id});assert.deepEqual(reopened.part.interior,saved.entranceInteriors[0].plan);});

test('building a second interior does not erase geometry from the first interior',()=>{const initial=entranceFixture().parts[0],context=connectedInteriorDraft(initial,initial.entrances[0]),host=saveConnectedInterior(context,context.part.interior),first=host.entranceInteriors[0];host.entrances=[];const alone=buildPart(host),count=root=>root.children.filter(m=>m.userData.connectedInteriorId===first.id).reduce((n,m)=>n+m.geometry.attributes.position.count,0),before=count(alone);const second=structuredClone(first);second.id='second-space';second.anchor[0]+=.2;second.plan.doors=[];host.entranceInteriors.push(second);const together=buildPart(host);assert.equal(count(together),before,'each room keeps its own lining independent of build order');disposePart(alone);disposePart(together);});
test('upper-level doors retain stable entrance IDs independently of the base door',()=>{const initial=entranceFixture().parts[0],context=connectedInteriorDraft(initial,initial.entrances[0]),plan=context.part.interior;plan.height=3.2;const upper=structuredClone(plan);delete upper.doors[0].entranceId;plan.storeys=[{id:'upper',name:'Upper',elevation:4,plan:upper}];const saved=saveConnectedInterior(context,plan);assert.equal(saved.entrances.length,2);const elevations=saved.entrances.map(e=>entranceFrame(saved,e).elements[13]).sort((a,b)=>a-b);assert.ok(Math.abs(elevations[0]-10)<1e-8&&Math.abs(elevations[1]-14)<1e-8);const again=saveConnectedInterior(connectedInteriorDraft(saved,saved.entrances[0]),saved.entranceInteriors[0].plan);assert.deepEqual(again.entrances.map(e=>e.id),saved.entrances.map(e=>e.id));const root=buildPart(again);root.updateMatrixWorld(true);assert.ok(new Raycaster(new Vector3(0,14.5,4.4),new Vector3(0,-1,0),0,.501).intersectObject(root,true).length,'upper threshold floor stays supported');disposePart(root);});
import {setRoomOutline,curveRoomFaces} from '../src/interiors/room-outline.js';

test('angled entrance interiors save and cut the host along their actual concave outline',()=>{
 const initial=entranceFixture().parts[0],context=connectedInteriorDraft(initial,initial.entrances[0]);
 const room=context.part.interior.rooms[0];
 const plan=setRoomOutline(context.part.interior,room.id,[{x:-3,z:-7},{x:2,z:-7},{x:2,z:-4},{x:6,z:-4},{x:6,z:-.2},{x:-3,z:-.2}]);
 const saved=saveConnectedInterior(context,plan);
 assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Angled entry',parts:[saved]}));
 const model=buildPart(saved);model.updateMatrixWorld(true);
 const hull=model.children.filter(m=>m.isMesh&&!m.userData.connectedInteriorId);
 const ray=z=>new Raycaster(new Vector3(7,11,4.5+z),new Vector3(-1,0,0),0,3).intersectObjects(hull,true);
 assert.ok(ray(-5).length,'the hull in the concave notch must remain solid');
 assert.equal(ray(-2).length,0,'the extended arm cuts through the hull side');
 disposePart(model);
});

test('curved entrance interiors can save and reopen with their curve controls intact',()=>{
 const initial=entranceFixture().parts[0],context=connectedInteriorDraft(initial,initial.entrances[0]);
 context.part.interior.doors=[];
 const room=context.part.interior.rooms[0],plan=curveRoomFaces(context.part.interior,room.id,[0,1,2,3]);
 const saved=saveConnectedInterior(context,plan),space=saved.entranceInteriors[0];
 assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Curved entry',parts:[saved]}));
 const reopened=connectedInteriorDraft(saved,{interiorId:space.id});
 assert.deepEqual(reopened.part.interior.rooms[0].curve,plan.rooms[0].curve);
 const model=buildPart(saved);model.traverse(m=>{if(m.geometry)for(const v of m.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});disposePart(model);
});
