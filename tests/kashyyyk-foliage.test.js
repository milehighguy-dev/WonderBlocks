import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {KASHYYYK_LEAF_PATCH,kashyyykLeafTexture,kashyyykLeafMask} from '../src/flora/kashyyyk-foliage.js';
import {FLORA_ASSETS,floraAsset,floraPaletteCategory,floraPlacementCategory,floraIconUrl} from '../src/flora/flora-palette.js';
import {addFloraAsset,floraOrganMatrix,floraSockets,floraEditableSections} from '../src/flora/flora.js';
import {testStem} from './flora-fixtures.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';

test('authored Kashyyyk patch is a small joint-free surface part in Leaves',()=>{
 const a=floraAsset(KASHYYYK_LEAF_PATCH.id);assert.ok(FLORA_ASSETS.includes(KASHYYYK_LEAF_PATCH));
 assert.equal(floraPaletteCategory(a),'Leaves');assert.equal(floraPlacementCategory(a),'Surface parts');
 assert.deepEqual(floraSockets(a.id),[]);assert.deepEqual(floraEditableSections(a.id),[]);
 assert.equal(a.meshes[0].indices.length/3,90);assert.equal(a.meshes[0].uv.length,a.meshes[0].positions.length/3*2);
 assert.ok(fs.existsSync(new URL(floraIconUrl(a))));
 const texture=kashyyykLeafTexture(),mask=kashyyykLeafMask();assert.equal(texture.image.width,256);
 assert.equal(texture.colorSpace,T.SRGBColorSpace);assert.ok(mask.image.data.some((n,i)=>i%4===1&&n===0));
 assert.ok(mask.image.data.some((n,i)=>i%4===1&&n===255));assert.equal(texture.flipY,false);
});

test('leaf cards retain cutout UVs, follow branch edits and survive saving and rebuilding',()=>{
 const f=testStem(),b=f.branches[0],o=addFloraAsset(f,b.id,KASHYYYK_LEAF_PATCH.id,.8);
 const before=floraOrganMatrix(f,o);b.points[2][0]+=1;const after=floraOrganMatrix(f,o);
 assert.ok(new T.Vector3().setFromMatrixPosition(before).distanceTo(new T.Vector3().setFromMatrixPosition(after))>.1);
 const p=makePart('flora',{flora:f}),saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Canopy',parts:[p]})));
 for(const batch of [false,true]){const group=buildPart(saved.parts[0],{batch,floraLive:true});try{
  const cards=[];group.traverse(m=>{if(m.isMesh&&m.material.userData.walkCollision===false)cards.push(m);});
  assert.equal(cards.length,1);const mesh=cards[0];assert.equal(mesh.material.alphaTest,.45);assert.equal(mesh.material.side,T.DoubleSide);
  assert.equal(mesh.material.map,kashyyykLeafTexture());assert.equal(mesh.material.alphaMap,kashyyykLeafMask());
  assert.equal(mesh.geometry.attributes.position.count,270);assert.equal(mesh.geometry.attributes.uv.count,270);
  // A leaf card must never become a solid platform in the walker.
  const collision=createWalkCollision([mesh]);assert.equal(collision.firstHit(new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0))),null);assert.equal(collision.stats.meshesTested,0);
 }finally{disposePart(group);}}
 f.finishes.leaf={preset:'forest-canopy',scale:.7};const group=buildPart(p,{floraLive:true});try{
  let leaf;group.traverse(m=>{if(m.isMesh&&m.userData.floraComponent==='leaf')leaf=m;});
  assert.equal(leaf.material.alphaMap,kashyyykLeafMask());assert.equal(leaf.material.alphaTest,.45);
 }finally{disposePart(group);}
});
