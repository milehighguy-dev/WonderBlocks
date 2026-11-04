import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeNavigation,mergeLevelRequest,readNavigationFolder,parsePlanning,parseBarriers} from '../src/swbf2/swbf2-navigation-merge.js';
import {createSWBF2Package,createSWBF2PackageAsync} from '../src/swbf2/export-swbf2.js';
import {makePart} from '../src/core/model.js';
const hub=(name,p,r=.4,extra='')=>`Hub("${name}") { Pos(${p}); Radius(${r}); ${extra} }`;
const link=(name,a,b)=>`Connection("${name}") { Start("${a}"); End("${b}"); Flag(3); }`;
const bar=(name,x,z,flags=3)=>`Barrier("${name}") { Corner(${x-.1},0,${z-1}); Corner(${x+.1},0,${z-1}); Corner(${x+.1},0,${z+1}); Corner(${x-.1},0,${z+1}); Flag(${flags}); }`;
const prefix='w12345678';
const navigation=()=>({version:8,prefix,hubs:[{name:prefix+'_h0',position:[0,0,0],radius:.4,partIds:['part'],kind:'route'},{name:prefix+'_h1',position:[3,0,0],radius:.4,partIds:['part'],kind:'route'}],connections:[{name:prefix+'_c0',start:prefix+'_h0',end:prefix+'_h1',flags:3}],barriers:[{name:prefix+'_b0',corners:[[99.9,0,99],[100.1,0,99],[100.1,0,101],[99.9,0,101]],flags:3,surfaceHeight:10,kind:'wall'}],components:[{hubs:[prefix+'_h0',prefix+'_h1'],partIds:['part']}],stats:{},warnings:[]});
const source=()=>({worldName:'ABC',planningFilename:'ABC.pln',barrierFilename:'ABC.bar',planning:hub('OldA',[98,10,100],.4,'BranchWeight("OldB",25,"OldLink",1);')+'\n'+hub('OldB',[102,10,100])+'\n'+link('OldLink','OldA','OldB'),barriers:'BarrierCount(1);\n'+bar('OldBarrier',0,0),requests:[{filename:'ABC.req',text:'ucft\n{\n REQN { "model" "existing_model" }\n REQN { "world" "ABC" }\n}\n// trailing note\n'}]});

test('browser merge preserves authored names, fields and requests, protects old corridors, and repeats without duplication',()=>{
 const nav=navigation(),input=source(),before=JSON.stringify({nav,input}),result=mergeNavigation(nav,input);
 assert.ok(result.planning.includes(input.planning));assert.ok(result.barriers.includes('OldBarrier'));assert.ok(!result.barriers.includes(prefix+'_b0'));assert.match(result.barriers,/BarrierCount\(1\)/);
 assert.equal(result.navigation.hubs.length,4);assert.equal(result.navigation.connections.length,2);assert.equal(result.navigation.hubs.find(h=>h.name===prefix+'_h0').kind,'route');assert.deepEqual(result.navigation.hubs.find(h=>h.name===prefix+'_h0').partIds,['part']);
 assert.deepEqual(result.diagnostics.suppressedGeneratedBarriers,[prefix+'_b0']);assert.deepEqual(result.diagnostics.existingBarrierConflicts,['OldBarrier']);
 const req=result.requests[0].text;assert.ok(req.includes('"existing_model"'));assert.ok(req.includes('// trailing note'));assert.ok(req.indexOf('"congraph"')<req.indexOf('"world"'));
 const again=mergeNavigation(nav,{...input,planning:result.planning,barriers:result.barriers,requests:result.requests});assert.equal(again.planning,result.planning);assert.equal(again.barriers,result.barriers);assert.deepEqual(again.requests,result.requests);
 assert.equal(JSON.stringify({nav,input}),before,'selection is read-only');
});
test('merge preserves barrier unit masks and reports overlapping floors',()=>{
 const nav=navigation(),input=source();input.planning=hub('OldA',[0,10,0])+hub('OldB',[3,10,0])+link('OldLink','OldA','OldB');input.barriers='BarrierCount(1);'+bar('OldBarrier',0,0,4);
 const result=mergeNavigation(nav,input);assert.equal(result.diagnostics.existingBarrierConflicts.length,0);assert.ok(result.diagnostics.stackedHubPairs.length>0);assert.equal(result.navigation.barriers.find(b=>b.name==='OldBarrier').flags,4);
});
test('native reference, count and degree limits reject invalid merges before packaging',()=>{
 const input=source();input.planning=Array.from({length:255},(_,i)=>hub('h'+i,[i,0,80])).join('\n');assert.throws(()=>mergeNavigation(navigation(),input),/255/);
 input.planning=hub('center',[0,0,0])+Array.from({length:8},(_,i)=>hub('h'+i,[i,0,5])+link('c'+i,'center','h'+i)).join('\n');const nav=navigation();nav.connections.push({name:prefix+'_c1',start:'center',end:prefix+'_h0',flags:3});assert.throws(()=>mergeNavigation(nav,input),/eight connections/);
 for(const planning of [hub('OldA',[0,0,0])+link('bad','OldA','missing'),hub('OldA',[0,0,0])+hub('olda',[1,0,0]),hub('OldA',[0,0,0],.4,'BranchWeight("missing",1,"missing",1);')])assert.throws(()=>mergeNavigation(navigation(),{...source(),planning}),/missing|Duplicate/);
 assert.throws(()=>mergeNavigation(navigation(),{...source(),planningFilename:'../ABC.pln'}),/same existing world/);
});
test('native source syntax rejects comments and malformed scopes while preserving trailing request comments',()=>{
 for(const text of ['// no native comments','/* no block comments */',hub('valid',[0,0,0])+' garbage',hub('valid',[0,0,0])+'}', 'Hub("open") { Pos(0,0,0);'])assert.throws(()=>parsePlanning(text));
 for(const text of ['ucft { REQN { "world" "ABC" }','ucft {} REQN { "world" "ABC" }','ucft { REQN { REQN { "world" "ABC" } } }','ucft { // note\n REQN { "world" "ABC" }}','ucft { /* note */ REQN { "world" "ABC" }}'])assert.throws(()=>mergeLevelRequest(text,'ABC'));
 assert.equal(mergeLevelRequest('ucft { REQN { "world" "other" } }','ABC'),null);
 for(const graph of ['REQN { "congraph" "ABC" }','REQN { "congraph" "platform=ps2" "ABC" }']){const result=mergeLevelRequest('ucft { REQN { "world" "ABC" } '+graph+' }','ABC');assert.ok(result.indexOf('"congraph"')<result.indexOf('"world"'));assert.equal(mergeLevelRequest(result,'ABC'),result);if(graph.includes('ps2'))assert.ok(result.includes('"platform=ps2"'));}
 assert.equal(parseBarriers('BarrierCount(0);').length,0);
});
test('folder picker reads navigation sources only, selects multiple worlds, and retains original filenames',async()=>{
 const file=(path,text)=>({name:path.split('/').at(-1),webkitRelativePath:path,size:text.length,text:async()=>text});const input=source();
 const files=[file('world1/ABC.pln',input.planning),file('world1/ABC.bar',input.barriers),file('world1/ABC.req',input.requests[0].text),file('world1/Other.pln',hub('other',[50,0,50])),file('world1/wonderblocks-ai-backup_20261103/ABC.pln','broken backup must be ignored'),{name:'large.msh',text(){throw Error('Mesh must not be read');}}];
 const worlds=await readNavigationFolder(files);assert.equal(worlds.length,2);assert.equal(worlds[0].planningFilename,'ABC.pln');assert.equal(worlds[0].barrierFilename,'ABC.bar');assert.equal(worlds[0].requests[0].filename,'ABC.req');assert.equal(worlds[1].barriers,'');
 await assert.rejects(readNavigationFolder([]),/No .pln/);
});
test('merged scene ZIP retains existing world filenames and omits replacement world scaffold and merge script',async()=>{
 const part=makePart('platform',{position:[10,2,-20]});Object.assign(part.platform.sections[0],{width:2,depth:2,radius:0});part.platform.railing='none';
 const project={format:'open-building-studio',version:1,name:'My exported scene',parts:[part]},options={shadows:false,lowDetail:false},input=source(),original=JSON.stringify(input);
 const result=createSWBF2Package(project,options,{navigationMerge:input});
 for(const path of ['world1/ABC.pln','world1/ABC.bar','world1/ABC.req','world1/ABC_wonderblocks.lyr','source/ai-merge-report.json'])assert.ok(result.files.has(path),path);
 assert.ok(![...result.files.keys()].some(n=>/\.(wld|ldx)$/.test(n)));assert.equal(result.files.has('merge-ai-navigation.ps1'),false);assert.equal(result.files.has('world1/my_exported_scene.pln'),false);
 assert.equal(result.manifest.navigation.merged,true);assert.equal(result.manifest.navigation.planningFile,'world1/ABC.pln');assert.ok(result.files.get('world1/ABC.pln').includes('OldLink'));assert.match(result.files.get('README.txt'),/already combine existing navigation/);
 assert.deepEqual(new Set(result.manifest.files),new Set(result.files.keys()));assert.equal(JSON.stringify(input),original);
 const asyncResult=await createSWBF2PackageAsync(project,options,{navigationMerge:input});assert.deepEqual(result.zip,asyncResult.zip);
 const disabled=createSWBF2Package(project,{...options,aiNavigation:false},{navigationMerge:input});assert.equal(disabled.manifest.navigation,undefined);assert.ok(disabled.files.has('world1/my_exported_scene.wld'));assert.ok(![...disabled.files.keys()].some(n=>n.endsWith('.pln')));
});
