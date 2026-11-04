import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {flaredLandingGeometry} from '../src/routes/flared-landing.js';
import {routeLayout,minimumRun} from '../src/routes/stair-route.js';
import {selectSurface,paintSurface,sameSurface,applyFaceFinishes,surfaceHighlight} from '../src/editor/surface-selection.js';
import {disposePart} from '../src/core/geometry.js';

test('short angled supports remain finite with outward bottom faces and no collapsed triangles',()=>{
 for(const angle of [0,30,60,90,120,150,-30,-90,-150])for(const flare of [-.8,-.5,.5,2]){
 const s={kind:'landing',run:20,rise:0,steps:1,turn:angle>0?'left':angle<0?'right':'straight',groundFlare:flare};if(angle&&Math.abs(angle)!==90)s.turnAngle=angle*Math.PI/180;
 const r={width:4,thickness:.18,gap:.15,segments:[s]};s.run=minimumRun(r,0);
 const g=flaredLandingGeometry(routeLayout(r)[0],-3),a=g.attributes.position,n=g.attributes.normal,mask=g.userData.groundVertices;
 assert.ok([...a.array,...n.array].every(Number.isFinite));
 for(let i=0;i<a.count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,i+j));assert.ok(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).lengthSq()>1e-16);
 if([0,1,2].every(j=>mask[i+j]))assert.ok(n.getY(i)<-.99);if([0,1,2].every(j=>!mask[i+j]))assert.ok(n.getY(i)>.99);}
 g.dispose();
 }
});

function overlappingSpaces(){const group=new T.Group();for(const space of ['first','second']){const m=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial({color:'#ffffff'}));m.userData.connectedInteriorId=space;m.userData.interiorStorey='upper';group.add(m);}group.updateMatrixWorld(true);return group;}

test('coincident surfaces in separate interior spaces paint and highlight independently',()=>{
 const g=overlappingSpaces(),mesh=g.children[0],hit=new T.Raycaster(new T.Vector3(0,0,5),new T.Vector3(0,0,-1)).intersectObject(mesh)[0],selection=selectSurface(hit,g),face=selection.face;
 assert.equal(face.spaceId,'first');assert.ok(!sameSurface(face,{...face,spaceId:'second'}));assert.ok(!sameSurface(face,{...face,levelId:'other'}));
 const part={faceFinishes:[]};paintSurface(part,face,{color:'#ff0000'});applyFaceFinishes(g,part);
 assert.ok(g.children.some(m=>m.userData.connectedInteriorId==='first'&&m.material.color.getHexString()==='ff0000'));
 assert.ok(g.children.filter(m=>m.userData.connectedInteriorId==='second').every(m=>m.material.color.getHexString()==='ffffff'));
 const overlay=surfaceHighlight(g,face);assert.equal(overlay.geometry.attributes.position.count,selection.geometry.attributes.position.count);
 selection.geometry.dispose();disposePart(overlay);disposePart(g);
});

test('invalid face paint leaves saved materials unchanged',()=>{
 const g=overlappingSpaces(),mesh=g.children[0],hit=new T.Raycaster(new T.Vector3(0,0,5),new T.Vector3(0,0,-1)).intersectObject(mesh)[0],selection=selectSurface(hit,g),part={};
 assert.throws(()=>paintSurface(part,selection.face,{scale:Infinity}),/painted surface/);assert.equal(part.faceFinishes,undefined);
 paintSurface(part,selection.face,{color:'#ff0000'});const before=JSON.stringify(part);assert.throws(()=>paintSurface(part,selection.face,{color:'bad'}),/painted surface/);assert.equal(JSON.stringify(part),before);
 selection.geometry.dispose();disposePart(g);
});
