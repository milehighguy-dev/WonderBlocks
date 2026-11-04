import test from 'node:test';
import assert from 'node:assert/strict';
import {describeSelection,createEditingContext} from '../src/editor/editing-context.js';

test('selection descriptions distinguish objects, object groups, loose selections and empty scenes',()=>{
 assert.equal(describeSelection([]).name,'Nothing selected');
 assert.deepEqual(describeSelection([{name:'Kapok'}]),{name:'Kapok',detail:'Whole object selected'});
 assert.equal(describeSelection([{name:'Deck',assemblyId:'a',assemblyName:'Tree village'}]).detail,'Part of Tree village');
 const parts=[{name:'Deck',assemblyId:'a',assemblyName:'Tree village'},{name:'Hut',assemblyId:'a',assemblyName:'Tree village'}];
 assert.equal(describeSelection(parts).name,'Tree village');assert.match(describeSelection(parts).detail,/2 objects/);
 assert.equal(describeSelection([parts[0],{name:'Tree'}]).name,'2 objects selected');
});

test('context actions remain stable, use current callbacks and disappear outside their mode',()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};}append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attrs[k]=v;}}
 const previous=globalThis.document;globalThis.document={createElement:tag=>new El(tag)};
 try{const host=new El('div'),ui=createEditingContext(host),state={mode:'flora',label:'Flora edit mode',name:'Kapok',detail:'Fern Frond 3 · Whole part',hint:'Done keeps your edits'},button=key=>ui.panel.children[1].children.find(b=>b.attrs['data-context-action']===key);let saves=0,cancels=0;
  ui.update({...state,done:{label:'Done · Back to scene',action:()=>saves++},cancel:{label:'Cancel edits',action:()=>cancels++}});const done=button('done');assert.equal(ui.panel.children[0].attrs['aria-live'],'polite');assert.equal(ui.panel.dataset.mode,'flora');assert.equal(done.hidden,false);assert.equal(button('frame').hidden,true);button('cancel').onclick();assert.equal(saves,0);assert.equal(cancels,1);
  // Same visible state, a new editor session: no DOM replacement or stale closure.
  ui.update({...state,done:{label:'Done · Back to scene',action:()=>saves+=2},cancel:{label:'Cancel edits',action:()=>cancels++}});assert.equal(button('done'),done);done.onclick();assert.equal(saves,2);
  ui.update({mode:'object',label:'Object mode',...describeSelection([])});assert.equal(done.hidden,true);assert.equal(button('cancel').hidden,true);assert.equal(ui.panel.children[0].children[1].textContent,'Nothing selected');
  ui.update({...state,done:{label:'Done · Back to scene',disabled:true}});assert.equal(done.disabled,true);
 }finally{globalThis.document=previous;}
});
