import {testStem,testPlant,addTestBranch,addTestFoliage} from './flora-fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject,mirrorPart} from '../src/core/model.js';
import {defaultFlora,validateFlora,floraCurve,floraOrganPosition,removeFloraBranch} from '../src/flora/flora.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {geometryStats} from '../src/core/mesh-budget.js';
import {editMaterial,readMaterial,materialTargets} from '../src/editor/material-editing.js';
import {exportOBJ} from '../src/export/export.js';
const project=p=>({format:'open-building-studio',version:1,name:'Garden',parts:[p]});
test('new Flora objects are empty and legacy generated geometry is rejected',()=>{
 const p=makePart('flora');assert.equal(p.flora.detail,'swbf2');assert.equal(p.flora.branches.length,1);assert.equal(p.flora.branches[0].anchor,true);assert.deepEqual(p.flora.organs,[]);assert.deepEqual(Object.keys(p.flora.colors),['bark','leaf']);
 const mesh=buildPart(p);assert.equal(geometryStats(mesh).triangles,0);disposePart(mesh);
 const stem=testStem();delete stem.branches[0].profile;assert.throws(()=>validateFlora(stem));
 const plant=testPlant();delete plant.organs[0].asset;assert.throws(()=>validateFlora(plant));
});

test('saved plants retain their explicitly selected detail level',()=>{
 for(const detail of ['standard','low','swbf2']){const part=makePart('flora');part.flora.detail=detail;assert.equal(validateProject(JSON.parse(JSON.stringify(project(part)))).parts[0].flora.detail,detail);}
});
test('native palette plants round trip as independent editable scene objects',()=>{for(let i=0;i<3;i++){const p=makePart('flora',{flora:testPlant()});assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project(p)))),project(p));const q=mirrorPart(p);assert.notEqual(q.id,p.id);q.flora.branches[0].points[1][0]+=1;assert.notDeepEqual(q.flora,p.flora);}});
test('branches and foliage track parent edits through multiple generations',()=>{const f=testStem(),b=addTestBranch(f,f.branches[0].id,.5),child=addTestBranch(f,b.id,.5),o=addTestFoliage(f,child.id,.7),old=floraOrganPosition(f,o);for(const p of f.branches[0].points)p[0]+=2;assert.ok(floraOrganPosition(f,o).distanceTo(old.clone().add(new T.Vector3(2,0,0)))<1e-7);assert.ok(floraCurve(f,b.id).getPoint(0).distanceTo(floraCurve(f,f.branches[0].id).getPoint(.5))<1e-7);});
test('removing a branch removes its descendants and attached foliage but preserves siblings',()=>{const f=testStem(),root=f.branches[0].id,b=addTestBranch(f,root),child=addTestBranch(f,b.id),sibling=addTestBranch(f,root);addTestFoliage(f,b.id);addTestFoliage(f,child.id);addTestFoliage(f,sibling.id);assert.equal(removeFloraBranch(f,root),false);assert.equal(removeFloraBranch(f,b.id),true);assert.deepEqual(f.branches.map(b=>b.id),[root,sibling.id]);assert.equal(f.organs.length,1);validateFlora(f);});
test('reject invalid attachment graphs, nonfinite joints, collapsed curves and unsafe finishes',()=>{for(const mutate of [f=>f.branches[1].parent=f.branches[1].id,f=>f.branches[1].parent='missing',f=>f.branches[0].points[1][0]=NaN,f=>f.branches[0].points[1]=[...f.branches[0].points[0]],f=>f.branches[0].radii[1]=0,f=>f.organs[0].branch='missing',f=>f.organs[0].kind='unknown',f=>f.organs[0].scale[0]=0,f=>f.organs[0].id=f.organs[1].id,f=>f.colors.leaf='red',f=>f.finishes={bark:{preset:'unknown',scale:1}}]){const f=testPlant();mutate(f);assert.throws(()=>validateFlora(f));}});
test('plant geometry stays finite and low-detail reduces its triangle budget',()=>{const p=makePart('flora',{flora:testPlant()});for(const at of [.65,.8])addTestFoliage(p.flora,p.flora.branches[0].id,at);const high=buildPart(p,{batch:true});p.flora.detail='low';const low=buildPart(p,{batch:true});assert.ok(geometryStats(low).triangles<geometryStats(high).triangles);for(const m of [high,low]){assert.equal(new T.Box3().setFromObject(m).isEmpty(),false);m.traverse(o=>{if(o.isMesh)for(const key of ['position','normal','uv'])for(const v of o.geometry.attributes[key].array)assert.ok(Number.isFinite(v));});disposePart(m);}});
test('plant component colors and textures remain independent and survive export and batching',()=>{const p=makePart('flora',{flora:testPlant()});const leaf=p.flora.colors.leaf;assert.deepEqual(materialTargets(p).map(([key])=>key),['all','bark','leaf']);editMaterial(p,'bark',{color:'#895a39',preset:'wood',scale:2});assert.equal(p.flora.colors.leaf,leaf);assert.deepEqual(readMaterial(p,'bark'),{color:'#895a39',preset:'wood',scale:2});validateProject(project(p));const g=new T.Group();g.add(buildPart(p,{batch:true}));const obj=exportOBJ(g);assert.ok(obj.includes('\nf '));assert.ok(!/NaN|Infinity/.test(obj));disposePart(g);});
test('plant attachments batch to one mesh per finish without changing their world-space geometry',()=>{const p=makePart('flora',{flora:testPlant(),rotation:[.2,.4,.1],scale:[2,1,1.5]});const raw=buildPart(p),batched=buildPart(p,{batch:true}),a=new T.Box3().setFromObject(raw,true),b=new T.Box3().setFromObject(batched,true);assert.ok(a.min.distanceTo(b.min)<1e-5);assert.ok(a.max.distanceTo(b.max)<1e-5);assert.equal(geometryStats(raw).triangles,geometryStats(batched).triangles);assert.equal(geometryStats(batched).meshes,2);disposePart(raw);disposePart(batched);});
