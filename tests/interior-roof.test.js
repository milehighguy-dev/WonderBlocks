import test from 'node:test';import assert from 'node:assert/strict';import {roofAccessFixture} from './fixtures/roof-access-fixture.js';import {validateProject,makePart} from '../src/core/model.js';import {validateInterior,interiorFromShell} from '../src/interiors/interior.js';import {stairConnection} from '../src/interiors/interior-storeys.js';import {buildPart,disposePart} from '../src/core/geometry.js';import {Raycaster,Vector3} from '../vendor/three.module.js';
const ray=(m,o,d,far)=>new Raycaster(new Vector3(...o),new Vector3(...d),0,far).intersectObject(m,true);
test('roof stair reaches the actual roof, cuts roof and ceiling, retains terrace and clears every tread',()=>{const project=roofAccessFixture();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);const part=project.parts[0],p=part.interior,s=p.stairs.at(-1),c=stairConnection(p,s),m=buildPart(part,{batch:true});m.updateMatrixWorld(true);assert.equal(p.slab+c.to.elevation,p.shell.height);assert.equal(ray(m,[3,6.65,1],[0,-1,0],.3).length,0);assert.ok(ray(m,[3,6.7,c.end.z+.4],[0,-1,0],.2).length);const count=c.route.segments[0].steps;for(let i=0;i<count;i++){const z=s.z+s.run*(i+.5)/count,y=p.slab+c.from.elevation+c.rise*(i+1)/count;assert.equal(ray(m,[s.x,y+.01,z],[0,1,0],1.99).length,0);}assert.equal(ray(m,[s.x,7,c.end.z-.1],[0,0,1],.9).length,0,'exit guard must not block arrival');disposePart(m);});
test('roof connections also work on single-storey shells and restore the roof when removed',()=>{const part=interiorFromShell(makePart('block',{scale:[12,3.4,12]})),p=part.interior;p.stairs=[{id:'roof',from:'ground',to:'roof',x:0,z:-2.5,run:5.04,width:1.4,direction:'south'}];validateInterior(p);let m=buildPart(part,{batch:true});m.updateMatrixWorld(true);assert.equal(ray(m,[0,3.45,0],[0,-1,0],.3).length,0);disposePart(m);p.stairs=[];m=buildPart(part,{batch:true});m.updateMatrixWorld(true);assert.ok(ray(m,[0,3.45,0],[0,-1,0],.3).length);disposePart(m);});
test('roof access follows shell height, rejects wrong source floor and supports optional guards',()=>{let part=roofAccessFixture().parts[0],p=part.interior;p.shell.height=6.8;validateInterior(p);assert.ok(Math.abs(stairConnection(p,p.stairs.at(-1)).rise-3.4)<1e-6);p.stairs.at(-1).from='ground';assert.throws(()=>validateInterior(p),/highest interior floor/);part=roofAccessFixture().parts[0];const guarded=buildPart(part);const count=guarded.children.length;disposePart(guarded);part.interior.stairs.at(-1).roofGuards=false;const open=buildPart(part);assert.ok(open.children.length<count);disposePart(open);});
import {interiorRouteSeed,interiorRouteStair,snapInteriorRouteFloor} from '../src/interiors/interior-route.js';

test('roof stairs can reopen as routes, snap to the roof and keep their terrace guard setting',()=>{
 const part=roofAccessFixture().parts[0],old=part.interior.stairs.at(-1);old.roofGuards=false;
 const route=interiorRouteSeed(part,old.from,{x:old.x,z:old.z},old);
 const saved=interiorRouteStair(part,old.from,route,old.id);
 assert.equal(saved.to,'roof');assert.equal(saved.roofGuards,false);
 part.interior.stairs[part.interior.stairs.length-1]=saved;
 validateInterior(part.interior);
 assert.equal(stairConnection(part.interior,saved).reached,true);
 const segment=route.route.segments[0],snap=snapInteriorRouteFloor(part,old.from,route,0,{run:segment.run,rise:segment.rise-.1,steps:segment.steps});
 assert.ok(snap);assert.ok(Math.abs(snap.rise-segment.rise)<1e-6);
 const mesh=buildPart(part,{batch:true});mesh.updateMatrixWorld(true);
 assert.equal(ray(mesh,[3,6.65,1],[0,-1,0],.3).length,0);
 disposePart(mesh);
});

test('single-storey shells seed roof access instead of requiring an extra interior floor',()=>{
 const part=interiorFromShell(makePart('block',{scale:[12,3.4,12]}));
 const route=interiorRouteSeed(part,'ground',{x:0,z:-2.5});
 Object.assign(route.route.segments[0],{run:5.04,rise:3.2,steps:18});
 const stair=interiorRouteStair(part,'ground',route);part.interior.stairs=[stair];
 assert.equal(stair.to,'roof');assert.doesNotThrow(()=>validateInterior(part.interior));
 assert.equal(stairConnection(part.interior,stair).reached,true);
});
