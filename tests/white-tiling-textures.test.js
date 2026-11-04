import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {WHITE_TILING_TEXTURES} from '../src/materials/white-tiling-textures.js';
import {SURFACES,surfacePixels,surfaceTexture,surfacesForTheme} from '../src/materials/surfaces.js';
import {TEXTURE_CATEGORIES,texturesForCategory} from '../src/materials/texture-categories.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportMaterial} from '../src/swbf2/swbf2-textures.js';

test('ten white variants appear in their own and their source setting categories',()=>{
 assert.equal(WHITE_TILING_TEXTURES.length,10);assert.equal(surfacesForTheme('Tintable whites').length,11);
 for(const s of WHITE_TILING_TEXTURES){
  assert.equal(SURFACES.filter(t=>t.id===s.id).length,1);assert.ok(texturesForCategory('white').some(t=>t.id===s.id));
  for(const category of TEXTURE_CATEGORIES.filter(c=>c.ids.has(s.sourceId)))assert.ok(category.ids.has(s.id),s.name+' in '+category.name);
  const p={format:'open-building-studio',version:1,name:'White material',parts:[makePart('block',{surface:{preset:s.id,scale:.5}})]};assert.deepEqual(validateProject(structuredClone(p)),p);
 }
});

test('white tiles retain contrast, remain neutral and repeat without amplified boundaries',()=>{
 for(const s of WHITE_TILING_TEXTURES){
  const original=surfacePixels(s.sourceId),before=original.slice(),p=surfacePixels(s.id),tones=[];let edgeX=0,edgeY=0,insideX=0,insideY=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const i=(y*128+x)*4;assert.equal(p[i],p[i+1]);assert.equal(p[i],p[i+2]);assert.equal(p[i+3],255);tones.push(p[i]);
   if(x===0)edgeX+=Math.abs(p[i]-p[i+127*4]);else insideX+=Math.abs(p[i]-p[i-4]);
   if(y===0)edgeY+=Math.abs(p[i]-p[i+127*128*4]);else insideY+=Math.abs(p[i]-p[i-128*4]);
  }
  tones.sort((a,b)=>a-b);assert.ok(tones[8192]>=210,s.name+' light midtones');assert.ok(tones[14745]-tones[1638]>=20,s.name+' retained relief');assert.ok(tones.at(-1)<=246);
  for(const [edge,inside] of [[edgeX,insideX],[edgeY,insideY]])assert.ok(edge/128/Math.max(2,inside/(128*127))<2.5,s.name+' repeat seam');
  assert.deepEqual(surfacePixels(s.sourceId),before,'original preserved');
  const texture=surfaceTexture(s.id);assert.equal(texture.wrapS,T.RepeatWrapping);assert.equal(texture.wrapT,T.RepeatWrapping);
  const large=surfacePixels(s.id,256);for(const [x,y] of [[0,0],[42,81],[127,127]])assert.equal(large[(y*2*256+x*2)*4],p[(y*128+x)*4]);
 }
});

test('white variants render and bake saturated tint while retaining texture shading',()=>{
 for(const s of WHITE_TILING_TEXTURES){
  const root=buildPart(makePart('block',{color:'#287ed4',surface:{preset:s.id,scale:.5}}));
  try{
   let material;root.traverse(mesh=>{if(mesh.isMesh&&mesh.material.map?.userData.surfacePreset===s.id)material=mesh.material;});assert.ok(material);
   const texture=exportMaterial(material),bytes=texture.bytes,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);assert.equal(view.getUint16(12,true),128);assert.equal(view.getUint16(14,true),128);assert.equal(texture.transparent,false);
   const blues=[],channels=bytes[16]/8;for(let i=18;i<bytes.length;i+=channels){assert.ok(bytes[i]>bytes[i+1]&&bytes[i+1]>bytes[i+2],'blue tint retains selected channel ordering');blues.push(bytes[i]);}
   assert.ok(Math.max(...blues)-Math.min(...blues)>30,'baked detail remains visible');assert.ok(Math.max(...blues)>180,'tint stays bright');
  }finally{disposePart(root);}
 }
});
