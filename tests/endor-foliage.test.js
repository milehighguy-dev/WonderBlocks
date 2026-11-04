import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {ENDOR_REDWOOD_SPRAY as spray,ENDOR_REDWOOD_FOLIAGE as foliage} from '../src/flora/endor-foliage.js';
import {ENDOR_REDWOOD_SPRAY_SOURCE as source} from '../src/flora/data/endor-foliage-source.js';
import {floraAsset,floraPaletteCategory,floraPlacementCategory,floraIconUrl} from '../src/flora/flora-palette.js';
import {floraSockets,floraOrganMatrix,updateFloraPreview,validateFlora} from '../src/flora/flora.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {makePart,validateProject} from '../src/core/model.js';

test('the Endor tall tree spray retains its original folded planes, native stem pivot and game texture cutout',()=>{
 assert.equal(floraAsset(spray.id).id,spray.id);assert.equal(floraPaletteCategory(spray),'Leaves');assert.equal(floraPlacementCategory(spray),'Surface parts');assert.deepEqual(floraSockets(spray.id),[]);assert.equal(spray.billboard,undefined);assert.equal(spray.triangles,4);assert.ok(fs.existsSync(new URL(floraIconUrl(spray))));
 assert.ok(source.texture.source.includes('end/end1.lvl'));assert.equal(source.texture.width,128);assert.equal(source.texture.height,128);
 const original=Uint8Array.from(atob(source.texture.rgba),c=>c.charCodeAt(0)),map=spray.textureMap(),mask=spray.alphaMap();
 for(let i=0;i<original.length;i+=4){assert.equal(map.image.data[i],original[i]);assert.equal(map.image.data[i+3],255);assert.equal(mask.image.data[i+1],original[i+3]);}
 assert.ok(mask.image.data.some((v,i)=>i%4===1&&v===0));assert.ok(mask.image.data.some((v,i)=>i%4===1&&v>200));assert.equal(map.colorSpace,T.SRGBColorSpace);
 assert.ok(source.positions.some((_,i)=>i%3===2&&Math.abs(source.positions[i])>.1),'The leaf plane must retain its authored fold');assert.ok(source.positions.some((_,i)=>i%3===0&&source.positions.slice(i,i+3).every(v=>Math.abs(v)<1e-6)),'The native stem pixel is the mounting origin');
});

test('the broad Endor crown has tapering tiers and native leaves that follow joint edits through save/load',()=>{
 const part=makePart('flora',instantiateFloraTreePreset('endor-forest-redwood')),f=part.flora;
 assert.equal(f.organs.length,33);assert.ok(f.organs.every(o=>o.asset===foliage.id&&!o.billboard&&o.branch===f.branches[0].id));assert.ok(f.branches.length<24);assert.equal(f.branches.length,5);assert.ok(f.branches.slice(1).every(b=>b.name.startsWith('Redwood root')),'No modeled wooden boughs may return');assert.ok(f.organs.filter(o=>o.at>.94).length>=3,'The crown must cover the terminal joint');assert.ok(f.organs.filter(o=>o.at>.94).every(o=>o.scale[0]>=.4),'Upper leaves must retain enough volume to cover the wood');
 const group=buildPart(part,{floraEditing:true,floraLive:true}),o=f.organs[0],b=f.branches.find(b=>b.id===o.branch),before=floraOrganMatrix(f,o),surface=group.children.find(g=>g.userData.floraOrgan===o.id);
 assert.equal(surface.children[0].userData.floraBillboard,undefined);assert.equal(surface.children[0].material.alphaMap,foliage.alphaMap());assert.deepEqual([...surface.children[0].geometry.attributes.uv.array],Array.from(Float32Array.from(foliage.meshes[0].uv)));
 b.points[1][0]+=.7;validateFlora(f);updateFloraPreview(group,f,b.id);assert.ok(!floraOrganMatrix(f,o).equals(before));assert.ok(surface.matrix.equals(floraOrganMatrix(f,o)));assert.deepEqual([...surface.children[0].geometry.attributes.position.array],Array.from(Float32Array.from(foliage.meshes[0].positions)));
 const saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Endor',parts:[part]})));assert.deepEqual(saved.parts[0].flora,f);disposePart(group);
});


test('Endor leaf groups share a real stem pivot and stay joint-free selectable foliage',()=>{
 assert.equal(floraAsset(foliage.id).id,foliage.id);assert.equal(floraPaletteCategory(foliage),'Leaves');assert.deepEqual(floraSockets(foliage.id),[]);assert.equal(foliage.billboard,undefined);assert.equal(foliage.triangles,20);assert.ok(fs.existsSync(new URL(floraIconUrl(foliage))));
 const mesh=foliage.meshes[0];let roots=0;for(let i=0;i<mesh.positions.length;i+=3)if(mesh.positions.slice(i,i+3).every(v=>Math.abs(v)<1e-6))roots++;assert.ok(roots>=5,'Every spray in the group must share its mounting origin');
});
