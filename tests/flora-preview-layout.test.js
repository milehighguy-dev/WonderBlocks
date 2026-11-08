import test from 'node:test';
import assert from 'node:assert/strict';
import {makePart} from '../src/core/model.js';
import {floraPreviewLayoutKey} from '../src/flora/flora-preview-layout.js';
import {testPlant} from './flora-fixtures.js';

test('plant pose history can reuse layout while assets, topology and finishes invalidate it',()=>{
 const original=makePart('flora',{flora:testPlant()}),key=floraPreviewLayoutKey(original);
 for(const change of [p=>p.flora.branches[0].points[1][0]+=.2,p=>p.flora.branches[0].radii[1]*=2,p=>p.flora.organs[0].offset[0]+=.3,p=>p.flora.organs[0].scale[0]*=2]){
  const p=structuredClone(original);change(p);assert.equal(floraPreviewLayoutKey(p),key);
 }
 for(const change of [p=>p.flora.branches.pop(),p=>p.flora.branches[0].points.pop(),p=>p.flora.organs.pop(),p=>p.flora.colors.leaf='#ff0000',p=>p.flora.detail='low',p=>p.flora.organs[0].asset='flora-paddle-leaf',p=>p.scale[0]*=2]){
  const p=structuredClone(original);change(p);assert.notEqual(floraPreviewLayoutKey(p),key);
 }
 assert.equal(floraPreviewLayoutKey({...original,shape:{twist:20}}),null);
});
