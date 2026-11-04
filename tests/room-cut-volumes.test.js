import test from 'node:test';
import assert from 'node:assert/strict';
import {roomCutVolumes} from '../src/interiors/room-cut-volumes.js';
import {polygonRoom} from '../src/interiors/polygon-plan.js';

function contains(volumes,[x,y,z]){return volumes.some(v=>v.planes.every(([nx,ny,nz,d])=>nx*x+ny*y+nz*z+d>=-1e-7));}
test('circular rooms use one convex cut with their actual outline and floor/ceiling extent',()=>{
 const points=Array.from({length:32},(_,i)=>({x:10*Math.cos(i*Math.PI/16),z:10*Math.sin(i*Math.PI/16)}));
 for(const outline of [points,[...points].reverse()]){const room=polygonRoom('circle',outline),volumes=roomCutVolumes(room,{slab:.2,height:4.2},5);assert.equal(volumes.length,1);assert.ok(contains(volumes,[0,5,0]));assert.ok(contains(volumes,[9,8,0]));assert.equal(contains(volumes,[8,6,8]),false,'the bounding-square corners stay solid');assert.equal(contains(volumes,[0,4.7,0]),false);assert.equal(contains(volumes,[0,9.5,0]),false);}
});
test('concave room cuts preserve their notch rather than using a convex envelope',()=>{
 const room=polygonRoom('notch',[{x:0,z:0},{x:6,z:0},{x:6,z:2},{x:2,z:2},{x:2,z:6},{x:0,z:6}]),volumes=roomCutVolumes(room,{slab:.2,height:3});assert.ok(volumes.length>1);assert.ok(contains(volumes,[1,1,4]));assert.ok(contains(volumes,[4,1,1]));assert.equal(contains(volumes,[4,1,4]),false);
});
