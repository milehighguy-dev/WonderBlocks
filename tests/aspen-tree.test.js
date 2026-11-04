import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {floraOrganPosition,validateFlora} from '../src/flora/flora.js';
import {aspenLeafTexture} from '../src/flora/aspen-foliage.js';
import {billboardTexture} from '../src/flora/flora-billboards.js';

test('seasonal aspens share primary wood, omit winter twig fans and fine forks, and retain human-scale dimensions',()=>{
 const presets=['summer','fall','winter'].map(s=>instantiateFloraTreePreset('aspen-'+s));
 const structure=f=>f.branches.filter(b=>!b.name.includes('fine fork')).map(b=>({points:b.points,radii:b.radii}));
 assert.deepEqual(structure(presets[0].flora),structure(presets[2].flora));
 assert.equal(presets[2].flora.organs.filter(o=>o.kind==='leaf').length,0);
 assert.equal(presets[2].flora.organs.length,0,'winter has no fine twig fans or foliage');
 assert.ok(presets[2].flora.branches.length<presets[0].flora.branches.length,'winter omits fine forks');
 for(const preset of presets){validateFlora(preset.flora);const part=makePart('flora',preset),saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Aspen scale',parts:[part]})));assert.deepEqual(saved.parts[0].flora,preset.flora);const group=buildPart(part),box=new T.Box3().setFromObject(group);let triangles=0;group.traverse(m=>{if(m.isMesh){triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert.ok([...m.geometry.attributes.position.array].every(Number.isFinite));}});assert.ok(box.max.y>=18&&box.max.y<22);assert.ok(box.getSize(new T.Vector3()).x<13);assert.ok(triangles<35000);disposePart(group);}
});
test('aspen seasonal sprays retain cutout silhouettes and attached foliage follows trunk edits',()=>{
 const summer=aspenLeafTexture('summer').image,fall=aspenLeafTexture('fall').image,mask=aspenLeafTexture('summer',true).image;
 assert.notDeepEqual(summer.data,fall.data);assert.ok([...mask.data].some((v,i)=>i%4===1&&v===0));assert.ok([...mask.data].some((v,i)=>i%4===1&&v===255));
 assert.deepEqual(aspenLeafTexture('fall',true).image.data,mask.data);
 assert.deepEqual(mask.data,billboardTexture('yavin-leaves',true).image.data,'both seasons retain the exact stock Yavin cutout');
 assert.equal(summer.width,256);assert.equal(summer.height,256);
 const f=instantiateFloraTreePreset('aspen-summer').flora,o=f.organs.find(o=>o.kind==='leaf'),before=floraOrganPosition(f,o);f.branches[0].points[3][0]+=1;assert.ok(before.distanceTo(floraOrganPosition(f,o))>.01);
});

test('aspen leaf patches use stock-shaped broad cards with a practical foliage budget',()=>{
 for(const season of ['summer','fall']){const f=instantiateFloraTreePreset('aspen-'+season).flora,patches=f.organs.filter(o=>o.billboard);assert.equal(patches.length,11);assert.equal(patches.reduce((n,o)=>n+o.billboard.count,0),132);assert.ok(patches.every(o=>o.billboard.heightScale===.5&&o.billboard.atlas===2));assert.ok(!f.organs.some(o=>o.asset==='aspen-fine-twigs'));}
});
