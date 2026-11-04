import test from 'node:test';
import assert from 'node:assert/strict';
import {EXAMPLE_SCENES} from '../src/editor/example-scenes.js';
import {validateProject} from '../src/core/model.js';
import {readdirSync,readFileSync} from 'node:fs';

test('curated examples keep the requested representatives without duplicate entries',()=>{
 assert.equal(EXAMPLE_SCENES.length,14);
 assert.equal(new Set(EXAMPLE_SCENES.map(s=>s.id)).size,14);
 const ids=group=>EXAMPLE_SCENES.filter(s=>s.group===group).map(s=>s.id);
 assert.deepEqual(ids('Organic shapes'),['swbf-trees']);
 assert.deepEqual(ids('Coruscant'),['aurelia','coruscant-residential']);
 assert.deepEqual(ids('Gameplay maps'),['yavin-rainwell','vesper-rift','cinderlock','relay-district']);
});

test('every curated example loads as a valid editable project',()=>{
 for(const scene of EXAMPLE_SCENES){
  const project=scene.load();
  assert.ok(project.parts.length>0,scene.name);
  assert.doesNotThrow(()=>validateProject(JSON.parse(JSON.stringify(project))),scene.name);
 }
});

test('bundled saved scenes match the curated example list',()=>{
 const directory=new URL('../examples/projects/',import.meta.url),files=readdirSync(directory).filter(n=>n.endsWith('.json'));
 assert.equal(files.length,EXAMPLE_SCENES.length);
 const names=files.map(file=>{const project=JSON.parse(readFileSync(new URL(file,directory),'utf8'));validateProject(project);return project.name;});
 assert.deepEqual(names.sort(),EXAMPLE_SCENES.map(s=>s.load().name).sort());
});

test('example generator directory contains only the curated scene builders',()=>{
 const catalogue=readFileSync(new URL('../src/editor/example-scenes.js',import.meta.url),'utf8');
 const imports=[...catalogue.matchAll(/from '\.\.\/\.\.\/examples\/generators\/([^']+)'/g)].map(m=>m[1]).sort();
 const files=readdirSync(new URL('../examples/generators/',import.meta.url)).sort();
 assert.equal(imports.length,EXAMPLE_SCENES.length);
 assert.deepEqual(files,imports,'Retired builders must be deleted rather than hidden from the menu');
});

test('application code and previews never import test fixtures',()=>{
 function inspect(folder){
  for(const entry of readdirSync(folder,{withFileTypes:true})){
   const url=new URL(entry.name+(entry.isDirectory()?'/':''),folder);
   if(entry.isDirectory())inspect(url);
   else if(/\.(js|mjs|html)$/.test(entry.name)){
    const source=readFileSync(url,'utf8');
    for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.{1,2}\/[^'"\n]+)\1/g)){
     assert.ok(!new URL(match[2],url).pathname.includes('/tests/'),url.pathname+': '+match[2]);
    }
   }
  }
 }
 for(const folder of ['src/','examples/generators/','previews/'])inspect(new URL('../'+folder,import.meta.url));
});
