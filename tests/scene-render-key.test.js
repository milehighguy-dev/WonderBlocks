import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {sceneRenderKey} from '../src/editor/scene-render-key.js';
import {reusableSceneParts} from '../src/editor/scene-render-dependencies.js';
import {defaultInterior} from '../src/interiors/interior.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {platformPorts} from '../src/platforms/platform.js';
test('render reuse ignores labels/copy metadata but tracks geometry, materials, groups and connections',()=>{
 const source=makePart('block'),key=sceneRenderKey([source]);
 for(const patch of [{name:'Renamed'},{assemblyName:'New label'},{instanceFamily:'source',instanceName:'Shared',instanceCopy:true}])assert.equal(sceneRenderKey([{...source,...patch}]),key);
 for(const patch of [{position:[1,0,0]},{scale:[2,1,1]},{rotation:[0,1,0]},{color:'#f00'},{surface:{preset:'stone',scale:1}},{assemblyId:'joined'},{parameters:{baseSlopeHeight:1}}])assert.notEqual(sceneRenderKey([{...source,...patch}]),key);
 const route=makePart('stair-route'),before=sceneRenderKey([route]);route.route.links={end:{partId:source.id,segment:0,side:'back'}};assert.notEqual(sceneRenderKey([route]),before);
});

test('deleting plants retains unchanged neighbours but rebuilds edited plants',()=>{
 const tree=makePart('flora'),other=makePart('flora'),block=makePart('block');
 const before=[tree,other,block],after=structuredClone([other,block]);
 assert.deepEqual(reusableSceneParts(before,after),new Set([other.id,block.id]));
 after[0].scale=[2,2,2];
 assert.deepEqual(reusableSceneParts(before,after),new Set([block.id]));
});

test('deleting ordinary shapes, routes and groups retains unrelated geometry',()=>{
 const parts=['block','round','platform','stair-route','wall-route','flora'].map(type=>makePart(type));
 for(const removed of parts)assert.deepEqual(reusableSceneParts(parts,parts.filter(p=>p!==removed)),new Set(parts.filter(p=>p!==removed).map(p=>p.id)));
});

test('removing a room rebuilds its cut hull but retains distant geometry',()=>{
 const room=makePart('interior',{interior:defaultInterior()}),host=makePart('block',{scale:[10,10,10]}),far=makePart('block',{position:[100,0,100]});
 const parts=[room,host,far],roots=new Map(parts.map(p=>[p.id,buildPart(p,{parts,collision:false})]));
 try{
  assert.deepEqual(reusableSceneParts(parts,[host,far],roots),new Set([far.id]));
  const cut=roots.get(host.id),uncut=buildPart(host,{parts:[host,far],collision:false});
  try{assert.notDeepEqual(cut.children[0].geometry.attributes.position.array,uncut.children[0].geometry.attributes.position.array);}finally{disposePart(uncut);}
 }finally{for(const root of roots.values())disposePart(root);}
});

test('deleting a connected route restores only its platform railing gap',()=>{
 const platform=makePart('platform'),port=platformPorts(platform).find(p=>p.ref.side==='back');
 const route=makePart('stair-route',{route:{width:2,thickness:.2,gap:.15,segments:[{kind:'landing',run:4,rise:0,steps:1,turn:'straight'}],links:{start:port.ref}}});
 const far=makePart('block',{position:[100,0,100]});
 assert.deepEqual(reusableSceneParts([platform,route,far],[platform,far]),new Set([far.id]));
});

test('deleting an adjacent hull restores platform railings without rebuilding distant shapes',()=>{
 const platform=makePart('platform',{position:[0,4,8]}),hull=makePart('block',{scale:[12,10,8]}),far=makePart('block',{position:[100,0,100]});
 assert.deepEqual(reusableSceneParts([platform,hull,far],[platform,far]),new Set([far.id]));
});
