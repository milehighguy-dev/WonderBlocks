import test from 'node:test';
import assert from 'node:assert/strict';
import {SURFACES} from '../src/materials/surfaces.js';
import {TEXTURE_CATEGORIES,texturesForCategory} from '../src/materials/texture-categories.js';
import {createTexturePalette} from '../src/editor/texture-palette.js';

test('setting categories cover every texture and combine the matching source games',()=>{
 const ids=new Set(SURFACES.map(s=>s.id));
 for(const category of TEXTURE_CATEGORIES){assert.ok(category.preview.length);assert.ok(category.preview.every(id=>category.ids.has(id)));assert.ok([...category.ids].every(id=>ids.has(id)));assert.ok(texturesForCategory(category.id).length);assert.ok(!category.ids.has('plain'));}
 for(const surface of SURFACES.filter(s=>s.id!=='plain'))assert.ok(TEXTURE_CATEGORIES.some(c=>c.id!=='all'&&c.ids.has(surface.id)),surface.id);
 assert.deepEqual(texturesForCategory('all'),SURFACES.filter(s=>s.id!=='plain'));
 const rhen=texturesForCategory('rhen-var').map(s=>s.id);assert.ok(rhen.includes('bf1-rhenvar-masonry')&&rhen.includes('swbf-rhen-wall'));assert.ok(!rhen.includes('bf1-hoth-ice'));
 const desert=texturesForCategory('tatooine').map(s=>s.id);assert.ok(desert.includes('mos-stucco')&&desert.includes('ja-desert-plaster'));
 const urban=texturesForCategory('urban').map(s=>s.id);assert.ok(urban.includes('cor-night-blue')&&urban.includes('ny-brick')&&urban.includes('kotor-taris-metal-tiles'));
});

test('category cards browse without painting, search crosses collections, and painting retains selection state',()=>{
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.value='';const classes=new Set();this.classList={toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)};}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.listeners[k]=fn;}focus(){this.focused=true;}
 }
 const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  let applied=[];const palette=createTexturePalette({onSelect:id=>applied.push(id),previewUrl:id=>id+'.png'}),all=e=>[e,...e.children.flatMap(all)],find=cls=>all(palette.panel).find(e=>e.className===cls),cards=()=>find('texture-presets').children;
  const gallery=find('texture-category-grid'),search=find('texture-search'),back=find('texture-back');assert.equal(gallery.hidden,false);assert.equal(cards().length,0);
  gallery.children.find(b=>b.dataset.textureCategory==='rhen-var').onclick();assert.equal(applied.length,0);assert.equal(gallery.hidden,true);assert.deepEqual(cards().map(b=>b.dataset.surface),texturesForCategory('rhen-var').map(s=>s.id));
  const selected=cards()[0];selected.onclick();assert.deepEqual(applied,[selected.dataset.surface]);palette.setSelected(selected.dataset.surface);assert.equal(selected.attrs['aria-pressed'],'true');
  search.value='Kashyyyk mossy';search.oninput();assert.deepEqual(cards().map(b=>b.dataset.surface),['kotor-kashyyyk-mossy-bark']);
  search.value='no matching texture';search.oninput();assert.equal(cards().length,0);
  back.onclick();assert.equal(search.value,'');assert.equal(gallery.hidden,false);assert.equal(cards().length,0);
  gallery.children.find(b=>b.dataset.textureCategory==='urban').onclick();assert.equal(applied.length,1);assert.ok(cards().some(b=>b.dataset.surface==='ny-brick'));
  assert.ok(!cards().some(b=>b.dataset.surface==='plain'));
  const clear=find('texture-remove');assert.equal(clear.disabled,false);clear.onclick();assert.equal(applied.at(-1),'plain');palette.setSelected('plain');assert.equal(clear.disabled,true);
  search.value='Plain';search.oninput();assert.ok(!cards().some(b=>b.dataset.surface==='plain'));
 }finally{globalThis.document=old;}
});
