import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {createSWBF2Package,planSWBF2,SWBF2_EXPORT_DEFAULTS} from '../src/swbf2/export-swbf2.js';
const project=(name,parts)=>({format:'open-building-studio',version:1,name,parts});
const settings={output:'object',aiNavigation:false,shadows:false,lowDetail:false};
const textures=result=>new Map([...result.files].filter(([name])=>name.endsWith('.tga')||name.endsWith('.tga.option')));

test('default object names and matching option files overwrite the same paths after geometry and identity changes',()=>{
 assert.equal(SWBF2_EXPORT_DEFAULTS.uniqueAssetNames,false);
 const a=createSWBF2Package(project('Acorn Tower',[makePart('block')]),settings),b=createSWBF2Package(project('Acorn Tower',[makePart('block',{name:'Changed block',scale:[3,5,2]})]),settings);
 for(const result of [a,b]){
  assert.equal(result.manifest.asset.mesh,'msh/acorn_tower.msh');assert.equal(result.manifest.asset.odf,'odf/acorn_tower.odf');assert.ok(result.files.has('msh/acorn_tower.msh.option'));
  assert.match(result.files.get('odf/acorn_tower.odf'),/GeometryName = "acorn_tower.msh"/);assert.match(result.files.get('odf/acorn_tower.odf'),/GeometryName = "acorn_tower"/);
 }
 assert.notDeepEqual(a.files.get(a.manifest.asset.mesh),b.files.get(b.manifest.asset.mesh));
});

test('optional unique names distinguish different object identities and remain stable for the same object',()=>{
 const p=project('Same name',[makePart('block')]),a=createSWBF2Package(p,{...settings,uniqueAssetNames:true}),again=createSWBF2Package(p,{...settings,uniqueAssetNames:true}),other=createSWBF2Package(project('Same name',[makePart('block')]),{...settings,uniqueAssetNames:true});
 assert.match(a.manifest.asset.mesh,/^msh\/wb_.*_[a-f0-9]{8}\.msh$/);assert.equal(a.manifest.asset.mesh,again.manifest.asset.mesh);assert.notEqual(a.manifest.asset.mesh,other.manifest.asset.mesh);
 assert.ok(a.files.has(a.manifest.asset.mesh+'.option'));
 assert.throws(()=>planSWBF2(p,{uniqueAssetNames:'yes'}),/Invalid export option: uniqueAssetNames/);
});

test('plain helper mesh, ODF and option names remain stable when part IDs change',()=>{
 const make=()=>createSWBF2Package(project('Garden stairs',[makePart('stair-route')]),settings),a=make(),b=make();
 const paths=r=>[...r.files.keys()].filter(n=>n.endsWith('.msh')||n.endsWith('.odf')||n.endsWith('.msh.option')).sort();assert.deepEqual(paths(a),paths(b));assert.ok(a.manifest.asset.collisionHelpers.length>0);
 for(const name of a.manifest.asset.collisionHelpers){assert.match(name,/^garden_stairs_collision_\d+$/);assert.ok(a.files.has('msh/'+name+'.msh.option'));assert.ok(a.files.has('odf/'+name+'.odf'));assert.ok(a.files.get(a.manifest.asset.odf).includes('AttachOdf = "'+name+'"'));}
});

test('duplicate scene labels disambiguate without overwriting assets and survive reordering',()=>{
 const parts=[makePart('block',{name:'Wall'}),makePart('block',{name:'Wall',position:[4,0,0]}),makePart('block',{name:'Wall',position:[8,0,0]})],p=project('Courtyard',parts),a=planSWBF2(p),b=planSWBF2(project(p.name,[...parts].reverse()));
 assert.equal(new Set(a.assets.map(x=>x.name)).size,3);assert.ok(a.assets.every(x=>/^courtyard_wall_exterior(?:_\d+)?$/.test(x.name)));
 const names=r=>Object.fromEntries(r.assets.map(x=>[x.partIds[0],x.name]));assert.deepEqual(names(a),names(b));
 const reserved=createSWBF2Package(project('wb_leaf_anchor',[makePart('block')]),settings);assert.equal(reserved.manifest.asset.mesh,'msh/wb_leaf_anchor_2.msh');
});

test('mesh/ODF naming mode does not create new shared textures or texture option paths',()=>{
 const p=project('Painted block',[makePart('block',{color:'#287ed4',surface:{preset:'white-bf1-naboo-brick',scale:.5}})]),plain=createSWBF2Package(p,settings),unique=createSWBF2Package(p,{...settings,uniqueAssetNames:true});
 assert.deepEqual(textures(plain),textures(unique));assert.ok([...textures(plain).keys()].every(name=>name.includes('white_brickwork_blue')));
 for(const result of [plain,unique])for(const name of result.files.keys())if(name.endsWith('.option'))assert.ok(result.files.has(name.slice(0,-7)),'every option file matches its owning asset');
});

test('31-character collision names cannot alias their numbered scene siblings in the native loader',()=>{
 const label='West cliff section',name='RBC',parts=Array.from({length:16},(_,i)=>makePart('block',{name:label,position:[i*4,0,0]}));
 const a=planSWBF2(project(name,parts)),b=planSWBF2(project(name,[...parts].reverse()));
 const names=a.assets.map(a=>a.name);assert.equal(new Set(names).size,parts.length);
 assert.ok(names.every(n=>n.length<=31&&/^[a-z0-9_]+$/.test(n)));
 assert.deepEqual(Object.fromEntries(a.assets.map(a=>[a.partIds[0],a.name])),Object.fromEntries(b.assets.map(a=>[a.partIds[0],a.name])));
});

test('long single-asset names remain distinct and stable without object identity suffixes',()=>{
 const a='Ancient courtyard ceremonial entrance with blue stone',b='Ancient courtyard ceremonial entrance with green stone';
 const name=label=>planSWBF2(project(label,[makePart('block')]),settings).assets[0].name;
 assert.notEqual(name(a),name(b));assert.equal(name(a),name(a));assert.ok(name(a).length<=31);assert.ok(name(a).startsWith('ancient_courtyard'));
});

test('long parent and collision-helper names fit native lookup buffers in both naming modes',()=>{
 for(const uniqueAssetNames of [false,true]){
  const p=project('Ancient ceremonial courtyard entrance',[makePart('stair-route')]),result=createSWBF2Package(p,{...settings,uniqueAssetNames});
  assert.ok(result.manifest.assets.some(a=>a.role==='collision'));
  for(const asset of result.manifest.assets){assert.ok(asset.name.length<=31,asset.name);assert.ok(result.files.has('msh/'+asset.name+'.msh'));assert.ok(result.files.has('msh/'+asset.name+'.msh.option'));assert.ok(result.files.has('odf/'+asset.name+'.odf'));}
 }
});
