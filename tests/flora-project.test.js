import {testStem} from './flora-fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {floraDraftSnapshot} from '../src/flora/flora-project.js';
import {defaultFlora,addFloraAsset} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
const project=parts=>({format:'open-building-studio',version:1,name:'Garden',parts});
test('saving a Flora draft adds or replaces it independently without changing the source',()=>{
 const existing=makePart('flora',{flora:testStem()}),edited=structuredClone(existing);
 edited.flora.branches[0].radii[0]=.8;
 const fresh=makePart('flora',{flora:defaultFlora()});
 addFloraAsset(fresh.flora,fresh.flora.branches[0].id,'flora-elbow-branch');
 for(const {label,source,draft,index} of [
  {label:'new plant',source:project([makePart('slab')]),draft:fresh,index:1},
  {label:'existing plant',source:project([existing]),draft:edited,index:0},
 ]){
  const beforeSource=structuredClone(source),beforeDraft=structuredClone(draft);
  const saved=floraDraftSnapshot(source,draft);validateProject(saved);
  assert.equal(saved.parts.length,index+1,label);
  assert.deepEqual(saved.parts[index],draft,label);
  saved.parts[index].flora.branches[0].radii[0]=1;
  assert.notEqual(draft.flora.branches[0].radii[0],1,label+' is independently cloned');
  assert.deepEqual(source,beforeSource,label+' leaves its scene unchanged');
  assert.deepEqual(draft,beforeDraft,label+' leaves its draft unchanged');
 }
});

test('empty Flora drafts are omitted or delete their existing plant; invalid drafts cannot save',()=>{
 const original=makePart('flora',{flora:testStem()});
 for(const existing of [false,true]){
  const source=project(existing?[original]:[]),before=structuredClone(source);
  const draft={...structuredClone(original),flora:defaultFlora()};
  assert.deepEqual(floraDraftSnapshot(source,draft),{...source,parts:[]});
  assert.deepEqual(source,before,'empty draft cannot mutate the original scene');
  draft.flora.branches[0].radii[0]=NaN;
  assert.throws(()=>floraDraftSnapshot(source,draft));
  assert.deepEqual(source,before,'invalid draft cannot mutate the original scene');
 }
});
