import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {defaultHighway,highwayCurve,highwaySamples,extendHighway,validateHighway} from '../src/highways/highway.js';
import {makePart,validateProject,mirrorPart,History} from '../src/core/model.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {applySurface} from '../src/materials/surfaces.js';
import {exportOBJ} from '../src/export/export.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const curved=()=>({...defaultHighway(),width:4,nodes:[{point:[0,0,0],tangent:[0,0,6]},{point:[14,6,18],tangent:[6,2,0]},{point:[30,3,12],tangent:[4,-1,-5]}]});
test('highway railing styles render distinct profiles, save, and allow bare decks',()=>{
 for(const style of ['solid','posts','guardrail','jersey','w-beam','none']){
  const p=makePart('highway');p.highway.railStyle=style;const g=buildPart(p);g.updateMatrixWorld(true);
  assert.equal(g.children.filter(m=>m.userData.highwayRailing).length,style==='none'?0:2);
  const cast=y=>new T.Raycaster(new T.Vector3(0,y,1.3),new T.Vector3(1,0,0),0,8).intersectObject(g,true);
  assert.equal(cast(.1).length>0,style==='solid'||style==='jersey');
  assert.equal(cast(.98).length>0,style!=='none');
  g.traverse(m=>{if(m.isMesh)for(const attr of Object.values(m.geometry.attributes))assert.ok(Array.from(attr.array).every(Number.isFinite));});
  assert.equal(validateProject(JSON.parse(JSON.stringify({format:'open-building-studio',version:1,name:'Railings',parts:[p]}))).parts[0].highway.railStyle,style);
  disposePart(g);
 }
 const old=makePart('highway');delete old.highway.railStyle;assert.doesNotThrow(()=>validateHighway(old.highway));old.highway.railStyle='unknown';assert.throws(()=>validateHighway(old.highway),/railing/);
});
test('Jersey and W-beam barriers have closed outward-facing profiles with their defining shapes',()=>{
 for(const style of ['jersey','w-beam']){
  const p=makePart('highway');p.highway.railStyle=style;const g=buildPart(p),rail=g.children.find(m=>m.userData.highwayRailing),pos=rail.geometry.attributes.position;
  let volume=0;const edges=new Map(),vertex=i=>new T.Vector3().fromBufferAttribute(pos,i),key=i=>vertex(i).toArray().map(v=>v.toFixed(5)).join(',');
  for(let i=0;i<pos.count;i+=3){volume+=vertex(i).dot(vertex(i+1).cross(vertex(i+2)))/6;for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const k=[key(a),key(b)].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}}
  assert.ok(volume>0,'profile faces point outward');
  if(style==='jersey'){
   assert.ok([...edges.values()].every(n=>n===2),'Jersey shell is watertight');
   const width=y=>{const xs=[];for(let i=0;i<pos.count;i++)if(Math.abs(pos.getY(i)-y)<1e-5)xs.push(pos.getX(i));return Math.max(...xs)-Math.min(...xs);};assert.ok(width(0)>width(p.highway.barrierHeight)*3);
  }else{
   const panelXs=new Set();for(let i=0;i<pos.count;i++)if(pos.getY(i)>.7)panelXs.add(pos.getX(i).toFixed(4));assert.ok(panelXs.size>=4,'corrugated beam has depth changes');
  }
  disposePart(g);
 }
});
test('W-beam traffic faces stay continuous in front of the posts on both sides',()=>{
 const p=makePart('highway');p.highway.railStyle='w-beam';const g=buildPart(p);g.updateMatrixWorld(true);
 for(const sign of [-1,1]){
  const rail=g.children.filter(m=>m.userData.highwayRailing).find(m=>new T.Box3().setFromObject(m).getCenter(new T.Vector3()).x*sign>0);
  const cast=(y,z)=>new T.Raycaster(new T.Vector3(0,y,z),new T.Vector3(sign,0,0),0,8).intersectObject(rail)[0];
  // Post centres occur every 3 m. They must not change the road-facing profile.
  for(const y of [.6,.68,.79,.9,.98])for(const z of [0,3,6,9,12,15]){const atPost=cast(y,z),between=cast(y,1.3);assert.ok(atPost&&between);near(atPost.point.x,between.point.x);}
  const lowerPost=cast(.3,3);assert.ok(lowerPost);assert.ok(lowerPost.point.x*sign>5.93,'posts stand outside the beam');
  assert.ok(cast(.6,1.3),'larger beam extends below the old 0.7 m lower edge');
 }
 disposePart(g);
});
test('straight highways use one span while retaining regular support spacing',()=>{
 const h={...defaultHighway(),supports:true,nodes:[{point:[0,8,0],tangent:[0,0,100/3]},{point:[0,8,100],tangent:[0,0,100/3]}]};
 assert.equal(highwaySamples(h).length,2);
 const g=buildPart(makePart('highway',{highway:h}));g.updateMatrixWorld(true);
 const supports=g.children.filter(m=>m.userData.highwaySupport);assert.equal(supports.length,8);
 supports.forEach((m,i)=>near(m.position.z,6+i*12));
 let triangles=0;g.traverse(m=>{if(m.isMesh)triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;});assert.equal(triangles,132);
 disposePart(g);
});
test('adaptive highway tessellation preserves S bends and vertical humps within nine centimetres',()=>{
 for(const nodes of [
  [{point:[0,0,0],tangent:[30,0,20]},{point:[0,0,100],tangent:[30,0,20]}],
  [{point:[0,0,0],tangent:[0,12,25]},{point:[0,0,100],tangent:[0,-12,25]}]
 ]){
  const h={...defaultHighway(),width:4,nodes},curve=highwayCurve(...nodes),samples=highwaySamples(h);assert.ok(samples.length>2&&samples.length<70);
  for(let i=1;i<samples.length;i++)for(let j=0;j<=10;j++){
   const a=samples[i-1],b=samples[i],t=a.t+(b.t-a.t)*j/10,point=curve.getPoint(t),d=curve.getTangent(t),side=new T.Vector3(d.z,0,-d.x).normalize();
   for(const sign of [-1,1]){const edge=point.clone().addScaledVector(side,sign*h.width/2),line=new T.Line3(a.point.clone().addScaledVector(a.side,sign*h.width/2),b.point.clone().addScaledVector(b.side,sign*h.width/2));assert.ok(line.closestPointToPoint(edge,true,new T.Vector3()).distanceTo(edge)<.09);}
  }
 }
});
test('3D highway curves meet endpoints with shared position and tangent',()=>{const h=curved(),a=highwayCurve(h.nodes[0],h.nodes[1]),b=highwayCurve(h.nodes[1],h.nodes[2]);near(a.getPoint(1).distanceTo(b.getPoint(0)),0);near(a.getTangent(1).distanceTo(b.getTangent(0)),0);assert.ok(highwaySamples(h).some(s=>s.point.y>5));for(const s of highwaySamples(h)){near(s.side.y,0);near(s.side.length(),1);}const extended=extendHighway(h,[42,5,6]);assert.deepEqual(extended.nodes[2],h.nodes[2]);assert.equal(h.nodes.length,3);near(highwayCurve(extended.nodes[2],extended.nodes[3]).getTangent(0).distanceTo(b.getTangent(1)),0);});
test('highway deck is closed, has outward normals and never banks',()=>{const p=makePart('highway',{highway:curved()}),g=buildPart(p),edges=new Map();
 for(const deck of g.children.filter(m=>m.userData.highwayDeck)){const pos=deck.geometry.attributes.position,key=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>v.toFixed(5)).join(',');for(let i=0;i<pos.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const k=[key(a),key(b)].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}if(deck.userData.highwayComponent==='road')assert.ok(Array.from(deck.geometry.attributes.normal.array).filter((_,i)=>i%3===1).every(y=>y>0));}
 assert.ok([...edges.values()].every(n=>n===2));for(const sample of highwaySamples(p.highway))near(sample.side.y,0);g.updateMatrixWorld(true);const hit=new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0)).intersectObject(g,true)[0];assert.ok(hit);near(hit.point.y,0);assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));disposePart(g);});
test('barriers follow the road and elevated supports reach world ground',()=>{const p=makePart('highway',{position:[5,12,7],highway:{...curved(),supports:true}}),g=buildPart(p);g.updateMatrixWorld(true);assert.ok(g.children.length>3);for(const m of g.children.filter(m=>m.userData.highwaySupport)){const box=new T.Box3().setFromObject(m);near(box.min.y,0);assert.ok(box.max.y>=11);}disposePart(g);});
test('highway textures preserve arc distance and wall height through repainting',()=>{const p=makePart('highway',{highway:curved(),surface:{preset:'tile',scale:1}}),g=buildPart(p),material=g.children[0].material;for(const scale of [1,2,.5]){p.surface.scale=scale;applySurface(g,material,p);for(const m of g.children.filter(m=>m.material===material)){const a=m.geometry.attributes,axes=a.highwayUVAxes;for(let i=0;i<a.uv.count;i++){near(a.uv.getX(i),a.highwayUV.getX(i)*scale);near(a.uv.getY(i),a.highwayUV.getY(i)*scale);}assert.ok(Array.from(a.uv.array).every(Number.isFinite));assert.ok(Array.from(axes.array).includes(2));}}disposePart(g);});
test('highway project saves, mirrors and undoes its path data',()=>{const p=makePart('highway',{highway:curved()}),project={format:'open-building-studio',version:1,name:'Highway',parts:[p]},history=new History();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))),project);const mirrored=mirrorPart(p);assert.deepEqual(mirrored.highway,p.highway);history.push(project);p.highway.nodes[1].point[1]=20;history.push(project);assert.equal(history.undo().parts[0].highway.nodes[1].point[1],6);const g=buildPart(mirrored,{batch:true});assert.ok(!/NaN|Infinity/.test(exportOBJ(g)));disposePart(g);});
test('invalid or excessively large highway paths are rejected',()=>{for(const change of [h=>h.width=0,h=>h.nodes[1].point=h.nodes[0].point,h=>h.nodes[0].tangent[1]=NaN,h=>h.nodes=Array(65).fill(h.nodes[0]),h=>h.barrierHeight=-1]){const h=defaultHighway();change(h);assert.throws(()=>validateHighway(h));}const h=defaultHighway();h.nodes[1].point=[0,15,0];h.nodes.forEach(n=>n.tangent=[0,5,0]);assert.throws(()=>highwaySamples(h));});

test('wide highways reject bends that would fold their inside edge',()=>{const h=curved();h.width=100;assert.throws(()=>highwaySamples(h),/bend is too tight/);});
test('highway example validates and builds as an editable project',async()=>{const {highwayJunctionFixture}=await import('./fixtures/highway-junction-fixture.js'),p=validateProject(highwayJunctionFixture());const g=buildPart(p.parts[0]);assert.ok(g.children.length>3);disposePart(g);});
