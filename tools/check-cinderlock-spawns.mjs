import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {prepareInteriorCuts} from '../src/interiors/interior-hull-cuts.js';
import {createWalkCollision} from '../src/walk/walk-collision.js';
import {groundAt,moveWalker} from '../src/walk/walk-physics.js';
const out=new URL('../../../outputs/swbf2-cinderlock-2026-10-20/',import.meta.url);
const project=JSON.parse(fs.readFileSync(new URL('export/source/clf.building.json',out),'utf8'));
const spawns=JSON.parse(fs.readFileSync(new URL('spawn-points.json',out),'utf8'));
const cuts=prepareInteriorCuts(project.parts),roots=project.parts.map(p=>buildPart(p,{parts:project.parts,openingCuts:cuts,batch:true,collision:'sync'}));
try{
 const physical=createWalkCollision(roots);
 for(const cp of spawns)for(const point of cp.nodes){
  const position=new T.Vector3(...point),floor=groundAt(physical,position,.1,.5);assert.ok(floor,cp.name+' supported spawn');
  assert.ok(Math.abs(floor.point.y-(point[1]-.3))<.02,cp.name+' floor height');position.y=floor.point.y;
  for(let i=0;i<8;i++){const delta=new T.Vector3(Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4)).multiplyScalar(.3);assert.ok(moveWalker(physical,position,delta).distanceTo(position)>.27,cp.name+' clear soldier footprint');}
  const ray=new T.Raycaster(position.clone().add(new T.Vector3(0,.05,0)),new T.Vector3(0,1,0),0,2.1);assert.equal(physical.firstHit(ray),null,cp.name+' soldier headroom');
 }
 console.log('All 20 game spawn nodes have correct floor, 2.1m headroom and a clear soldier footprint.');
}finally{roots.forEach(disposePart);}
