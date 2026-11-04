import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {editMaterial,materialTargets,readMaterial} from '../src/editor/material-editing.js';
import {highwayMaterialPart} from '../src/highways/highway-finishes.js';
import {surfacePixels,surfacesForTheme} from '../src/materials/surfaces.js';
import {selectSurface,surfaceHighlight,paintSurface} from '../src/editor/surface-selection.js';
const project=p=>({format:'open-building-studio',version:1,name:'Highway finishes',parts:[p]});
test('highway component materials render independently, batch, save, and undo',()=>{
 const p=makePart('highway',{position:[0,8,0]});p.highway.supports=true;
 assert.deepEqual(materialTargets(p).map(([key])=>key),['all','road','underside','barriers','supports']);
 const history=new History();history.push(project(p));
 for(const [key,color,preset] of [['road','#ffffff','highway-asphalt-yellow'],['underside','#112233','stone'],['barriers','#667788','metal'],['supports','#ccaa88','brick']])editMaterial(p,key,{color,preset,scale:1});
 history.push(project(p));assert.equal(history.undo().parts[0].highway.componentFinishes,undefined);
 const saved=validateProject(JSON.parse(JSON.stringify(project(p)))).parts[0];assert.deepEqual(saved,p);
 for(const batch of [false,true]){const g=buildPart(saved,{batch}),seen=new Set();g.traverse(m=>{if(!m.isMesh)return;const key=highwayMaterialPart(m);seen.add(key);const expected=readMaterial(saved,key);assert.equal(m.material.color.getHexString(),expected.color.slice(1));assert.equal(m.material.map.userData.surfacePreset,expected.preset);});assert.equal(seen.size,4);disposePart(g);}
 const before=readMaterial(p,'supports');editMaterial(p,'road',{color:'#dddddd'});assert.deepEqual(readMaterial(p,'supports'),before);
 const invalid=structuredClone(p);invalid.highway.componentFinishes.road.surface.preset='invalid';assert.throws(()=>validateProject(project(invalid)),/finish/);
});
test('clicking a curved highway selects its entire road material with an outline, not a blue slice',()=>{
 const p=makePart('highway');p.highway.width=4;p.highway.nodes=[{point:[0,0,0],tangent:[0,2,7]},{point:[12,4,20],tangent:[6,0,0]}];
 for(const batch of [false,true]){const g=buildPart(p,{batch});g.updateMatrixWorld(true);const hit=new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0)).intersectObject(g,true)[0],selected=selectSurface(hit,g);assert.equal(selected.face.highwayComponent,'road');
  const roadVertexCount=g.children.filter(m=>highwayMaterialPart(m)==='road').reduce((n,m)=>n+m.geometry.attributes.position.count,0);assert.equal(selected.geometry.attributes.position.count,roadVertexCount);
  const outline=surfaceHighlight(g,selected.face);assert.ok(outline.isLineSegments);paintSurface(p,selected.face,{preset:'highway-scifi-lanes'});assert.equal(readMaterial(p,'road').preset,'highway-scifi-lanes');assert.equal(p.faceFinishes,undefined);
  outline.geometry.dispose();outline.material.dispose();selected.geometry.dispose();disposePart(g);
 }
});
test('highway lane textures wrap along curves and keep one centre line across different widths',()=>{
 for(const width of [6,12]){const p=makePart('highway');p.highway.width=width;editMaterial(p,'road',{preset:'highway-asphalt-yellow',color:'#ffffff',scale:2});const g=buildPart(p),road=g.children.find(m=>highwayMaterialPart(m)==='road'),a=road.geometry.attributes;
  for(let i=0;i<a.uv.count;i++){assert.ok(Math.abs(a.uv.getX(i)-a.highwayRoadUV.getX(i))<1e-6);assert.ok(Math.abs(a.uv.getY(i)-a.highwayRoadUV.getY(i)/2)<1e-6);}assert.deepEqual([...new Set(a.uv.array.filter((_,i)=>i%2===0))].sort(),[0,1]);disposePart(g);
 }
 assert.equal(surfacesForTheme('Highway').length,3); // two textures plus Plain
 for(const id of ['highway-asphalt-yellow','highway-scifi-lanes']){const pixels=surfacePixels(id),at=x=>Array.from(pixels.slice((64*128+x)*4,(64*128+x)*4+3));const line=at(64),road=at(30);assert.notDeepEqual(line,road);assert.deepEqual(pixels,surfacePixels(id));}
});
