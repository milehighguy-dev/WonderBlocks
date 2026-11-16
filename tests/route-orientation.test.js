import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {routeLayout} from '../src/routes/stair-route.js';
import {partMatrix} from '../src/interiors/entrances.js';
import {routeIsUpright,levelRoute} from '../src/routes/route-orientation.js';
import {roomFromRoute} from '../src/interiors/room-route.js';
import {platformFromRoute} from '../src/platforms/platform-flow.js';
const tip=part=>new Vector3(...routeLayout(part.route).at(-1).end).applyMatrix4(partMatrix(part));
test('levelling a tilted route retains its destination and can connect either type of space',()=>{
 for(const rotation of [[.004,.4,-.003],[Math.PI-.001,.18,-Math.PI+.006]]){
  const route=makePart('stair-route',{position:[400,180,30],rotation}),before=structuredClone(route),levelled=levelRoute(route,0);
  assert.equal(routeIsUpright(route),false);assert.equal(routeIsUpright(levelled),true);assert.ok(tip(levelled).distanceTo(tip(route))<1e-7);assert.deepEqual(route,before);
  for(const create of [roomFromRoute,platformFromRoute]){const result=create(levelled);assert.doesNotThrow(()=>validateProject({format:'open-building-studio',version:1,name:'Route destination',parts:[result.route,result.room||result.platform]}));}
 }
});
test('equivalent upright Euler rotations level without changing visible geometry',()=>{
 const route=makePart('stair-route',{rotation:[Math.PI,.18,-Math.PI]}),levelled=levelRoute(route,0),a=partMatrix(route),b=partMatrix(levelled);
 assert.equal(routeIsUpright(route),true,'equivalent Euler angles are still upright');
 for(const point of [[0,0,0],[1,2,3],[-2,1,4]])assert.ok(new Vector3(...point).applyMatrix4(a).distanceTo(new Vector3(...point).applyMatrix4(b))<1e-7);
});
