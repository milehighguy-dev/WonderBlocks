import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart,validateProject} from '../src/core/model.js';
import {exportProfileKey,validateExportProfiles,exportLayerName} from '../src/core/export-profiles.js';
import {planSWBF2} from '../src/swbf2/export-swbf2.js';
test('scene and individual asset profiles survive project save without becoming geometry',()=>{
 const parts=[makePart('block'),makePart('orb')],p={format:'open-building-studio',version:1,name:'Profiles',parts,swbf2Exports:{active:'scene:scene',profiles:{'scene:scene':{id:'scene-original',values:{output:'scene',destination:'folder','target-world':'WON','export-name':'My map','ai-navigation':false},folderId:'remembered-world'}}}};
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);assert.equal(exportProfileKey(p,null,'scene'),'scene:scene');assert.equal(exportProfileKey(p,[parts[0].id],'object'),exportProfileKey(p,[parts[0].id],'mesh'));assert.notEqual(exportProfileKey(p,[parts[0].id],'object'),exportProfileKey(p,[parts[1].id],'object'));
 const a=planSWBF2(p,{shadows:false,lowDetail:false}).navigation;p.name='Renamed';const b=planSWBF2(p,{shadows:false,lowDetail:false}).navigation;assert.equal(a.prefix,b.prefix);assert.match(exportLayerName('scene-original','My scene'),/^wb_my_scene_[a-f0-9]+$/);assert.notEqual(exportLayerName('a-b'),exportLayerName('ab'));
 assert.throws(()=>validateExportProfiles({profiles:{x:{id:'../bad',values:{}}}}));assert.throws(()=>validateExportProfiles({profiles:{x:{id:'valid',values:{sections:100}}}}));
});
