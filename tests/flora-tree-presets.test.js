import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {FLORA_TREE_PRESETS,instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {FLORA_ASSETS,floraAsset,floraPaletteCategory,floraPlacementCategory,floraIconUrl} from '../src/flora/flora-palette.js';
import {validateFlora,floraCurve,floraOrganPosition} from '../src/flora/flora.js';
import {exportOBJ} from '../src/export/export.js';
import {swbfTreesDemo} from '../examples/generators/swbf-trees-demo.js';

test('saved plants have their own palette group and no distant tree is offered',()=>{
 assert.equal(FLORA_TREE_PRESETS.filter(p=>!p.planet).length,6);assert.equal(floraAsset('yavin-tree-billboard'),undefined);
 for(const preset of FLORA_TREE_PRESETS){assert.equal(floraPaletteCategory(preset),'Tree presets');assert.equal(floraPlacementCategory(preset),'Whole plants');assert.ok(FLORA_ASSETS.includes(preset));assert.ok(fs.existsSync(new URL(floraIconUrl(preset))));}
 for(const preset of FLORA_TREE_PRESETS){assert.equal(preset.floraPreset.detail,'swbf2',preset.name);assert.equal(instantiateFloraTreePreset(preset.id).flora.detail,'swbf2',preset.name);}
 assert.equal(swbfTreesDemo().parts.length,6);
});
test('tree copies are independent and remap all branch and foliage attachments',()=>{
 for(const preset of FLORA_TREE_PRESETS){const a=instantiateFloraTreePreset(preset.id),b=instantiateFloraTreePreset(preset.id);validateFlora(a.flora);validateFlora(b.flora);const ids=new Set(a.flora.branches.map(n=>n.id).concat(a.flora.organs.map(n=>n.id)));assert.ok(b.flora.branches.concat(b.flora.organs).every(n=>!ids.has(n.id)));for(const node of a.flora.branches.concat(a.flora.organs))for(const key of ['parent','branch','parentOrgan'])if(node[key])assert.ok(ids.has(node[key]));a.flora.branches[0].points[1][0]+=1;if(a.flora.organs.length){a.flora.organs[0].scale[0]=2;assert.deepEqual(b.flora.organs[0].scale,preset.floraPreset.organs[0].scale);}else assert.equal(b.flora.organs.length,0);assert.notDeepEqual(a.flora,b.flora);}
 assert.throws(()=>instantiateFloraTreePreset('missing'));
});

test('the palm is an editable existing-part tree whose crown follows its curved trunk tip',()=>{
 const {flora}=instantiateFloraTreePreset('palm-tree'),trunk=flora.branches.find(b=>!b.parent);
 assert.equal(trunk.profile,'flora-basic-branch');assert.ok(trunk.points.length>3);assert.ok(trunk.points.at(-1)[0]>.8,'trunk has a visible natural lean');
 assert.ok(flora.organs.some(o=>o.asset==='flora-palm-whorl'));assert.ok(flora.organs.some(o=>o.asset==='flora-palm-canopy'));
 const checkCrown=()=>{const tip=floraCurve(flora,trunk.id).getPoint(1);for(const frond of flora.organs)assert.ok(floraOrganPosition(flora,frond).distanceTo(tip)<1e-7,'frond bases meet the trunk tip');};
 checkCrown();trunk.points.at(-1)[0]+=.6;trunk.points.at(-1)[1]+=.8;checkCrown();validateFlora(flora);
 const p=makePart('flora',{flora}),project={format:'open-building-studio',version:1,name:'Palm fixture',parts:[p]},saved=validateProject(JSON.parse(JSON.stringify(project)));assert.deepEqual(saved,project);
 const group=buildPart(saved.parts[0],{collision:false});try{
  const size=new T.Box3().setFromObject(group).getSize(new T.Vector3());assert.ok(size.y>8&&size.x>4&&size.z>4,'palm retains a tall stem and spreading three-dimensional crown');
  let triangles=0,draws=0;group.traverse(m=>{if(m.isMesh){triangles+=m.geometry.index.count/3;draws++;}});assert.ok(triangles<1000&&draws<=4,'a tree stays inexpensive to repeat');assert.ok(!/NaN|Infinity/.test(exportOBJ(group)));
 }finally{disposePart(group);}
});

test('Endor trees have distinct editable shapes and native needle / leaf cutouts',()=>{
 const redwood=instantiateFloraTreePreset('endor-forest-redwood').flora,woodland=instantiateFloraTreePreset('endor-woodland-tree').flora;
 assert.ok(redwood.branches[0].points.at(-1)[1]>35);assert.ok(woodland.branches[0].points.at(-1)[1]<20);assert.ok(redwood.branches.length<=24);assert.ok(redwood.organs.every(o=>o.asset==='endor-redwood-foliage'&&!o.billboard));assert.ok(woodland.organs.every(o=>o.asset==='endor-leaves'&&o.billboard.atlas===2&&o.billboard.count===20));
});


test('source-sized canopies and Felucia plants retain their world dimensions through save/load',()=>{
 for(const preset of FLORA_TREE_PRESETS.filter(p=>!p.planet))for(const organ of preset.floraPreset.organs)if(organ.billboard)assert.ok(organ.scale.every(s=>s>=.7&&s<1),'Leafpatch instances must include the game’s smaller scale variation');
 const bounds=id=>{const part=makePart('flora',instantiateFloraTreePreset(id)),saved=validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Scale check',parts:[part]})));const group=buildPart(saved.parts[0]),box=new T.Box3().setFromObject(group);assert.deepEqual(saved.parts[0].flora,part.flora);disposePart(group);return box;};
 const broad=bounds('yavin-temple-broadleaf'),slender=bounds('yavin-slender-grove');
 assert.ok(broad.getSize(new T.Vector3()).x<35&&broad.max.y<29,'Yavin Broadleaf must not return to the oversized 39-metre canopy');
 assert.ok(slender.getSize(new T.Vector3()).x<22,'Yavin Fineleaf must not return to the oversized 27-metre canopy');
 assert.ok(Math.abs(bounds('felucia-inflated-pod-plant').max.y-5.254)<.02,'Bladder Pair matches the native bladder model’s above-ground height');
 assert.ok(Math.abs(bounds('felucia-scarlet-bloom-plant').max.y-4.859)<.02,'Scarlet Bloom matches the native red bush’s above-ground height');
 assert.ok(bounds('endor-forest-redwood').max.y>39,'The tall Endor redwood retains its source height');
});
