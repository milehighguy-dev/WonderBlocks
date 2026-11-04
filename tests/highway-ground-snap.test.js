import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {snapHighwayGround} from '../src/highways/highway-ground-snap.js';
test('ground snaps place the deck underside flush and do not pull down elevated roads',()=>{
 const part=makePart('highway');
 assert.equal(snapHighwayGround(new T.Vector3(4,.2,8),part,[]).y,.5);
 assert.equal(snapHighwayGround(new T.Vector3(4,8,8),part,[]),null);
 part.scale[1]=2;assert.equal(snapHighwayGround(new T.Vector3(4,.2,8),part,[]).y,1);
});
test('ground snaps find raised surfaces and skip hidden or highway geometry',()=>{
 const part=makePart('highway'),body=new T.Mesh(new T.BoxGeometry(10,4,10),new T.MeshBasicMaterial());body.position.y=2;
 const point=new T.Vector3(0,4.2,0);assert.equal(snapHighwayGround(point,part,[body]).y,4.5);
 body.visible=false;assert.equal(snapHighwayGround(point,part,[body]),null);
 body.visible=true;body.userData.highwayDeck=true;assert.equal(snapHighwayGround(point,part,[body]),null);
 body.geometry.dispose();body.material.dispose();
});
