import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {sceneRenderKey} from '../src/editor/scene-render-key.js';
test('render reuse ignores labels/copy metadata but tracks geometry, materials, groups and connections',()=>{
 const source=makePart('block'),key=sceneRenderKey([source]);
 for(const patch of [{name:'Renamed'},{assemblyName:'New label'},{instanceFamily:'source',instanceName:'Shared',instanceCopy:true}])assert.equal(sceneRenderKey([{...source,...patch}]),key);
 for(const patch of [{position:[1,0,0]},{scale:[2,1,1]},{rotation:[0,1,0]},{color:'#f00'},{surface:{preset:'stone',scale:1}},{assemblyId:'joined'},{parameters:{baseSlopeHeight:1}}])assert.notEqual(sceneRenderKey([{...source,...patch}]),key);
 const route=makePart('stair-route'),before=sceneRenderKey([route]);route.route.links={end:{partId:source.id,segment:0,side:'back'}};assert.notEqual(sceneRenderKey([route]),before);
});
