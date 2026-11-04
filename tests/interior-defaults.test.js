import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultInterior,interiorWalls,validateInterior,interiorFromShell} from '../src/interiors/interior.js';
import {openingAtWall} from '../src/interiors/interior-opening-3d.js';
import {extendRoomPreview} from '../src/interiors/room-extension.js';
import {extendRoomEdge} from '../src/interiors/room-outline.js';
import {makePart} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {verticalWalker} from '../src/walk/walk-physics.js';
import {Vector3} from '../vendor/three.module.js';

test('new rooms allow a 1.8 metre unit to rise 1.6 metres without striking the ceiling',()=>{
 const p=makePart('interior'),g=buildPart(p);g.updateMatrixWorld(true);let feet=new Vector3(3,0,2);
 for(let i=0;i<10;i++)feet=verticalWalker([g],feet,0,.05,true,1.8).feet;
 assert.equal(p.interior.height,4);assert.ok(Math.abs(feet.y-1.6)<1e-6);disposePart(g);
});

test('new hovered and connecting doors share wider taller defaults and still fit old low rooms',()=>{
 const p=defaultInterior(),w=interiorWalls(p).find(w=>w.axis==='x'&&w.line===0),door=openingAtWall(p,w,3,0,'door');
 assert.equal(door.width,2);assert.equal(door.height,3);p.doors.push(door);validateInterior(p);
 for(const next of [extendRoomPreview(defaultInterior(),'room-1','right',3).plan,extendRoomEdge(defaultInterior(),'room-1',0,3,'new').plan]){assert.equal(next.doors[0].width,2);assert.equal(next.doors[0].height,3);validateInterior(next);}
 const old={...defaultInterior(),height:2.5},oldWall=interiorWalls(old).find(w=>w.axis==='x');old.doors=[openingAtWall(old,oldWall,3,0,'door')];assert.ok(old.doors[0].height<2.5);validateInterior(old);
 const smallShell=interiorFromShell(makePart('block',{scale:[6,3,5]}));assert.equal(smallShell.interior.height,2.6);validateInterior(smallShell.interior);
});
