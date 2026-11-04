import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {physicalSurface} from '../src/collision/object-collision.js';
import {assertClosedSurface} from '../src/collision/collision-geometry.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';

test('flat-topped arches keep a closed curved opening and a continuous supporting roof in render and collision',()=>{
 const part=makePart('flat-arch',{scale:[10,8,12],surface:{preset:'rift-stone',scale:.3}});
 const project={format:'open-building-studio',version:1,name:'Flat arch',parts:[part]};
 assert.deepEqual(validateProject(project),project);
 const root=buildPart(part,{collision:'sync'});
 try{
  root.updateMatrixWorld(true);root.traverse(m=>{if(m.isMesh)assert.doesNotThrow(()=>assertClosedSurface(physicalSurface(m,new T.Matrix4())));});
  const collision=createWalkCollision([root]);
  for(const x of [-6,-3,0,3,6]){
   const ray=new T.Raycaster(new T.Vector3(x,12,2),new T.Vector3(0,-1,0),0,12);
   const visual=ray.intersectObject(root,true)[0],physical=collision.firstHit(ray);
   assert.ok(visual&&physical);assert.ok(Math.abs(visual.point.y-10.4)<1e-5);assert.ok(Math.abs(physical.point.y-10.4)<1e-5);
  }
  const opening=new T.Raycaster(new T.Vector3(0,4,-1),new T.Vector3(0,0,1),0,7);
  assert.equal(opening.intersectObject(root,true).length,0);assert.equal(collision.firstHit(opening),null);
  const pier=new T.Raycaster(new T.Vector3(5.5,4,-1),new T.Vector3(0,0,1),0,7);
  assert.ok(pier.intersectObject(root,true).length);assert.ok(collision.firstHit(pier));
 }finally{disposePart(root);}
 const output=createSWBF2Package(project,{aiNavigation:false});
 assert.ok(output.manifest.assets.some(a=>a.shadowTriangles>0));
 assert.ok([...output.files.keys()].some(p=>p.endsWith('.msh')));
});
