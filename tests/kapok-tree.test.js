import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {floraAsset} from '../src/flora/flora-palette.js';
import {floraMuscleShape} from '../src/flora/flora-muscle.js';
import {branchGeometry,floraOrganPosition,floraAttachmentFrame,validateFlora} from '../src/flora/flora.js';

test('kapok keeps metre-scale dimensions, narrow native buttresses and a manageable mesh after saving',()=>{
 const part=makePart('flora',instantiateFloraTreePreset('kapok-mature')),f=part.flora;
 validateFlora(f);assert.equal(f.branches[0].profile,'kapok-buttressed-bole');assert.ok(floraAsset(f.branches[0].profile).nativeSkin);
 const shape=floraMuscleShape(f.branches[0].profile);assert.equal(shape.length,35);assert.ok(shape.mesh.bindings.every(t=>t>=0&&t<=1));
 const roots=branchGeometry(f,f.branches[0]);roots.computeBoundingBox();assert.ok(Math.abs(roots.boundingBox.min.y)<.04);assert.ok(roots.boundingBox.max.y>34);assert.ok(roots.boundingBox.getSize(new T.Vector3()).x>12);roots.dispose();
 assert.equal(f.branches.length,17);assert.equal(f.organs.length,20);assert.ok(f.organs.every(o=>o.billboard&&f.branches.some(b=>b.id===o.branch)));
 const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Kapok scale check',parts:[part]})));
 assert.deepEqual(saved.parts[0].flora,f);
 const group=buildPart(saved.parts[0]),box=new T.Box3().setFromObject(group);let triangles=0;
 group.traverse(m=>{if(m.isMesh){triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));}});
 assert.ok(box.max.y>38&&box.max.y<43);assert.ok(box.getSize(new T.Vector3()).x>34&&box.getSize(new T.Vector3()).x<41);assert.ok(triangles<18000);disposePart(group);
});

test('kapok canopy follows edited wood instead of floating independently',()=>{
 const f=instantiateFloraTreePreset('kapok-mature').flora,o=f.organs[0],before=floraOrganPosition(f,o),trunk=f.branches[0];
 trunk.points[5][0]+=1;const after=floraOrganPosition(f,o);assert.ok(before.distanceTo(after)>.1);
 const frame=floraAttachmentFrame(f,trunk);assert.ok(new T.Vector3().setFromMatrixPosition(frame).length()<1e-6);
 validateFlora(f);
});
