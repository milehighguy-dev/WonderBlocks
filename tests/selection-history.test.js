import test from 'node:test';
import assert from 'node:assert/strict';
import {History,makePart} from '../src/core/model.js';
import {copyParts} from '../src/core/assemblies.js';
import {SelectionMemory} from '../src/editor/selection-history.js';

test('Undo duplicate restores the original selection and Redo restores the copy',()=>{
 const original=makePart('block'),project={parts:[original]},history=new History(project),memory=new SelectionMemory();memory.remember(history.entries[0],new Set([original.id]),original.id);
 const copy=copyParts(project.parts,new Set([original.id]))[0];project.parts.push(copy);history.push(project);memory.remember(history.entries[history.index],new Set([copy.id]),copy.id);
 const before=history.undo(),selection=memory.restore(history.entries[history.index],before.parts);assert.deepEqual([...selection.ids],[original.id]);assert.equal(selection.primary,original.id);
 const after=history.redo();assert.equal(memory.restore(history.entries[history.index],after.parts).primary,copy.id);assert.equal(project.parts.length,2);
});

test('selection recovery skips hidden and removed objects and prunes discarded redo entries',()=>{
 const memory=new SelectionMemory(),parts=[{id:'a'},{id:'b'}];memory.remember('old',['a','b','removed'],'b');assert.deepEqual([...memory.restore('old',parts,new Set(['b'])).ids],['a']);assert.equal(memory.restore('old',parts,new Set(['b'])).primary,'a');memory.remember('discarded',['b'],'b');memory.retain(['old']);assert.equal(memory.entries.size,1);assert.equal(memory.restore('discarded',parts).primary,null);
});
