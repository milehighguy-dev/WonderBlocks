import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {materialTargets,readMaterial,editMaterial} from '../src/editor/material-editing.js';
import {PLATFORM_MATERIAL_PARTS,platformMaterialPart} from '../src/platforms/platform-finishes.js';
import {kashyyykPlatformDefaults} from '../src/platforms/kashyyyk-platforms.js';
import {selectSurface,paintSurface,surfaceHighlight,sameSurface} from '../src/editor/surface-selection.js';
const project=p=>({format:'open-building-studio',version:1,name:'Platform materials',parts:[p]});
const platform=(style,kind='circle')=>{
 const p=makePart('platform',{position:[0,25,0],color:'#ffffff'});
 if(style.startsWith('kashyyyk-'))Object.assign(p.platform,kashyyykPlatformDefaults(style,24));
 p.platform.style=style;p.platform.supports=true;p.platform.railing='posts';Object.assign(p.platform.sections[0],{kind,width:24,depth:kind==='half-circle'?12:24});return p;
};
const styles=['plain','bespin','kashyyyk-timber','kashyyyk-thatched'];
const snapshot=g=>{const result={};g.traverse(m=>{if(!m.isMesh)return;const k=platformMaterialPart(m);(result[k]??=[]).push({color:m.material.color.getHexString(),map:m.material.map?.uuid,alpha:m.material.alphaTest,collision:m.material.userData.walkCollision,uv:m.geometry.attributes.uv?Array.from(m.geometry.attributes.uv.array):null});});return result;};
test('all platform styles and shapes paint top, base, pillars and railings independently, including after batching',()=>{
 for(const style of styles)for(const kind of ['circle','rectangle','half-circle']){
  const p=platform(style,kind),original=buildPart(p),before=snapshot(original);disposePart(original);
  assert.deepEqual(materialTargets(p).map(([k])=>k),['all',...Object.keys(PLATFORM_MATERIAL_PARTS)]);
  editMaterial(p,'top',{color:'#ff0000'});const tint=buildPart(p),after=snapshot(tint);disposePart(tint);
  for(const key of ['base','pillars','railings'])assert.deepEqual(after[key],before[key]);
  for(let i=0;i<after.top.length;i++){assert.equal(after.top[i].color,'ff0000');assert.equal(after.top[i].map,before.top[i].map);assert.deepEqual(after.top[i].uv,before.top[i].uv);assert.equal(after.top[i].collision,before.top[i].collision);}
  editMaterial(p,'top',{preset:'wood',scale:.5});editMaterial(p,'base',{color:'#00ff00',preset:'brick',scale:2});editMaterial(p,'pillars',{color:'#0000ff',preset:'metal',scale:1.5});editMaterial(p,'railings',{color:'#111111',preset:'stone',scale:.8});
  for(const batch of [false,true]){const g=buildPart(p,{batch}),seen=new Set();try{g.traverse(m=>{if(!m.isMesh)return;const key=platformMaterialPart(m),expected=readMaterial(p,key);seen.add(key);assert.equal(m.material.color.getHexString(),expected.color.slice(1));assert.equal(m.material.map.userData.surfacePreset,expected.preset);assert.equal(m.material.userData.surfaceScale,expected.scale);});assert.equal(seen.size,4);}finally{disposePart(g);}}
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project(p)))).parts[0],p);
 }
});
test('actual platform hits select whole components with a visible outline instead of one mesh facet',()=>{
 for(const style of styles)for(const batch of [false,true]){
  const p=platform(style),g=buildPart(p,{batch});g.updateMatrixWorld(true);
  try{for(const [key,origin,direction] of [['top',[0,50,0],[0,-1,0]],['base',[50,25-p.platform.thickness*.6,0],[-1,0,0]],['pillars',[0,5,-50],[0,0,1]]]){
   const hit=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction)).intersectObject(g,true)[0];assert.ok(hit);const chosen=selectSurface(hit,g);assert.equal(chosen.face.platformComponent,key);
   let count=0;g.traverse(m=>{if(m.isMesh&&platformMaterialPart(m)===key)count+=m.geometry.index?.count??m.geometry.attributes.position.count;});assert.equal(chosen.geometry.attributes.position.count,count);
   assert.ok(!materialTargets(p,{face:chosen.face}).some(([k])=>k==='face'));const outline=surfaceHighlight(g,chosen.face);assert.ok(outline.isLineSegments);assert.ok(outline.geometry.attributes.position.count>0);
   paintSurface(p,chosen.face,{color:'#123456'});assert.equal(readMaterial(p,key).color,'#123456');assert.equal(p.faceFinishes,undefined);assert.ok(!sameSurface(chosen.face,{highwayComponent:'road'}));
   chosen.geometry.dispose();outline.geometry.dispose();outline.material.dispose();
  }}finally{disposePart(g);}
 }
});
test('platform component finishes undo, validate and persist through support visibility changes',()=>{
 const p=platform('kashyyyk-thatched'),h=new History();h.push(project(p));editMaterial(p,'pillars',{color:'#345678',preset:'metal',scale:2});h.push(project(p));assert.equal(h.undo().parts[0].platform.componentFinishes,undefined);
 p.platform.supports=false;const hidden=buildPart(p);assert.ok(!snapshot(hidden).pillars);disposePart(hidden);p.platform.supports=true;const shown=buildPart(p);assert.equal(snapshot(shown).pillars[0].color,'345678');disposePart(shown);
 for(const value of [{unknown:{color:'#ffffff'}},{top:{color:'bad'}},{base:{surface:{preset:'wrong',scale:1}}},{pillars:{surface:{preset:'wood',scale:0}}}]){const invalid=structuredClone(p);invalid.platform.componentFinishes=value;assert.throws(()=>validateProject(project(invalid)),/finish/);}
});

test('material controls reflect generated base textures and Bespin rims remain independently paintable',()=>{
 const p=platform('kashyyyk-thatched','rectangle');assert.equal(readMaterial(p,'base').preset,'forest-timber');
 p.surface={preset:'wood',scale:2};assert.equal(readMaterial(p,'railings').preset,'plain');assert.equal(readMaterial(p,'base').preset,'wood');
 const b=platform('bespin');b.platform.railing='bespin';const original=buildPart(b),before=snapshot(original);disposePart(original);
 editMaterial(b,'railings',{color:'#aabbcc',preset:'metal',scale:2});const changed=buildPart(b,{batch:true});try{const after=snapshot(changed);assert.equal(after.railings[0].color,'aabbcc');for(const key of ['top','base','pillars'])assert.equal(after[key][0].color,before[key][0].color);}finally{disposePart(changed);}
});
