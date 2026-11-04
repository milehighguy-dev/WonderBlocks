import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {prepareCollisionSurface,collisionSurfaceDensity,COLLISION_CONTACT_TRIANGLES} from '../src/collision/collision-surface.js';
import {physicalSurface} from '../src/collision/object-collision.js';
import {closedShadow} from '../src/swbf2/swbf2-binary.js';
import {cleanCollisionSurface,collisionNeedsPreservation} from '../src/collision/collision-geometry.js';

function surface(geometry){const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial());mesh.updateMatrixWorld();const result=physicalSurface(mesh,new T.Matrix4());geometry.dispose();mesh.material.dispose();return result;}
const triangles=s=>s.triangles.map(t=>t.map(v=>s.positions[v].map(n=>n.toFixed(6)).join(',')).sort().join('|')).sort();
const body=s=>({id:'shape:0',partId:'shape',kind:'mesh',role:'exterior',mask:23,source:'solid shape',maximumError:0,surface:s});
test('locally dense collision is partitioned without changing or capping its physical surface',()=>{
 const source=surface(new T.PlaneGeometry(20,20,64,64)),before=JSON.stringify(source);assert.equal(collisionSurfaceDensity(source).partitionRequired,true);const parts=prepareCollisionSurface(body(source),{target:source.triangles.length});assert.ok(parts.length>1);assert.ok(parts.every(b=>b.contactPartition&&b.preserveFaces&&b.surface.triangles.length<=COLLISION_CONTACT_TRIANGLES));assert.deepEqual(parts.flatMap(b=>triangles(b.surface)).sort(),triangles(source));assert.equal(JSON.stringify(source),before);
});
test('a large low-density tree-like mesh stays a single body and retains closed topology',()=>{
 const source=surface(new T.CylinderGeometry(14,18,320,24,12)),parts=prepareCollisionSurface({...body(source),source:'tree skin',maximumError:.05});assert.equal(parts.length,1);assert.equal(parts[0].contactPartition,false);assert.doesNotThrow(()=>closedShadow(parts[0].surface.positions,parts[0].surface.triangles));assert.ok(parts[0].sampledErrorMetres<=.05);
});
test('source and reduced surfaces are sampled in both directions before accepting simplification',()=>{
 const source=surface(new T.SphereGeometry(30,32,20)),parts=prepareCollisionSurface({...body(source),maximumError:.02});assert.ok(parts.every(b=>b.sampledErrorMetres<=.02));assert.ok(parts.reduce((n,b)=>n+b.surface.triangles.length,0)>100,'accuracy prevents an aggressively coarse large sphere');
});

test('sub-millimetre intersection slivers cannot become empty native collision helpers',()=>{
 const s={positions:[[6,7.5,85.50012],[6,7.5,85.50001],[6,8,85.50001],[6,8,85.50012]],triangles:[[0,1,2],[0,2,3]]},before=JSON.stringify(s);assert.equal(cleanCollisionSurface(s).triangles.length,0);assert.equal(JSON.stringify(s),before);
 const normal=surface(new T.BoxGeometry(2,.08,3));assert.deepEqual(cleanCollisionSurface(normal),normal,'ordinary structural thickness remains unchanged');
});

test('large convex coplanar boundaries preserve faces before native polygon truncation',()=>{
 const s=surface(new T.CircleGeometry(8,128));assert.equal(collisionNeedsPreservation(s),true);assert.equal(collisionNeedsPreservation(surface(new T.CircleGeometry(8,32))),false);
});
