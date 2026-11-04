import test from 'node:test';import assert from 'node:assert/strict';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {makeEntrance,entranceFits,entrancePort} from '../src/interiors/entrances.js';
import {entranceFixture} from './fixtures/entrance-fixture.js';
import {resolveRouteLinks} from '../src/routes/route-links.js';
import {routeSnapTargets} from '../src/routes/route-snap.js';
import {Vector3,Raycaster} from '../vendor/three.module.js';
test('elevated entrance cuts a real opening and creates only a local landing',()=>{
 const project=entranceFixture(),p=project.parts[0];assert.deepEqual(validateProject(project),project);const g=buildPart(p);g.updateMatrixWorld(true);
 const hit=(o,d,far)=>new Raycaster(new Vector3(...o),new Vector3(...d),0,far).intersectObject(g,true);
 assert.equal(hit([0,11,5],[0,0,-1],1).length,0,'threshold is open');assert.ok(hit([2,11,5],[0,0,-1],1).length,'outside wall remains');
 assert.ok(hit([0,11,2],[0,-1,0],1.01).length,'landing is at 10 m');assert.equal(hit([4,11,2],[0,-1,0],2).length,0,'no whole floor');disposePart(g);
});
test('entrance links preserve independent dimensions and follow host movement',()=>{const project=entranceFixture(),host=project.parts[0],route=project.parts[1],oldWidth=host.entrances[0].width;assert.notEqual(oldWidth,route.route.width);host.position[1]=1;const result=resolveRouteLinks(project.parts);assert.equal(result[1].route.segments[0].rise,4);assert.equal(host.entrances[0].width,oldWidth);assert.ok(routeSnapTargets(project.parts,route,'end').some(t=>t.ref.entranceId));});
test('entrance geometry and metadata survive undo and saving',()=>{const p=entranceFixture(),h=new History(p);p.parts[0].entrances[0].width=3;h.push(p);assert.equal(h.undo().parts[0].entrances[0].width,2.4);assert.equal(validateProject(h.redo()).parts[0].entrances[0].width,3);});
test('entrances reject landings outside the shell',()=>{const p=entranceFixture().parts[0],e=p.entrances[0];assert.ok(entranceFits(p,e));e.depth=20;assert.equal(entranceFits(p,e),false);assert.throws(()=>validateProject({format:'open-building-studio',version:1,name:'bad',parts:[p]}));});
test('rotated scaled hosts preserve world-sized openings',()=>{const p=makePart('block',{scale:[8,16,10],rotation:[0,Math.PI/2,0]});p.entrances=[makeEntrance(p,new Vector3(5,8,0),new Vector3(1,0,0))];assert.ok(entranceFits(p,p.entrances[0]));const g=buildPart(p);g.updateMatrixWorld(true);assert.equal(new Raycaster(new Vector3(6,9,0),new Vector3(-1,0,0),0,2).intersectObject(g,true).length,0);disposePart(g);});

test('an entrance connects through an existing interior outer shell',async()=>{const {interiorFromShell}=await import('../src/interiors/interior.js');const p=interiorFromShell(makePart('block',{scale:[10,10,8]}));p.entrances=[makeEntrance(p,new Vector3(0,0,4),new Vector3(0,0,1),1.5)];const g=buildPart(p);g.updateMatrixWorld(true);assert.equal(new Raycaster(new Vector3(0,1,4.2),new Vector3(0,0,-1),0,1.2).intersectObject(g,true).length,0);disposePart(g);});
test('converting a shell to an interior preserves its elevated entrance location',async()=>{const {interiorFromShell}=await import('../src/interiors/interior.js');const p=entranceFixture().parts[0],point=entrancePort(p,p.entrances[0]).point,next=interiorFromShell(p);assert.ok(entrancePort(next,next.entrances[0]).point.distanceTo(point)<1e-6);});

test('entrance lining meets the aperture without overlapping the facade',()=>{
 for(const width of [2.4,6])for(const angle of [0,Math.PI/2]){
  const p=entranceFixture().parts[0];p.rotation[1]=angle;p.entrances[0].width=width;
  const g=buildPart(p),lining=g.children.find(m=>m.userData.entranceId),a=lining.geometry.attributes.position;
  for(let i=0;i<a.count;i+=3){const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(a,i+j));
   assert.ok(!v.every(q=>Math.abs(q.z-.5)<1e-6),'no lining face lies on the exterior facade');
   const center=v.reduce((sum,q)=>sum.add(q),new Vector3()).divideScalar(3);
   if(center.z>.5-.35/9+1e-6)assert.ok(Math.abs(center.x)<=width/20+1e-6,'the throat remains within the opening width');
  }
  g.updateMatrixWorld(true);const point=new Vector3(0,11,4).applyAxisAngle(new Vector3(0,1,0),angle),direction=new Vector3(0,0,-1).applyAxisAngle(new Vector3(0,1,0),angle);
  assert.ok(new Raycaster(point,direction,0,6).intersectObject(lining).length,'back wall faces into the room');disposePart(g);
 }
});
