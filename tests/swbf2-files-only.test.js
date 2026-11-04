import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {createSWBF2Package,createSWBF2PackageAsync} from '../src/swbf2/export-swbf2.js';
test('folder output retains byte-identical scene and standalone files without building a ZIP',async()=>{
 const project={format:'open-building-studio',version:1,name:'Files only',parts:[makePart('block',{surface:{preset:'mos-stucco',scale:.5}})]};
 for(const output of ['scene','object','mesh']){
  const settings={output,aiNavigation:false,includeCollision:false,shadows:false,lowDetail:false},phases=[];
  const download=createSWBF2Package(project,settings),direct=createSWBF2Package(project,settings,{packZip:false,onProgress:p=>phases.push(p.phase)});
  assert.ok(download.zip instanceof Uint8Array);assert.equal(direct.zip,null);assert.equal(direct.filename,download.filename);assert.deepEqual(direct.manifest,download.manifest);assert.deepEqual(direct.files,download.files);
  assert.ok(!phases.includes('Packing download'));assert.ok(phases.includes('Preparing world files'));
  const async=await createSWBF2PackageAsync(project,settings,{packZip:false});assert.equal(async.zip,null);assert.deepEqual(async.files,direct.files);
 }
});
