import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';import {makePart} from '../src/core/model.js';import {buildPart} from '../src/core/geometry.js';import {defaultRailing} from '../src/routes/railings.js';import {curveMeshPoint} from '../src/routes/curved-route.js';
test('Kamino underbody meets the deck soffit without overlapping side faces',()=>{
 for(const kind of ['stairs','ramp','landing'])for(const rise of (kind==='landing'?[0]:[-2,0,2]))for(const angle of [0,Math.PI/2,-Math.PI/2]){
 const thickness=.2,backing=thickness+(kind==='stairs'&&rise!==0?.08:0),s={kind,run:8,rise,steps:16,turn:'straight',curveAngle:angle,railing:{...defaultRailing(),style:'walkway'}};
 const g=buildPart(makePart('stair-route',{route:{width:3,thickness,gap:.15,segments:[s]}}));g.updateMatrixWorld(true);
 const meshes=g.children.filter(m=>m.userData.routeFloor||m.geometry?.userData.walkwayProfile==='hull');
 for(const z of [2.13,3.17,5.21])for(const sign of [-1,1])for(const below of [false,true]){
 const y=rise*z/s.run-backing+(below?-.03:backing/2),a=new T.Vector3(...curveMeshPoint(sign*2,y,z,s.run,angle)),b=new T.Vector3(...curveMeshPoint(0,y,z,s.run,angle));
 const hits=new T.Raycaster(a,b.sub(a).normalize(),0,.8).intersectObjects(meshes);
 assert.equal(hits.length,1,[kind,rise,angle,z,sign,below].join(','));assert.equal(!!hits[0].object.userData.routeFloor,!below);
 }
 }
});
