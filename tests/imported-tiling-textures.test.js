import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../vendor/three.module.js';
import {IMPORTED_TILING_TEXTURES} from '../src/materials/imported-tiling-textures.js';
import {SURFACES,surfacesForTheme,surfacePixels,surfaceTexture} from '../src/materials/surfaces.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportMaterial} from '../src/swbf2/swbf2-textures.js';
import {defaultFlora,addFloraAsset} from '../src/flora/flora.js';
import {editMaterial} from '../src/editor/material-editing.js';
import {libraryImage} from '../src/materials/texture-library.js';

test('curated architectural and flora tiles appear in their source themes and save as ordinary surfaces',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/materials/tiling-sources.json',import.meta.url)));
 assert.equal(manifest.filter(s=>s.group!=='Flora').length,28);assert.equal(manifest.filter(s=>s.group==='Flora').length,12);assert.ok(manifest.every(item=>IMPORTED_TILING_TEXTURES.some(s=>s.id===item.id)),'original imports remain available alongside directory-added textures');
 assert.equal(manifest.filter(s=>s.game==='KOTOR'&&s.group==='Flora').length,4);assert.equal(manifest.filter(s=>s.game==='KOTOR'&&s.group!=='Flora').length,8);
 for(const theme of ['SWBF1','SWBF2','Jedi Academy','KOTOR']){
  const surfaces=surfacesForTheme(theme);assert.equal(surfaces.length,IMPORTED_TILING_TEXTURES.filter(s=>s.game===theme).length+1);assert.ok(surfaces.some(s=>s.id==='plain'));
  assert.ok(surfaces.every(s=>s.id==='plain'||s.game===theme));
 }
 for(const item of manifest){
  assert.equal(SURFACES.filter(s=>s.id===item.id).length,1);assert.match(item.sourceSha256,/^[a-f0-9]{64}$/);
  assert.ok(!surfacesForTheme('General').some(s=>s.id===item.id));
  const project={format:'open-building-studio',version:1,name:'Tiling material',parts:[makePart('block',{surface:{preset:item.id,scale:.5}})]};
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
 }
});

test('imported tiles repeat in both directions without a conspicuous boundary discontinuity',()=>{
 for(const surface of IMPORTED_TILING_TEXTURES){
  const size=128,data=surfacePixels(surface.id,size),delta=(a,b)=>[0,1,2].reduce((s,c)=>s+Math.abs(data[a*4+c]-data[b*4+c]),0)/3;
  let edgeX=0,edgeY=0,insideX=0,insideY=0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=y*size+x;assert.equal(data[i*4+3],255);
   if(x===0)edgeX+=delta(i,i+size-1);else insideX+=delta(i,i-1);
   if(y===0)edgeY+=delta(i,i+size*(size-1));else insideY+=delta(i,i-size);
  }
  for(const [edge,inside] of [[edgeX,insideX],[edgeY,insideY]])assert.ok(edge/size/Math.max(2,inside/(size*(size-1)))<2.5,surface.name+' repeat seam');
  const texture=surfaceTexture(surface.id);assert.equal(texture.wrapS,T.RepeatWrapping);assert.equal(texture.wrapT,T.RepeatWrapping);
 }
});

test('imported materials render on blocks and reach native export with their complete tile',()=>{
 for(const surface of IMPORTED_TILING_TEXTURES){
  const root=buildPart(makePart('block',{color:'#ffffff',surface:{preset:surface.id,scale:.5}}));
  try{let material;root.traverse(m=>{if(m.isMesh&&m.material.map?.userData.surfacePreset===surface.id)material=m.material;});assert.ok(material);
   const exported=exportMaterial(material);assert.ok(exported);
   const source=libraryImage(surface.id);assert.equal(material.map.image.width,source.width);assert.equal(material.map.image.height,source.height);assert.deepEqual(material.map.image.data,source.data);assert.equal(exported.width,Math.min(512,source.width));
  }finally{disposePart(root);}
 }
});

test('flora coverings paint created trunks and branches while preserving leaves and editable geometry',()=>{
 const textures=IMPORTED_TILING_TEXTURES.filter(s=>s.group==='Flora');assert.equal(textures.length,12);
 const theme=surfacesForTheme('Flora');assert.equal(theme.length,15);assert.ok(textures.every(s=>theme.includes(s)));
 const flora=defaultFlora(),trunk=addFloraAsset(flora,flora.branches[0].id,'flora-basic-trunk');
 addFloraAsset(flora,trunk.id,'flora-ginkgo-leaf',.85);
 addFloraAsset(flora,trunk.id,'flora-bent-twig',.6);
 const part=makePart('flora',{flora}),geometry=structuredClone({branches:flora.branches,organs:flora.organs}),leafColor=flora.colors.leaf;
 let originalLeafMap;
 for(const texture of textures){
  editMaterial(part,'bark',{preset:texture.id,color:'#ffffff',scale:.75});
  assert.deepEqual({branches:part.flora.branches,organs:part.flora.organs},geometry);assert.equal(part.flora.colors.leaf,leafColor);assert.equal(part.flora.finishes.leaf,undefined);
  const root=buildPart(part);
  try{let wood=0,leaves=0;root.traverse(mesh=>{
   if(!mesh.isMesh)return;
   if(mesh.userData.floraComponent==='bark'){
    wood++;assert.equal(mesh.material.map.userData.surfacePreset,texture.id);assert.equal(mesh.material.alphaTest,0);
    const exported=exportMaterial(mesh.material);assert.equal(exported.transparent,false);assert.equal(exported.width,128);assert.ok(exported.bytes.length>128*128*3);
   }else if(mesh.userData.floraComponent==='leaf'){
    leaves++;originalLeafMap??=mesh.material.map;assert.equal(mesh.material.map,originalLeafMap);
   }
  });assert.ok(wood>0&&leaves>0);
  }finally{disposePart(root);}
  const project={format:'open-building-studio',version:1,name:'Bark finish',parts:[part]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);
 }
});
