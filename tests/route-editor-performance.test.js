import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {routeConnectionResolver,resolveRouteLinks} from '../src/routes/route-links.js';
import {routeAnchorTargets,routeSnapTargets} from '../src/routes/route-snap.js';
import {createRouteBubbles} from '../src/routes/route-bubbles.js';

test('connection probes resolve transformed ancestor chains without cloning unrelated buildings',()=>{
 const a=makePart('stair-route'),b=makePart('stair-route'),c=makePart('stair-route'),building=makePart('block');
 for(const p of [a,b,c])Object.assign(p.route.segments[0],{kind:'landing',rise:0,run:4});
 a.route.width=b.route.width=c.route.width=2;a.position=[5,3,12];a.rotation[1]=.4;b.route.links={start:{partId:a.id,segment:0,side:'front'}};c.route.links={start:{partId:b.id,segment:0,side:'front'}};
 const expected=resolveRouteLinks([a,b,c]).find(p=>p.id===c.id);let reads=0;Object.defineProperty(building,'irrelevantAsset',{enumerable:true,get(){reads++;throw Error('Unrelated building was cloned');}});
 const resolved=routeConnectionResolver([building,a,b,c])(c);assert.equal(reads,0);assert.equal(resolved.length,3);assert.deepEqual(resolved.find(p=>p.id===c.id),expected);
 const source=makePart('stair-route');source.route.width=2;assert.ok(routeSnapTargets([building,a,b,source],source,'start').length);assert.equal(reads,0);
 a.route.links={start:{partId:c.id,segment:0,side:'front'}};assert.throws(()=>routeConnectionResolver([a,b,c])(c),/cycle/);
});

test('destination guides retain fitting, transforms, hiding and cycle rejection without fitting every port',()=>{
 const source=makePart('stair-route'),host=makePart('stair-route');source.route.width=host.route.width=2;host.position=[8,3,11];host.rotation[1]=.7;host.scale=[-2,1,1.5];
 for(const p of [source,host])Object.assign(p.route.segments[0],{kind:'landing',rise:0,run:4});
 const parts=[source,host],before=JSON.stringify(parts),guides=routeAnchorTargets(parts,source),expected=routeSnapTargets(parts,source,'start');
 assert.equal(guides.length,4);for(const g of guides){const old=expected.find(t=>JSON.stringify(t.ref)===JSON.stringify(g.ref));assert.ok(old);assert.ok(g.point.distanceTo(old.point)<1e-7);assert.equal(g.effective,undefined);}
 assert.equal(JSON.stringify(parts),before);assert.equal(routeAnchorTargets(parts,source,new Set([host.id])).length,0);
 source.route.width=9;assert.equal(routeAnchorTargets(parts,source).length,0);source.route.width=2;
 host.route.links={start:{partId:source.id,segment:0,side:'front'}};assert.equal(routeAnchorTargets(parts,source).length,0);
});

test('Meridian tenement editing retains its 250 compatible destination guides and leaves the scene unchanged',()=>{
 const {parts}=JSON.parse(readFileSync(new URL('../examples/projects/coruscant-residential.building.json',import.meta.url),'utf8')),source=parts.find(p=>p.name==='East continuous tenement mass'),before=JSON.stringify(parts),guides=routeAnchorTargets(parts,source);
 assert.equal(source.route.segments.length,13);assert.equal(guides.length,250);assert.ok(guides.every(g=>g.guide&&g.point.toArray().every(Number.isFinite)));assert.equal(JSON.stringify(parts),before);
});

test('hundreds of snap rings use one reusable instance batch with correct camera sizing and hover colors',()=>{
 const view=createRouteBubbles(),targets=Array.from({length:250},(_,i)=>({point:new T.Vector3(i,2,4),ref:{partId:'host',segment:i,side:'front'}})),camera=new T.PerspectiveCamera(42,1,.1,1000);camera.position.set(0,10,20);
 try{
  view.set(targets,targets[0].ref);view.update(camera,600);const batch=view.group.children.find(m=>m.isInstancedMesh),geometry=batch.geometry;assert.equal(batch.count,250);assert.equal(view.group.children.filter(m=>m.isInstancedMesh).length,1);assert.equal(view.group.children.length,2);assert.ok(geometry.attributes.position.count<64,'rings remain lightweight editor glyphs');assert.equal(batch.material.side,T.DoubleSide);
  const matrix=new T.Matrix4(),color=new T.Color();batch.getMatrixAt(4,matrix);assert.ok(new T.Vector3().setFromMatrixPosition(matrix).distanceTo(targets[4].point)<1e-6);assert.ok(Math.abs(new T.Vector3().setFromMatrixScale(matrix).x-camera.position.distanceTo(targets[4].point)*Math.tan(camera.fov*Math.PI/360)*18/600)<1e-6);
  view.hover(targets[4],{point:new T.Vector3(1,2,3)});view.update(camera,600);batch.getColorAt(4,color);assert.equal(color.getHexString(),'ffffff');view.hover(null);batch.getColorAt(4,color);assert.equal(color.getHexString(),'51d8ed');batch.getColorAt(0,color);assert.equal(color.getHexString(),'ffffff');
  view.set([]);assert.equal(batch.count,0);view.set(targets);view.update(camera,600);assert.equal(view.group.children.find(m=>m.isInstancedMesh),batch);assert.equal(batch.geometry,geometry);assert.ok(targets.every(t=>!t.bubble));
 }finally{view.dispose();}
});
