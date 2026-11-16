import test from 'node:test';
import assert from 'node:assert/strict';
import {SURFACES,surfacePixels} from '../src/materials/surfaces.js';
import {makePart,validateProject,mirrorPart,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
test('material pixels are deterministic and respect their declared opacity',()=>{
 for(const s of SURFACES){
  const a=surfacePixels(s.id,32);assert.deepEqual(a,surfacePixels(s.id,32));assert.equal(a.length,4096);
  const alpha=a.filter((v,i)=>i%4===3);
  if(s.id==='waterfall'||['mask','blend'].includes(s.alphaMode)){assert.ok(alpha.some(v=>v<255),s.name+' retains transparency');assert.ok(alpha.some(v=>v>128),s.name+' has visible pixels');}
  else for(const opacity of alpha)assert.equal(opacity,255,s.name);
 }
});
test('surface settings survive saving, mirroring and undo with strict validation',()=>{const project={format:'open-building-studio',version:1,name:'Materials',parts:[makePart('block',{surface:{preset:'marble',scale:2}})]};assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);assert.deepEqual(mirrorPart(project.parts[0]).surface,project.parts[0].surface);const h=new History(project);project.parts[0].surface.preset='brick';h.push(project);assert.equal(h.undo().parts[0].surface.preset,'marble');for(const surface of [null,{preset:'unknown',scale:1},{preset:'wood',scale:0},{preset:'metal',scale:Infinity},{preset:'brick',scale:9}]){project.parts[0].surface=surface;assert.throws(()=>validateProject(project));}});
test('textured deformed geometry has finite projected UVs and keeps fixed accent materials',()=>{for(const preset of SURFACES.filter(s=>s.id!=='plain')){const m=buildPart(makePart('chimney',{surface:{preset:preset.id,scale:2},shape:{twist:35,bulge:.3},scale:[3,2,-1]}));let textured=0,accent=0;m.traverse(o=>{if(!o.isMesh)return;if(o.material.map){textured++;const uv=o.geometry.attributes.uv;assert.equal(uv.count,o.geometry.attributes.position.count);for(const v of uv.array)assert.ok(Number.isFinite(v));}else accent++;});assert.ok(textured>0);assert.ok(accent>0);disposePart(m);}});
