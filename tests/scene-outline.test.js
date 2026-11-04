import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject,History} from '../src/core/model.js';
import {groupParts,ungroupParts,copyParts,assemblyLabel} from '../src/core/assemblies.js';
import {captureAssembly,instantiateAssembly} from '../src/core/library.js';
test('scene object group names survive saves, duplication and library placement; ungroup clears them',()=>{
 const parts=[makePart('block'),makePart('round')],ids=new Set(parts.map(p=>p.id));groupParts(parts,ids);parts.forEach(p=>p.assemblyName='West tower');
 const project={format:'open-building-studio',version:1,name:'Scene',parts},history=new History(project);
 const saved=validateProject(JSON.parse(JSON.stringify(project)));assert.equal(assemblyLabel(saved.parts),'West tower');
 const copies=copyParts(saved.parts,ids);assert.equal(assemblyLabel(copies),'West tower');assert.notEqual(copies[0].assemblyId,parts[0].assemblyId);
 const entry=captureAssembly('Tower kit',parts);assert.ok(entry.parts.every(p=>!p.assemblyName&&!p.assemblyId));const placed=instantiateAssembly(entry);assert.equal(assemblyLabel(placed),'Tower kit');
 ungroupParts(parts,ids);assert.ok(parts.every(p=>!p.assemblyName&&!p.assemblyId));history.push(project);assert.equal(assemblyLabel(history.undo().parts),'West tower');
 saved.parts[0].assemblyName='x'.repeat(81);assert.throws(()=>validateProject(saved));
});
test('existing scene object groups get descriptive names from a common building prefix',()=>{
 assert.equal(assemblyLabel([{name:'Archives • base'},{name:'Archives • roof'}]),'Archives');
 assert.equal(assemblyLabel([{name:'Block'},{name:'Roof'}]),'Block object group');
});
