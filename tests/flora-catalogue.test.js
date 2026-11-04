import {testStem} from './flora-fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inflateSync} from 'node:zlib';
import {PROCEDURAL_FLORA,FLORA_ASSETS,FLORA_PALETTE_ASSETS,floraPlacementCategory,floraPaletteCategory,createFloraPalette,floraIconUrl,FLORA_DRAG_TYPE} from '../src/flora/flora-palette.js';
import {BARK_BRANCH_PARTS} from '../src/flora/bark-branches.js';
import {MODELED_LEAF_PARTS} from '../src/flora/modeled-leaves.js';
import {BF2_FLORA_FORMS} from '../src/flora/data/bf2-flora-forms.js';
import {addFloraAsset,defaultFlora,validateFlora} from '../src/flora/flora.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';

test('Coral Leaf belongs to Coral and has a red finish; removed leaf pieces are absent',()=>{
 const coral=FLORA_ASSETS.find(a=>a.id==='flora-coral-leaf');assert.equal(floraPaletteCategory(coral),'Coral');
 const pixels=coral.textureMap().image.data;let red=0,green=0,blue=0;
 for(let i=0;i<pixels.length;i+=4){red+=pixels[i];green+=pixels[i+1];blue+=pixels[i+2];}
 assert.ok(red>green*3&&red>blue*3,'red is in the asset texture, independent of the plant tint');
 for(const id of ['flora-oak-leaf','flora-oval-leaf','flora-curled-leaf','flora-lance-leaf']){
  assert.ok(!FLORA_ASSETS.some(a=>a.id===id));assert.ok(!fs.existsSync(new URL('../assets/procedural-flora/'+id+'.png',import.meta.url)));
 }
});
test('removed trunks and Leafy Fork are absent from catalogue, source forms and previews',()=>{
 for(const id of ['flora-leafy-fork','flora-split-trunk','flora-smooth-trunk','flora-knotted-trunk']){
  for(const catalogue of [PROCEDURAL_FLORA,FLORA_ASSETS,FLORA_PALETTE_ASSETS])assert.ok(!catalogue.some(part=>part.id===id));
  assert.equal(Object.hasOwn(BF2_FLORA_FORMS,id),false);assert.equal(fs.existsSync(new URL('../assets/procedural-flora/'+id+'.png',import.meta.url)),false);
 }
});

test('all botanical parts have generated previews, valid meshes and explicit provenance',()=>{
 assert.equal(PROCEDURAL_FLORA.length,88);assert.equal(new Set(PROCEDURAL_FLORA.map(a=>a.id)).size,88);assert.equal(new Set(PROCEDURAL_FLORA.map(a=>a.name.toLowerCase())).size,88);assert.ok(PROCEDURAL_FLORA.every(a=>a.name&&a.name.length<=60&&!/[0-9_]/.test(a.name)), 'every part has a distinct readable name');
 assert.equal(PROCEDURAL_FLORA.filter(a=>a.category==='Leaves').length,42);
 const authored=new Set([...BARK_BRANCH_PARTS,...MODELED_LEAF_PARTS]);assert.equal(authored.size,20);for(const a of PROCEDURAL_FLORA){if(authored.has(a)){assert.match(a.source,/authored|independent/i);assert.doesNotMatch(a.source,/reference-derived/i);}else if(['flora-basic-branch','flora-basic-trunk'].includes(a.id))assert.equal(a.source,'Procedural neutral joint primitive');else assert.equal(a.source,'Reference-derived form adapted to BF2 materials and polygon density');}
 for(const a of PROCEDURAL_FLORA){assert.ok(fs.existsSync(new URL(floraIconUrl(a))));assert.ok(a.textureMap().isDataTexture);for(const m of a.meshes){assert.ok(m.positions.length&&m.indices.length);assert.equal(m.positions.length%3,0);assert.equal(m.indices.length%3,0);assert.equal(m.uv.length,m.positions.length/3*2);assert.ok(m.positions.every(Number.isFinite));assert.ok(m.uv.every(Number.isFinite));assert.ok(m.indices.every(i=>Number.isInteger(i)&&i>=0&&i<m.positions.length/3));}}
});
test('every catalogue part adds, renders, saves and follows its parent plant',()=>{
 for(const a of PROCEDURAL_FLORA){const f=testStem(),root=f.branches[0].id,o=addFloraAsset(f,root,a.id,.8);validateFlora(f);assert.equal(a.profile?o.profile:o.asset,a.id);const p=makePart('flora',{flora:f});validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Flora',parts:[p]})));const mesh=buildPart(p,{batch:true});let vertices=0;mesh.traverse(m=>{if(!m.isMesh)return;vertices+=m.geometry.attributes.position.count;for(const key of ['position','normal','uv'])assert.ok([...m.geometry.attributes[key].array].every(Number.isFinite),a.name);});assert.ok(vertices>0);disposePart(mesh);}
 const f=testStem();const o=addFloraAsset(f,f.branches[0].id,PROCEDURAL_FLORA.find(a=>a.category==='Leaves').id);o.asset='unknown';assert.throws(()=>validateFlora(f));
});
test('botanical thumbnails are small baked images with visible silhouettes and cutouts',()=>{
 let bytes=0;
 for(const a of PROCEDURAL_FLORA){
  const url=new URL(floraIconUrl(a));assert.ok(url.pathname.endsWith('.png'),a.name);const image=fs.readFileSync(url);bytes+=image.length;
  assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(image.readUInt32BE(16),128);assert.equal(image.readUInt32BE(20),128);
  const chunks=[];for(let i=8;i<image.length;){const size=image.readUInt32BE(i);if(image.toString('ascii',i+4,i+8)==='IDAT')chunks.push(image.subarray(i+8,i+8+size));i+=size+12;}
  const rows=inflateSync(Buffer.concat(chunks));assert.equal(rows.length,128*513);let visible=0,clear=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++){const alpha=rows[y*513+1+x*4+3];if(alpha)visible++;else clear++;}assert.ok(visible>10&&clear>100,a.name+' recognizable isolated silhouette');
 }
 assert.ok(bytes<1024*1024,'the complete palette must remain below 1 MiB');
});
test('flora cards provide drag payloads and report drag lifecycle without adding by click',()=>{class El{constructor(tag){this.tag=tag;this.children=[];this.attrs={};}append(...e){this.children.push(...e);}replaceChildren(...e){this.children=e;}setAttribute(k,v){this.attrs[k]=v;}}const old=globalThis.document;globalThis.document={createElement:tag=>new El(tag)};try{let starts=[],ends=0,clicks=0;const p=createFloraPalette(()=>clicks++,{onDragStart:id=>starts.push(id),onDragEnd:()=>ends++}),all=e=>[e,...e.children.flatMap(all)],card=all(p).find(e=>e.attrs['data-flora-part']),payload={},dataTransfer={setData:(k,v)=>payload[k]=v};assert.equal(card.draggable,true);assert.equal(card.children[0].draggable,false);card.ondragstart({dataTransfer});assert.equal(payload[FLORA_DRAG_TYPE],card.attrs['data-flora-part']);assert.equal(dataTransfer.effectAllowed,'copy');assert.deepEqual(starts,[card.attrs['data-flora-part']]);assert.equal(clicks,0);card.ondragend();assert.equal(ends,1);}finally{globalThis.document=old;}});
test('left palette groups all parts, searches across groups, and selects the exact named part',()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.attrs={};}append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}setAttribute(k,v){this.attrs[k]=v;}}
 const old=globalThis.document;globalThis.document={createElement:tag=>new El(tag)};try{
  let chosen;const p=createFloraPalette(id=>chosen=id),all=e=>[e,...e.children.flatMap(all)],cards=()=>all(p).filter(e=>e.attrs['data-flora-part']),categories=['Bases','Flora','Branches','Leaves','Coral','Details','Tree presets'];
  assert.deepEqual(all(p).filter(e=>e.tag==='button'&&!e.attrs['data-flora-part']).map(e=>e.textContent),categories);assert.equal(cards().length,8);
  const seen=new Set();for(const category of categories){all(p).find(e=>e.tag==='button'&&e.textContent===category).onclick();const expected=FLORA_PALETTE_ASSETS.filter(a=>floraPaletteCategory(a)===category);assert.equal(cards().length,expected.length);for(const card of cards()){assert.equal(card.attrs['data-flora-category'],category);assert.ok(!seen.has(card.attrs['data-flora-part']));seen.add(card.attrs['data-flora-part']);}}
  assert.equal(seen.size,FLORA_PALETTE_ASSETS.length);assert.equal(PROCEDURAL_FLORA.filter(a=>floraPaletteCategory(a)==='Branches').length,17);assert.equal(PROCEDURAL_FLORA.filter(a=>floraPaletteCategory(a)==='Flora').length,0);
  all(p).find(e=>e.tag==='button'&&e.textContent==='Coral').onclick();assert.deepEqual(cards().map(c=>c.attrs['data-flora-part']).sort(),['coral-antler-branch','coral-brain-lobe','coral-shelf-plate','coral-staghorn-fork','flora-coral-leaf']);
  const search=all(p).find(e=>e.tag==='input');all(p).find(e=>e.tag==='button'&&e.textContent==='Leaves').onclick();assert.ok(cards().some(e=>e.attrs['data-flora-part']==='dagobah-vines'));search.value='Ginkgo Leaf';search.oninput();assert.equal(cards().length,1);cards()[0].onclick();assert.equal(chosen,'flora-ginkgo-leaf');search.value='ginkgo';search.oninput();assert.equal(cards()[0].attrs['data-flora-part'],chosen);search.value='no such plant';search.oninput();assert.equal(cards().length,0);
  p.revealPart('flora-ginkgo-leaf');assert.equal(cards().length,1);assert.equal(cards()[0].attrs['data-flora-category'],'Leaves');all(p).find(e=>e.tag==='button'&&e.textContent==='Bases').onclick();assert.equal(search.value,'');assert.equal(cards().length,8);
 }finally{globalThis.document=old;}
});

test('flora placement categories separate joint profiles, surface meshes and body presets',()=>{assert.equal(floraPlacementCategory(PROCEDURAL_FLORA.find(a=>a.id==='flora-elbow-branch')),'Joint parts');assert.equal(floraPlacementCategory(PROCEDURAL_FLORA.find(a=>a.id==='flora-bent-twig')),'Surface parts');assert.equal(floraPlacementCategory(PROCEDURAL_FLORA.find(a=>a.id==='flora-ginkgo-leaf')),'Surface parts');assert.equal(floraPlacementCategory(PROCEDURAL_FLORA.find(a=>a.id==='flora-taproot')),'Body presets');assert.ok(PROCEDURAL_FLORA.every(a=>['Joint parts','Surface parts','Body presets'].includes(floraPlacementCategory(a))));});
