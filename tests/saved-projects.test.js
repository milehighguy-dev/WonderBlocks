import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {validateProject} from '../src/core/model.js';

const folder=new URL('../examples/projects/',import.meta.url);
const files=(await readdir(folder)).filter(name=>name.endsWith('.json')).sort();
test('the shipped project directory is not empty',()=>assert.ok(files.length>0));
for(const name of files){
 test('saved example validates: '+name,async()=>{
  const project=JSON.parse(await readFile(new URL(name,folder),'utf8'));
  assert.doesNotThrow(()=>validateProject(project),name);
 });
}
