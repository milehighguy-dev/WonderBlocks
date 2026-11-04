import test from 'node:test';import assert from 'node:assert/strict';
import {stairClearanceFixture} from './fixtures/stair-clearance-fixture.js';import {validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';import {geometryStats} from '../src/core/mesh-budget.js';
import {routeLayout} from '../src/routes/stair-route.js';import {Group,Vector3,Raycaster} from '../vendor/three.module.js';import {exportOBJ} from '../src/export/export.js';
function build(){const project=stairClearanceFixture(),root=new Group(),meshes=new Map();for(const p of project.parts){const m=buildPart(p,{batch:true});root.add(m);meshes.set(p.id,m);}root.updateMatrixWorld(true);return {project,root,meshes};}
test('interior stair hall is editable, round trips, and stays under the scene budget',()=>{const {project,root}=build();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);assert.equal(project.parts.filter(p=>p.interior).length,3);assert.equal(project.parts.filter(p=>p.route).length,2);assert.ok(geometryStats(root).triangles<10000);assert.ok(!/NaN|Infinity/.test(exportOBJ(root)));disposePart(root);});
test('grand stair arrives exactly at the upper floor and has two metres of headroom throughout',()=>{
 const {project,root,meshes}=build(),stair=project.parts.find(p=>p.name.startsWith('Grand stair')),m=meshes.get(stair.id),layout=routeLayout(stair.route),end=new Vector3(...layout.at(-1).end).applyMatrix4(m.matrixWorld);assert.ok(end.distanceTo(new Vector3(0,3.8,-3))<1e-6);
 const other=root.children.filter(o=>o!==m);for(const l of layout)for(let i=0;i<l.segment.steps;i++)for(const x of [-.8,0,.8]){
  const t=(i+.5)/l.segment.steps,rise=l.segment.kind==='stairs'?(i+1)*l.segment.rise/l.segment.steps:0,pt=new Vector3(l.start[0]+x,l.start[1]+rise+.04,l.start[2]+l.segment.run*t).applyMatrix4(m.matrixWorld);
  assert.equal(new Raycaster(pt,new Vector3(0,1,0),0,2).intersectObjects(other,true).length,0,`Headroom at ${pt.toArray()}`);
 }disposePart(root);
});
test('front entrance, upper lobby and both gallery doorways are open in enclosed geometry',()=>{
 const {root}=build();for(const [from,to] of [[[0,1.3,8.5],[0,1.3,6]],[[0,4.8,-2],[0,4.8,-4.5]],[[-1,4.8,-4.5],[-6,4.8,-4.5]],[[1,4.8,-4.5],[6,4.8,-4.5]],[[-5,1.4,-2],[-5,1.4,-4.5]],[[5,1.4,-2],[5,1.4,-4.5]]]){const a=new Vector3(...from),delta=new Vector3(...to).sub(a);assert.equal(new Raycaster(a,delta.clone().normalize(),0,delta.length()).intersectObject(root,true).length,0,`${from} → ${to}`);}disposePart(root);
});
