import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject} from '../src/core/model.js';
import {editorDraftSnapshot} from '../src/editor/editor-project.js';
import {defaultFlora,addFloraAsset} from '../src/flora/flora.js';
import {floraDraftSnapshot} from '../src/flora/flora-project.js';
import {entranceFixture} from './fixtures/entrance-fixture.js';
import {connectedInteriorDraft} from '../src/interiors/connected-interior.js';
import {addStorey} from '../src/interiors/interior-storeys.js';
import {interiorRouteSeed} from '../src/interiors/interior-route.js';

const project=parts=>({format:'open-building-studio',version:1,name:'Draft snapshot',parts});

test('each scoped editor can save its draft without finishing or modifying the scene',()=>{
 for(const type of ['platform','highway','interior','metaballs','stair-route','wall-route']){
  const original=makePart(type),source=project([original]),draft=structuredClone(original);draft.name='Edited '+type;draft.position[0]=7;
  if(draft.interior)draft.interior.height=5;if(draft.platform)draft.platform.sections[0].width=12;if(draft.highway)draft.highway.width=11;
  const before=JSON.stringify(source),state=JSON.stringify(draft),saved=editorDraftSnapshot(source,{draft});assert.equal(saved.parts.length,1);assert.equal(saved.parts[0].name,draft.name);assert.equal(saved.parts[0].position[0],7);assert.equal(JSON.stringify(source),before);assert.equal(JSON.stringify(draft),state);assert.doesNotThrow(()=>validateProject(JSON.parse(JSON.stringify(saved))));saved.parts[0].position[0]=10;assert.equal(draft.position[0],7);
  const added=editorDraftSnapshot(project([]),{draft});assert.equal(added.parts[0].id,draft.id);
 }
});

test('unfinished placement is excluded, merged route context is retained, and invalid drafts are rejected',()=>{
 const body=makePart('block'),source=project([body]),route=makePart('stair-route');assert.deepEqual(editorDraftSnapshot(source,{draft:route,placed:false}),source);
 const changed=structuredClone(body);changed.position[1]=4;const saved=editorDraftSnapshot(source,{draft:route,contextParts:[changed]});assert.equal(saved.parts.length,2);assert.equal(saved.parts[0].position[1],4);assert.equal(body.position[1],0);
 route.position[0]=NaN;assert.throws(()=>editorDraftSnapshot(source,{draft:route}));assert.equal(source.parts.length,1);
});

test('the general editor delegates Flora saves with morphs and empty-plant deletion intact',()=>{
 const fern=makePart('flora'),organ=addFloraAsset(fern.flora,fern.flora.branches[0].id,'curled-fern-fiddlehead');
 organ.morphs={curl:.3,budding:.8};
 const source=project([fern]),before=structuredClone(source),saved=editorDraftSnapshot(source,{draft:fern});
 assert.deepEqual(saved.parts[0].flora.organs[0].morphs,organ.morphs);
 assert.deepEqual(saved,floraDraftSnapshot(source,fern));
 // Detailed add/replace/empty/invalid cases live in flora-project.test.js.
 const empty={...structuredClone(fern),flora:defaultFlora()};
 assert.deepEqual(editorDraftSnapshot(source,{draft:empty}),floraDraftSnapshot(source,empty));
 assert.deepEqual(source,before);
});

test('saving a connected room retains its exterior host instead of replacing it with the room draft',()=>{
 const host=entranceFixture().parts[0],source=project([host]),context=connectedInteriorDraft(host,host.entrances[0]),draft=structuredClone(context.part);draft.interior.height=4.5;const before=JSON.stringify(context),saved=editorDraftSnapshot(source,{draft,connected:context});
 assert.equal(saved.parts.length,1);assert.equal(saved.parts[0].type,host.type);assert.equal(saved.parts[0].name,host.name);assert.equal(saved.parts[0].entranceInteriors.find(s=>s.id===context.spaceId).plan.height,4.5);assert.equal(JSON.stringify(context),before);assert.equal(source.parts[0].entranceInteriors,undefined);
});

test('saving in the nested stairs editor writes its route into the parent interior',()=>{
 const parent=makePart('interior');parent.interior.height=3;parent.interior.rooms[0].w=parent.interior.rooms[0].d=12;parent.interior=addStorey(parent.interior);const source=project([parent]),draft=interiorRouteSeed(parent,'ground',{x:3,z:1});draft.route.segments=[{kind:'stairs',run:5,rise:3.2,steps:16,turn:'straight'}];const before=JSON.stringify(parent),saved=editorDraftSnapshot(source,{draft,interiorRoute:{draft:parent,from:'ground',stairId:'test-stairs'}});
 assert.equal(saved.parts.length,1);assert.equal(saved.parts[0].type,'interior');assert.deepEqual(saved.parts[0].interior.stairs[0].route,draft.route);assert.equal(saved.parts[0].interior.stairs[0].id,'test-stairs');assert.equal(JSON.stringify(parent),before);
});
