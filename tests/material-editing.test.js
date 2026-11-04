import test from 'node:test';import assert from 'node:assert/strict';
import {editMaterial,readMaterial,materialTargets} from '../src/editor/material-editing.js';
import {makePart,validateProject,History} from '../src/core/model.js';import {defaultInterior} from '../src/interiors/interior.js';import {addStorey} from '../src/interiors/interior-storeys.js';import {defaultRailing} from '../src/routes/railings.js';import {buildPart,disposePart} from '../src/core/geometry.js';import {routeMeshPart} from '../src/routes/route-finishes.js';
import {Raycaster,Vector3} from '../vendor/three.module.js';
import {interiorFromShell} from '../src/interiors/interior.js';

test('raising one ceiling exposes outside finish above its shorter neighbor without moving lower wall UVs',()=>{
 for(const polygon of [false,true]){
  const plan=defaultInterior();plan.height=3;plan.rooms.push({id:'tall',x:6,z:0,w:4,d:5,ceilingHeight:6});
  if(polygon)for(const room of plan.rooms)room.points=[{x:room.x,z:room.z},{x:room.x+room.w,z:room.z},{x:room.x+room.w,z:room.z+room.d},{x:room.x,z:room.z+room.d}];
  plan.finishes.wall={color:'#00ff00',preset:'stone',scale:1};plan.finishes.outside={color:'#ff0000',preset:'brick',scale:1};
  const p=makePart('interior',{interior:plan}),g=buildPart(p,{batch:true});g.updateMatrixWorld(true);
  const hit=(root,x,y,dx)=>new Raycaster(new Vector3(x,y,2),new Vector3(dx,0,0)).intersectObject(root,true)[0];
  const lower=hit(g,3,1,1);assert.equal(lower.object.material.color.getHexString(),'00ff00');assert.equal(hit(g,3,4,1).object.material.color.getHexString(),'ff0000');assert.equal(hit(g,8,4,-1).object.material.color.getHexString(),'00ff00');
  const before=structuredClone(p);before.interior.rooms[1].ceilingHeight=3;const old=buildPart(before,{batch:true});old.updateMatrixWorld(true);const oldUV=hit(old,3,1,1).uv;assert.ok(oldUV.distanceTo(lower.uv)<1e-6);disposePart(old);disposePart(g);
 }
});

test('shell walls and roofs paint independently and ceiling edits cannot recolor the roof',()=>{
 for(const type of ['block','round']){
  const p=interiorFromShell(makePart(type,{scale:[8,8,8]})),originalRoof=readMaterial(p,'roof');editMaterial(p,'outside',{color:'#ff0000'});assert.deepEqual(readMaterial(p,'roof'),originalRoof);editMaterial(p,'roof',{color:'#0000ff'});
  const g=buildPart(p);g.updateMatrixWorld(true);const hit=(origin,direction)=>new Raycaster(new Vector3(...origin),new Vector3(...direction)).intersectObject(g,true)[0];assert.equal(hit([0,20,0],[0,-1,0]).object.material.color.getHexString(),'0000ff');assert.equal(hit([0,1,-10],[0,0,1]).object.material.color.getHexString(),'ff0000');disposePart(g);
 }
 const p=makePart('interior'),roof=readMaterial(p,'roof');editMaterial(p,'ceiling',{color:'#123456'});assert.deepEqual(readMaterial(p,'roof'),roof);
});

test('exterior wall and roof painting reaches the correct visible faces for rectangular and polygon rooms',()=>{
 for(const polygon of [false,true])for(const stacked of [false,true]){
  let plan=defaultInterior();if(polygon)plan.rooms[0].points=[{x:0,z:0},{x:6,z:0},{x:6,z:5},{x:0,z:5}];if(stacked)plan=addStorey(plan);
  const p=makePart('interior',{interior:plan});editMaterial(p,'outside',{color:'#ff0000',preset:'brick'});editMaterial(p,'roof',{color:'#0000ff',preset:'metal'});editMaterial(p,'ceiling',{color:'#00ff00',preset:'plain'});
  const g=buildPart(p,{batch:true});g.updateMatrixWorld(true);const color=(origin,direction)=>{const hit=new Raycaster(new Vector3(...origin),new Vector3(...direction)).intersectObject(g,true)[0];assert.ok(hit);return hit.object.material.color.getHexString();};
  assert.equal(color([3,1,-2],[0,0,1]),'ff0000');assert.equal(color([3,1,2],[0,0,-1]),plan.finishes.wall.color.slice(1));assert.equal(color([3,20,2],[0,-1,0]),'0000ff');assert.equal(color([3,1,2],[0,1,0]),'00ff00');
  const roofMeshes=[];g.traverse(m=>{if(m.isMesh&&m.material.color.getHexString()==='0000ff')roofMeshes.push(m);});assert.ok(roofMeshes.length);assert.ok(roofMeshes.every(m=>m.material.map));disposePart(g);
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Independent finishes',parts:[p]}))).parts[0],p);
 }
});

test('explicit roof finishes can be edited per floor without tinting ceilings',()=>{
 const p=makePart('interior',{interior:addStorey(defaultInterior())}),upper=p.interior.storeys[0],groundRoof=structuredClone(p.interior.finishes.roof);assert.equal(readMaterial(p,'roof').color,groundRoof.color);
 editMaterial(p,'roof',{color:'#123456'},{levelId:upper.id});assert.deepEqual(p.interior.finishes.roof,groundRoof);assert.equal(upper.plan.finishes.roof.color,'#123456');assert.notEqual(upper.plan.finishes.ceiling.color,'#123456');
 upper.plan.finishes.roof.scale=0;assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Bad roof',parts:[p]}),/finish/);
});
test('material edits preserve geometry and existing texture when changing color, and undo cleanly',()=>{const p=makePart('block'),project={format:'open-building-studio',version:1,name:'Materials',parts:[p]},history=new History();history.push(project);const position=[...p.position];editMaterial(p,'all',{preset:'stone',scale:.5});editMaterial(p,'all',{color:'#ffffff'});assert.deepEqual(readMaterial(p),{color:'#ffffff',preset:'stone',scale:.5});assert.deepEqual(p.position,position);history.push(project);assert.equal(history.undo().parts[0].surface,undefined);assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);});
test('interior material targets update ground and upper levels without touching other finishes',()=>{const p=makePart('interior',{interior:addStorey(defaultInterior())}),outside=structuredClone(p.interior.finishes.outside);editMaterial(p,'wall',{color:'#ffffff',preset:'brick',scale:.8});for(const plan of [p.interior,p.interior.storeys[0].plan])assert.deepEqual(plan.finishes.wall,{color:'#ffffff',preset:'brick',scale:.8});assert.deepEqual(p.interior.finishes.outside,outside);editMaterial(p,'all',{color:'#ffffff'});assert.equal(p.interior.finishes.floor.color,'#ffffff');});
test('route material targets apply per component across sections, render and survive saving',()=>{const p=makePart('stair-route');p.route.segments[0].railing={...defaultRailing(),style:'bespin'};p.route.segments.push({...structuredClone(p.route.segments[0]),railing:{...defaultRailing(),style:'bespin-arches'}});assert.ok(materialTargets(p).some(([k])=>k==='arches'));const segments=structuredClone(p.route.segments);editMaterial(p,'rails',{color:'#ffffff',preset:'stone',scale:.5});for(const s of p.route.segments){assert.deepEqual(s.componentFinishes.rails,{color:'#ffffff',surface:{preset:'stone',scale:.5}});assert.equal(s.run,segments[0].run);assert.equal(s.componentFinishes.deck,undefined);}const g=buildPart(p);for(const m of g.children.filter(m=>routeMeshPart(m)==='rails')){assert.equal(m.material.color.getHexString(),'ffffff');assert.ok(m.material.map);}disposePart(g);assert.deepEqual(validateProject({format:'open-building-studio',version:1,name:'Paint',parts:[p]}).parts[0],p);assert.deepEqual(materialTargets(makePart('character-reference')),[]);});

test('material floor scope edits only the chosen storey or connected entrance interior',()=>{const p=makePart('interior',{interior:addStorey(defaultInterior())}),id=p.interior.storeys[0].id,ground=structuredClone(p.interior.finishes);editMaterial(p,'wall',{color:'#ffffff'},{spaceId:'interior',levelId:id});assert.deepEqual(p.interior.finishes,ground);assert.equal(readMaterial(p,'wall',{levelId:id}).color,'#ffffff');const hull=makePart('block');hull.entranceInteriors=[{id:'entry',plan:addStorey(defaultInterior())}];const upper=hull.entranceInteriors[0].plan.storeys[0];editMaterial(hull,'floor',{preset:'stone'},{spaceId:'entry',levelId:upper.id});assert.equal(upper.plan.finishes.floor.preset,'stone');assert.equal(hull.entranceInteriors[0].plan.finishes.floor.preset,'tile');const color=hull.color;editMaterial(hull,'all',{color:'#ffffff'},{spaceId:'hull'});assert.equal(hull.color,'#ffffff');assert.notEqual(color,hull.color);});

test('interiors require an explicitly authored roof finish',()=>{const p=makePart('interior');assert.ok(p.interior.finishes.roof);delete p.interior.finishes.roof;assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'Missing roof',parts:[p]}),/Invalid interior finish/);});
