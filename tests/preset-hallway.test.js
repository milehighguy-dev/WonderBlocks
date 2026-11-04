import test from 'node:test';
import assert from 'node:assert/strict';
import {HALLWAY_PRESETS,selectHallwayPreset} from '../src/routes/hallway-presets.js';
import {surfacePixels} from '../src/materials/surfaces.js';
import {defaultHallwayRoute} from '../src/routes/hallway.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {routeLayout,validateRoute} from '../src/routes/stair-route.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import * as T from '../vendor/three.module.js';
const route=id=>{const r=defaultHallwayRoute();r.width=4;r.segments[0].run=8;selectHallwayPreset(r.segments[0],id);r.segments[0].hallway.height=3.4;return r;};
const ray=(g,p,d,max=20)=>new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d),0,max).intersectObject(g,true);
for(const preset of HALLWAY_PRESETS){
 test(`${preset.label}: source finishes and settings survive saving`,()=>{const r=route(preset.id),p={format:'open-building-studio',version:1,name:preset.label,parts:[makePart('stair-route',{route:r})]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);for(const key of ['wall','floor','ceiling']){const pixels=surfacePixels(preset[key]);assert.equal(pixels.length,128*128*4);assert.ok(new Set(pixels).size>20);}assert.equal(r.segments[0].componentFinishes.deck.surface.preset,preset.floor);});
 test(`${preset.label}: clear passage, solid shell and removable ceiling`,()=>{const r=route(preset.id),g=buildPart(makePart('stair-route',{route:r}));g.updateMatrixWorld(true);assert.equal(ray(g,[0,1.7,-1],[0,0,1],10).length,0);assert.ok(ray(g,[0,1.7,3],[1,0,0],3).length);assert.ok(ray(g,[4,1.7,3],[-1,0,0],3).length);const roof=ray(g,[0,1,3],[0,1,0],4)[0];assert.ok(roof&&roof.point.y>2.4&&roof.point.y<3.6);assert.ok(geometryStats(g).triangles<1200);assert.ok(g.children.some(m=>m.userData.hallwayInspired));disposePart(g);r.segments[0].hallway.ceiling=false;const open=buildPart(makePart('stair-route',{route:r}));open.updateMatrixWorld(true);assert.equal(ray(open,[0,1,3],[0,1,0],6).length,0);assert.equal(open.children.filter(m=>m.userData.hallwayCeiling).length,0);disposePart(open);});
 test(`${preset.label}: turns and slopes leave connections open; curves stay finite`,()=>{for(const turn of ['left','right','return-left','return-right']){const r=route(preset.id),s=r.segments[0];r.segments.push({...structuredClone(s),run:4,turn},{...structuredClone(s),kind:'ramp',run:6,rise:1,turn:'straight'});validateRoute(r);const g=buildPart(makePart('stair-route',{route:r}));g.updateMatrixWorld(true);for(const l of routeLayout(r).slice(0,-1)){const d=[Math.sin(l.endHeading),0,Math.cos(l.endHeading)];assert.equal(ray(g,[l.end[0]-d[0]*.2,l.end[1]+1.7,l.end[2]-d[2]*.2],d,.4).length,0,turn);}g.traverse(m=>{if(m.isMesh)assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));});disposePart(g);}const r=route(preset.id);r.segments[0].curveAngle=Math.PI/2;const g=buildPart(makePart('stair-route',{route:r}));assert.ok(g.children.filter(m=>m.userData.hallway).every(m=>m.userData.routeCurved));disposePart(g);});
}
