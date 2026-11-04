import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {exportOBJ} from '../src/export/export.js';
test('temporary viewport hiding does not remove geometry from exports or project saves',()=>{
 const part=makePart('block'),root=new Group(),mesh=buildPart(part);root.add(mesh);const before=exportOBJ(root);mesh.visible=false;assert.equal(exportOBJ(root),before);const saved=validateProject({format:'open-building-studio',version:1,name:'Hidden view',parts:[part]});assert.equal(saved.parts.length,1);assert.equal('visible' in saved.parts[0],false);disposePart(root);
});
