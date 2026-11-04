import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {setPatternMode,patternFactors,preparePatternScaling} from '../src/materials/pattern-scaling.js';
import {SURFACES} from '../src/materials/surfaces.js';
test('ramparts are primitives with interchangeable surface presets and no stone meshes',()=>{
 for(const type of ['jp-base','jp-stone-wall','jp-stone-corner'])for(const preset of ['plain','castle-stone','wood','marble']){
  const p=makePart(type,{surface:{preset,scale:1}}),m=buildPart(p);assert.equal(m.children.length,1);assert.equal(!!m.children[0].material.map,preset!=='plain');disposePart(m);
 }
 assert.ok(SURFACES.some(s=>s.id==='castle-stone'));const generic=buildPart(makePart('block',{surface:{preset:'castle-stone',scale:1}}));assert.ok(generic.children[0].material.map);disposePart(generic);
});
test('global scaling mode preserves current appearance and then fixes or stretches texture density',()=>{
 const p=makePart('jp-stone-wall',{scale:[4,2,1]}),before=patternFactors(p,'texture');setPatternMode(p,'fixed');assert.deepEqual(patternFactors(p,'texture'),before);
 p.scale[0]*=3;assert.equal(patternFactors(p,'texture')[0],before[0]*3);
 const now=patternFactors(p,'texture');setPatternMode(p,'stretch');assert.deepEqual(patternFactors(p,'texture'),now);p.scale[0]*=2;assert.deepEqual(patternFactors(p,'texture'),now);
});
test('preparing a project sets a consistent global mode without changing texture density',()=>{
 const p=makePart('jp-stone-wall',{scale:[3,2,1]}),before=patternFactors(p,'texture'),project={parts:[p]};preparePatternScaling(project);assert.equal(project.surfaceScaling,'fixed');assert.equal(p.pattern.mode,'fixed');assert.deepEqual(patternFactors(p,'texture'),before);
});
test('fixed UVs gain repeats on scaling while stretch UVs remain unchanged',()=>{
 for(const mode of ['fixed','stretch']){const p=makePart('block',{surface:{preset:'castle-stone',scale:1}});setPatternMode(p,mode);const a=buildPart(p);p.scale=[2,2,2];const b=buildPart(p),u=a.children[0].geometry.attributes.uv.array,v=b.children[0].geometry.attributes.uv.array;for(let i=0;i<u.length;i++)assert.ok(Math.abs(v[i]-u[i]*(mode==='fixed'?2:1))<1e-6);disposePart(a);disposePart(b);}
});
test('global preference and density survive saving and undo; plain stays plain on old ramparts',()=>{
 const p=makePart('jp-stone-wall',{surface:{preset:'plain',scale:1}}),project={format:'open-building-studio',version:1,name:'Mapping',parts:[p]},h=new History(project);project.surfaceScaling='fixed';setPatternMode(p,'fixed');h.push(project);assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);assert.equal(h.undo().surfaceScaling,undefined);assert.equal(h.redo().surfaceScaling,'fixed');assert.equal(validateProject(project).parts[0].surface.preset,'plain');
 project.parts[0].pattern.texture=[NaN,1,1];assert.throws(()=>validateProject(project));
});
