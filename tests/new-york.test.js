import test from 'node:test';
import assert from 'node:assert/strict';
import {NEW_YORK_PARTS} from '../src/parts/new-york.js';
import {newYorkBlock} from '../examples/generators/new-york-demo.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {Group,Box3} from '../vendor/three.module.js';
import {exportOBJ} from '../src/export/export.js';
import {SURFACES,SURFACE_THEMES,surfacesForTheme} from '../src/materials/surfaces.js';
import {captureAssembly,instantiateAssembly} from '../src/core/library.js';

test('texture themes include Plain and share applicable materials without duplicating presets',()=>{
 for(const theme of SURFACE_THEMES){const presets=surfacesForTheme(theme);assert.ok(presets.some(s=>s.id==='plain'));assert.equal(new Set(presets.map(s=>s.id)).size,presets.length);}
 assert.ok(surfacesForTheme('New York').some(s=>s.id==='ny-deco'));
 assert.ok(!surfacesForTheme('Classical').some(s=>s.id==='ny-deco'));
 assert.ok(surfacesForTheme('Medieval Japan').some(s=>s.id==='castle-stone'));
 assert.equal(surfacesForTheme('All').length,SURFACES.length);
});
test('new rooftop silhouettes seat at zero and remain under 200 triangles',()=>{
 for(const def of NEW_YORK_PARTS.slice(0,8)){const g=buildPart(makePart(def.id),{batch:true}),b=new Box3().setFromObject(g);assert.ok(Math.abs(b.min.y)<1e-6,def.id);assert.ok(b.max.y>.5);assert.ok(geometryStats(g).triangles<=200);disposePart(g);}
});

test('New York collection has finite geometry and reusable independent parts',()=>{
 assert.equal(NEW_YORK_PARTS.length,20);assert.equal(new Set(NEW_YORK_PARTS.map(p=>p.id)).size,20);
 for(const def of NEW_YORK_PARTS){const p=makePart(def.id),g=buildPart(p,{batch:true}),s=geometryStats(g);assert.ok(s.triangles>0&&s.triangles<=500,def.id);g.traverse(m=>{if(m.isMesh)for(const a of Object.values(m.geometry.attributes))for(const v of a.array)assert.ok(Number.isFinite(v));});disposePart(g);}
});

test('city facade styles apply to generic cubes; redundant parts are removed',()=>{
 const legacy=['ny-deco','ny-brick','ny-glass','ny-setback','ny-storefront','ny-sidewalk','ny-road'];
 for(const id of legacy)assert.ok(!NEW_YORK_PARTS.some(p=>p.id===id));
 const scene=newYorkBlock();assert.ok(scene.parts.every(p=>!legacy.includes(p.type)));
 for(const preset of ['ny-deco','ny-brick','ny-glass','ny-storefront']){
  assert.ok(SURFACES.some(s=>s.id===preset));const p=makePart('block',{scale:[4,8,3],surface:{preset,scale:2}}),g=buildPart(p);
  assert.equal(geometryStats(g).triangles,12);assert.ok(g.children[0].material.map);disposePart(g);
 }
});
test('Empire State block saves, exports and stays below 10k triangles',()=>{
 const p=newYorkBlock();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);assert.ok(p.parts.length<500);
 const scene=new Group();let total=0,landmark=0;for(const part of p.parts){const g=buildPart(part,{batch:true}),n=geometryStats(g).triangles;total+=n;if(part.name.startsWith('Empire State'))landmark+=n;scene.add(g);}
 assert.ok(total<=10000);assert.ok(landmark<=3000);const obj=exportOBJ(scene);assert.ok(obj.includes('\nf '));assert.ok(!/NaN|Infinity/.test(obj));
 const assembly=captureAssembly('Empire State',p.parts.filter(p=>p.name.startsWith('Empire State')));assert.equal(instantiateAssembly(assembly).length,assembly.parts.length);disposePart(scene);
});
test('Empire State main stack joins at each setback and has a continuous mast',()=>{
 const p=newYorkBlock();const names=['Retail podium','Lower setback','Middle shoulders','Tower shaft','Upper setback','Executive floors','Observatory','mooring mast','antenna'];let prior;
 for(const name of names){const part=p.parts.find(p=>p.name==='Empire State • '+name),g=buildPart(part),b=new Box3().setFromObject(g);if(prior){assert.ok(b.min.y<=prior.max.y+.001,name);assert.ok(b.min.y>=prior.max.y-.05,name);}prior=b;disposePart(g);}
});
