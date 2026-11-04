import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart,validateProject} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {applySurface} from '../src/materials/surfaces.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';
test('a native waterfall saves, exports soft alpha and never blocks soldiers or projectiles',()=>{
 const p=makePart('waterfall',{scale:[4,30,1],surface:{preset:'waterfall',scale:1},pattern:{mode:'fixed',texture:[.25,1/30,1]}}),project={format:'open-building-studio',version:1,name:'Waterfall',parts:[p]};
 assert.deepEqual(validateProject(project),project);
 const root=buildPart(p,{collision:'sync'});
 try{assert.equal(root.userData.collision.bodies.length,0);const m=root.children[0].material;assert.equal(m.side,T.DoubleSide);assert.equal(m.transparent,true);assert.equal(m.depthWrite,false);
  applySurface(root,m,{...p,surface:{preset:'plain',scale:1}});assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);assert.equal(m.side,T.FrontSide);
 }finally{disposePart(root);}
 const output=createSWBF2Package(project,{aiNavigation:false});assert.ok(output.manifest.assets.every(a=>a.collisionBodies.length===0&&a.shadowTriangles===0));
 assert.ok(planSWBF2(project,{aiNavigation:false}).materials.every(m=>(m.flags&4)&&!(m.flags&16)),'soft blending, not a hard alpha cutout');
 const tga=[...output.files.entries()].find(([n])=>n.endsWith('.tga'));assert.equal(tga[1][16],32,'RGBA texture survives native package serialization');
});
