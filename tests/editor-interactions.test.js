import test from 'node:test';
import assert from 'node:assert/strict';
import {historyShortcut,editingText,numericTransform,bindPaletteSearch,matchesSearch,installEditorPopovers} from '../src/editor/editor-interactions.js';

test('search accepts reordered words, category names and native underscore labels',()=>{
 assert.equal(matchesSearch('fall aspen',['Aspen · Fall','Tree presets']),true);assert.equal(matchesSearch('tower round',['Round tower','Bodies']),true);assert.equal(matchesSearch('FE_leaf_20',['Willow Frond','FE_leaf_20']),true);assert.equal(matchesSearch('yavin leaves',['Yavin Broadleaf Canopy','Leaves']),true);assert.equal(matchesSearch('winter kapok',['Kapok · Mature Rainforest Tree']),false);
});

test('blank and invalid numeric edits cannot silently move an object to zero or flatten it',()=>{
 for(const value of ['',' ','NaN','Infinity','1001','-1001'])assert.equal(numericTransform(value,'position'),null);
 for(const value of ['0','-0','.049','-.049'])assert.equal(numericTransform(value,'scale'),null);
 assert.equal(numericTransform('0','position'),0);assert.equal(numericTransform('15.5','rotation'),15.5);assert.equal(numericTransform('-.5','scale'),-.5);assert.equal(numericTransform('1e2','position'),100);
 assert.equal(editingText({isContentEditable:true}),true);assert.equal(editingText({matches:()=>true}),true);assert.equal(editingText({matches:()=>false}),false);assert.equal(editingText(null),false);
});

test('palette search supports deliberate keyboard choice and does not place an ambiguous match',()=>{
 let listener,focused=null,clicks=0,blurs=0,clears=0;const card=id=>({focus:()=>focused=id,click:()=>clicks++}),input={value:'tree',addEventListener:(type,fn)=>listener=fn,blur:()=>blurs++,oninput:()=>clears++};let results=[card('first'),card('last')];bindPaletteSearch(input,()=>results);
 const press=(key,patch={})=>{let handled=false,stopped=false;listener({key,preventDefault:()=>handled=true,stopPropagation:()=>stopped=true,...patch});assert.equal(stopped,handled);return handled;};
 assert.equal(press('Enter'),true);assert.equal(focused,'first');assert.equal(clicks,0);press('ArrowUp');assert.equal(focused,'last');press('ArrowDown');assert.equal(focused,'first');
 results=[card('unique')];press('Enter');assert.equal(clicks,1);assert.equal(blurs,1);press('Escape');assert.equal(input.value,'');assert.equal(clears,1);press('Escape');assert.equal(blurs,2);
 assert.equal(press('Enter',{ctrlKey:true}),false);results=[];assert.equal(press('Enter'),false);assert.equal(press('ArrowDown'),false);
});

test('Escape closes the active popover before an editor and ignores menus behind a modal dialog',()=>{
 const listeners={},keys={},root={querySelectorAll:()=>menus,querySelector:()=>modal,addEventListener:(type,fn)=>listeners[type]=fn},events={addEventListener:(type,fn)=>keys[type]=fn};let focused,modal=null;
 const menu=id=>({id,open:false,visible:true,field:{},contains(target){return target===this.field;},getClientRects(){return this.visible?[{}]:[];},matches:()=>true,querySelector(){return {focus:()=>focused=id};}}),menus=[menu('view'),menu('placement')];installEditorPopovers(root,events);
 menus[0].open=true;menus[1].open=true;listeners.toggle({target:menus[1]});assert.equal(menus[0].open,false);assert.equal(menus[1].open,true);
 let prevented=false,stopped=false;keys.keydown({key:'Escape',preventDefault:()=>prevented=true,stopImmediatePropagation:()=>stopped=true});assert.equal(prevented,true);assert.equal(stopped,true);assert.equal(focused,'placement');assert.ok(menus.every(m=>!m.open));
 menus[0].open=true;modal={contains:()=>false};keys.keydown({key:'Escape',preventDefault(){throw Error('An underlying menu intercepted the modal.');},stopImmediatePropagation(){throw Error('An underlying menu intercepted the modal.');}});assert.equal(menus[0].open,true);
 modal=null;listeners.pointerdown({target:{}});assert.equal(menus[0].open,false);
});

test('history shortcuts work on discrete controls while text and numeric entry keep native Undo',()=>{
 const press=(key,target,patch={})=>historyShortcut({key,ctrlKey:true,target,...patch});
 for(const type of ['range','color','checkbox','radio','button']){const target={tagName:'INPUT',type};assert.equal(press('z',target),'undo');assert.equal(press('z',target,{shiftKey:true}),'redo');assert.equal(press('y',target),'redo');}
 for(const tagName of ['BUTTON','SELECT','CANVAS'])assert.equal(press('z',{tagName}),'undo');
 for(const type of ['text','search','number','email','url','password','tel','date'])assert.equal(press('z',{tagName:'INPUT',type}),null);
 assert.equal(press('z',{tagName:'TEXTAREA'}),null);assert.equal(press('z',{isContentEditable:true}),null);
 assert.equal(press('z',null,{ctrlKey:false,metaKey:true}),'undo');assert.equal(press('z',null,{ctrlKey:false}),null);assert.equal(press('z',null,{altKey:true}),null);assert.equal(press('d',null),null);
});
