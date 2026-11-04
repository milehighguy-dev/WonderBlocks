import test from 'node:test';import assert from 'node:assert/strict';
import {makePart,validateProject} from '../src/core/model.js';import {buildPart} from '../src/core/geometry.js';import {defaultRailing} from '../src/routes/railings.js';import {defaultHallway} from '../src/routes/hallway.js';import {validateRoute} from '../src/routes/stair-route.js';import {appendRouteSegment} from '../src/routes/route-actions.js';import {routeFinishParts,routeMeshPart} from '../src/routes/route-finishes.js';import {surfaceTexture} from '../src/materials/surfaces.js';import {geometryStats} from '../src/core/mesh-budget.js';
const route=style=>({width:4,thickness:.2,gap:.15,segments:[{kind:'landing',run:8,rise:0,steps:1,turn:'straight',...(style==='tantive'||style==='hallway'?{hallway:{...defaultHallway(),style:style==='tantive'?'tantive':'plain'}}:{railing:{...defaultRailing(),style}})}]});
for(const style of ['walkway','bespin','bespin-arches','yavin-aqueduct','yavin-temple-bridge','tantive','hallway','posts','solid'])test(style+' components have independent finishes without more triangles',()=>{
 const r=route(style),base=buildPart(makePart('stair-route',{route:r})),keys=routeFinishParts(r.segments[0]);
 assert.deepEqual(new Set(base.children.map(routeMeshPart).filter(Boolean)),new Set(keys));
 for(const key of keys){const next=structuredClone(r);next.segments[0].componentFinishes={[key]:{color:'#ff1122',surface:{preset:'metal',scale:2}}};const g=buildPart(makePart('stair-route',{route:next}));assert.equal(geometryStats(g).triangles,geometryStats(base).triangles);
 for(let i=0;i<g.children.length;i++){const m=g.children[i];if(routeMeshPart(m)===key){assert.equal(m.material.color.getHexString(),'ff1122');assert.equal(m.material.map,surfaceTexture('metal'));}else{assert.equal(m.material.color.getHexString(),base.children[i].material.color.getHexString());assert.equal(m.material.map,base.children[i].material.map);}}
 }
});
test('component finishes persist and inherit from the section being extended',()=>{const r=route('bespin');r.segments[0].componentFinishes={underbody:{surface:{preset:'metal',scale:2}}};const p={format:'open-building-studio',version:1,name:'Finishes',parts:[makePart('stair-route',{route:r})]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);const extended=appendRouteSegment(r,'landing');assert.deepEqual(extended.segments.at(-1).componentFinishes,r.segments[0].componentFinishes);extended.segments.at(-1).componentFinishes.underbody.surface.scale=3;assert.equal(r.segments[0].componentFinishes.underbody.surface.scale,2);});
test('invalid component finishes rejected',()=>{for(const f of [{nope:{}},{rails:{color:'red'}},{arches:{surface:{preset:'metal',scale:0}}},{deck:{surface:{preset:'missing',scale:1}}}]){const r=route('walkway');r.segments[0].componentFinishes=f;assert.throws(()=>validateRoute(r));}});

test('plain deck overrides reset inherited metal shading as well as removing its texture',()=>{
 const r=route('posts');r.segments[0].componentFinishes={deck:{surface:{preset:'plain',scale:1}}};
 const mesh=buildPart(makePart('stair-route',{surface:{preset:'metal',scale:1},route:r}));
 const deck=mesh.children.find(m=>m.userData.routeFloor);
 assert.equal(deck.material.map,null);assert.equal(deck.material.bumpMap,null);
 assert.equal(deck.material.roughness,.72);assert.equal(deck.material.metalness,.05);
});

test('import validates inherited deck finishes, including repeat density',()=>{
 for(const finish of [null,{color:'bad'},{surface:{preset:'metal',scale:NaN}},{surface:{preset:'metal',scale:0}}]){
  const r=route('posts');r.segments[0].floorFinish=finish;assert.throws(()=>validateRoute(r),/finish/);
 }
});
