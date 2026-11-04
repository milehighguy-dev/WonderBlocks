import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject,History} from '../src/core/model.js';
import {members,groupParts,ungroupParts,copyParts} from '../src/core/assemblies.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {Box3} from '../vendor/three.module.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Controls',parts});
test('object groups round trip, copy independently, and undo grouping',()=>{
 const parts=[makePart('doric'),makePart('temple-roof-complete')],ids=new Set(parts.map(p=>p.id)),h=new History(project(parts));
 groupParts(parts,ids);h.push(project(parts));assert.equal(members(parts,parts[0].id).length,2);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project(parts)))),project(parts));
 const copies=copyParts(parts,ids);assert.equal(copies[0].assemblyId,copies[1].assemblyId);assert.notEqual(copies[0].assemblyId,parts[0].assemblyId);
 copies[0].position[1]=42;assert.equal(parts[0].position[1],0);
 assert.equal(h.undo().parts[0].assemblyId,undefined);assert.ok(h.redo().parts[0].assemblyId);
 ungroupParts(parts,new Set([parts[0].id]));assert.ok(parts.every(p=>!p.assemblyId));
});
test('copy refuses a partial object group at the part limit',()=>{const parts=Array.from({length:499},()=>makePart('block'));assert.throws(()=>copyParts(parts,new Set(parts.slice(0,2).map(p=>p.id))));});
test('shape controls round trip and reject unsupported or out-of-range values',()=>{
 const p=makePart('temple-roof-half');p.parameters={roofPitch:42,roofThickness:.1};const data=project([p]);assert.deepEqual(validateProject(data),data);
 for(const parameters of [{roofPitch:56},{roofThickness:0},{fluteDepth:.1},{roofPitch:NaN},null]){p.parameters=parameters;assert.throws(()=>validateProject(data));}
});
test('roof pitch keeps matching pediments below roof and preserves footprint',()=>{
 for(const type of ['temple-roof-complete','temple-roof-half'])for(const pitch of [5,55]){
  const p=makePart(type);p.parameters={roofPitch:pitch,roofThickness:.15};const m=buildPart(p),box=new Box3().setFromObject(m),rise=Math.tan(pitch*Math.PI/180);
  assert.ok(Math.abs(box.max.y-rise-.15)<1e-6);assert.ok(Math.abs(box.max.x-1)<1e-6);
  for(const end of m.children.slice(1)){const a=end.geometry.attributes.position;for(let i=0;i<a.count;i++)assert.ok(a.getY(i)<=rise*(1-Math.abs(a.getX(i)))+1e-6);}
  disposePart(m);
 }
});
test('column fullness changes the shaft without moving base or capital',()=>{
 for(const type of ['doric','ionic-smooth','corinthian']){
  const p=makePart(type),a=buildPart(p);p.parameters={shaftFullness:.12};const b=buildPart(p);let changed=false;
  for(let i=0;i<a.children.length;i++){const x=a.children[i].geometry,y=b.children[i].geometry;if(a.children[i].name==='shaft'){changed=JSON.stringify([...x.attributes.position.array])!==JSON.stringify([...y.attributes.position.array]);}else assert.deepEqual(x.attributes.position.array,y.attributes.position.array);}
  assert.ok(changed);disposePart(a);disposePart(b);
 }
});
