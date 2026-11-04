import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject,History} from '../src/core/model.js';
import {createInstanceCopies,detachEditedInstances} from '../src/core/instances.js';
import {copyParts} from '../src/core/assemblies.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';
import {writeMSH} from '../src/swbf2/swbf2-binary.js';
import {splitLeafAttachments} from '../src/swbf2/swbf2-instances.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Instances',parts});
test('instance families save, reload, undo and redo; poses preserve sharing and edits detach only the edited copy',()=>{
 const original=makePart('block'),p=project([original]),history=new History(p),copies=createInstanceCopies(p.parts,new Set([original.id]));p.parts.push(...copies);history.push(p);assert.equal(copies[0].instanceFamily,original.instanceFamily);assert.equal(copies[0].instanceCopy,true);assert.equal(original.instanceCopy,undefined);assert.equal(validateProject(p).parts[1].instanceCopy,true);assert.equal(history.undo().parts.length,1);assert.equal(history.redo().parts[1].instanceFamily,original.instanceFamily);
 const before=structuredClone(p.parts);copies[0].position=[10,5,-2];copies[0].rotation=[.2,.4,0];copies[0].name='Renamed';assert.deepEqual(detachEditedInstances(p.parts,before),[]);assert.equal(copies[0].instanceCopy,true);const moved=structuredClone(p.parts);copies[0].scale=[2,1,1];assert.deepEqual(detachEditedInstances(p.parts,moved),[copies[0].id]);assert.ok(original.instanceFamily);assert.equal(copies[0].instanceFamily,undefined);assert.equal(copies[0].instanceCopy,undefined);
 const ordinary=copyParts(p.parts,new Set([original.id]));assert.equal(ordinary[0].instanceFamily,undefined);assert.throws(()=>validateProject(project([{...original,instanceFamily:3}])),/instance/);
});
test('scene instances share MSH/ODF/option resources but have separate placements and bounds; changed copies export uniquely',()=>{
 const original=makePart('block'),parts=[original],copies=createInstanceCopies(parts,new Set([original.id]));parts.push(...copies);copies[0].position=[100,2,-30];copies[0].rotation=[0,.7,0];const settings={aiNavigation:false,shadows:false,lowDetail:false},shared=createSWBF2Package(project(parts),settings),main=shared.manifest.assets.filter(a=>a.role!=='collision');assert.equal(main.length,1);assert.equal(main[0].instanceCount,2);assert.equal(shared.manifest.objects,2);assert.equal([...shared.files.keys()].filter(p=>p.endsWith('.msh')).length,1);assert.equal([...shared.files.keys()].filter(p=>p.endsWith('.odf')).length,1);assert.ok(shared.manifest.worldBounds.max[0]>100);assert.equal((shared.files.get(shared.manifest.layerFile).match(/Object\(/g)||[]).length,2);
 const remaining=createSWBF2Package(project([copies[0]]),settings);assert.equal(remaining.manifest.assets[0].name,main[0].name,'deleting the original preserves the shared resource name');
 const before=structuredClone(parts);copies[0].color='#ff0000';detachEditedInstances(parts,before);const unique=createSWBF2Package(project(parts),settings);assert.equal(unique.manifest.assets.filter(a=>a.role!=='collision').length,2);assert.equal(unique.manifest.objects,2);
});
test('trees in one editor group export independently; identical trees share resources even with remapped organ IDs',()=>{
 const a=makePart('flora',{...instantiateFloraTreePreset('endor-woodland-tree'),assemblyId:'forest',assemblyName:'Forest'}),b=makePart('flora',{...instantiateFloraTreePreset('endor-woodland-tree'),assemblyId:'forest',assemblyName:'Forest',position:[30,0,-20],rotation:[0,.7,0]}),c=structuredClone(b);c.id=crypto.randomUUID();c.name='Different tree';c.scale=[1.2,1.2,1.2];c.position=[50,0,10];const p=project([a,b,c]),before=JSON.stringify(p),plan=planSWBF2(p,{aiNavigation:false,shadows:false,lowDetail:false});assert.equal(plan.assets.length,2);assert.ok(plan.assets.some(asset=>asset.instances?.length===2));assert.ok(plan.assets.every(asset=>asset.label!=='Forest'));assert.equal(JSON.stringify(p),before);
});
test('attachment limits include the root and overflow retains every leaf patch without geometry loss',()=>{
 const models=[{name:'root'},...Array.from({length:63},(_,i)=>({name:'hp_'+i,parent:'root'}))];assert.ok(writeMSH({name:'boundary',models}));assert.throws(()=>writeMSH({name:'overflow',models:[...models,{name:'hp_64',parent:'root'}]}),/64 bones/);
 const asset={key:'tree',label:'Tree',leaves:Array.from({length:130},(_,i)=>({i})),segments:[{test:true}],bodies:[],primitives:[]},split=splitLeafAttachments([asset]);assert.deepEqual(split.map(a=>a.leaves.length),[63,63,4]);assert.equal(split[0].segments,asset.segments);assert.equal(split.flatMap(a=>a.leaves).length,130);assert.equal(asset.leaves.length,130);
});
