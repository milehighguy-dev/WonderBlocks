import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {disposePart} from '../src/core/geometry.js';
import {surfaceTexture} from '../src/materials/surfaces.js';

test('disposing a part handles material arrays and releases shared resources once',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(),a=new T.MeshStandardMaterial(),b=new T.MeshStandardMaterial();
 const counts=[0,0,0];[geometry,a,b].forEach((r,i)=>r.addEventListener('dispose',()=>counts[i]++));
 root.add(new T.Mesh(geometry,[a,b]),new T.Mesh(geometry,a));
 assert.doesNotThrow(()=>disposePart(root));assert.deepEqual(counts,[1,1,1]);
});

test('part cleanup leaves cached textures available for other parts',()=>{
 const texture=surfaceTexture('metal'),material=new T.MeshStandardMaterial({map:texture});let disposed=false;
 texture.addEventListener('dispose',()=>disposed=true);
 const root=new T.Group();root.add(new T.Mesh(new T.BoxGeometry(),material));disposePart(root);
 assert.equal(disposed,false);assert.equal(surfaceTexture('metal'),texture);
});
