import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAssembly,instantiateAssembly,validateLibrary,emptyLibrary} from '../src/core/library.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {Box3,Group,Vector3,Quaternion} from '../vendor/three.module.js';
test('capture anchors actual geometry at bottom center and preserves independent appearance',()=>{
 const source=[makePart('doric-smooth',{position:[12,4,-8],scale:[-2,1.2,2],parameters:{shaftFullness:.08},surface:{preset:'plain',scale:1}}),makePart('temple-roof-half',{position:[12,8,-8],parameters:{roofPitch:35}})];
 const before=structuredClone(source),entry=captureAssembly('Portico',source),g=new Group();entry.parts.forEach(p=>g.add(buildPart(p)));const box=new Box3().setFromObject(g),center=box.getCenter(new Vector3());assert.ok(Math.abs(box.min.y)<1e-6);assert.ok(Math.abs(center.x)<1e-6&&Math.abs(center.z)<1e-6);assert.deepEqual(source,before);assert.deepEqual(entry.parts[0].parameters,source[0].parameters);entry.parts[0].parameters.shaftFullness=0;assert.equal(source[0].parameters.shaftFullness,.08);disposePart(g);
});
test('placement rigidly rotates mirrored scaled parts and assigns independent object group IDs',()=>{
 const entry=captureAssembly('Pair',[makePart('block',{position:[1,2,3],scale:[-2,3,1],rotation:[.3,.4,.5]}),makePart('doric',{position:[4,0,1]})]),a=instantiateAssembly(entry,[8,3,-2],Math.PI/2),b=instantiateAssembly(entry);
 assert.equal(a[0].assemblyId,a[1].assemblyId);assert.notEqual(a[0].assemblyId,b[0].assemblyId);assert.notEqual(a[0].id,b[0].id);
 for(let i=0;i<a.length;i++){const orig=buildPart(entry.parts[i]),copy=buildPart(a[i]);orig.updateMatrixWorld(true);copy.updateMatrixWorld(true);for(const point of [[0,0,0],[1,.5,-1]]){const expected=new Vector3(...point).applyMatrix4(orig.matrixWorld).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/2)).add(new Vector3(8,3,-2));assert.ok(expected.distanceTo(new Vector3(...point).applyMatrix4(copy.matrixWorld))<1e-6);}disposePart(orig);disposePart(copy);}
 const mirrored=instantiateAssembly(entry,[8,0,0],0,true);assert.equal(mirrored.length,4);assert.notEqual(mirrored[0].assemblyId,mirrored[2].assemblyId);assert.equal(mirrored[2].position[0],-mirrored[0].position[0]);
});
test('library backup round trips, rejects malformed imports and bounds placement',()=>{
 const library=emptyLibrary();library.entries.push(captureAssembly('Roof',[makePart('temple-roof-half')]));assert.deepEqual(validateLibrary(JSON.parse(JSON.stringify(library))),library);
 for(const bad of [null,{...library,version:2},{...library,entries:[library.entries[0],library.entries[0]]},{...library,entries:[{...library.entries[0],parts:[]}]},{...library,entries:Array(101).fill(library.entries[0])}])assert.throws(()=>validateLibrary(bad));
 assert.throws(()=>instantiateAssembly(library.entries[0],[1002,0,0]));assert.throws(()=>captureAssembly('Empty',[]));
});
