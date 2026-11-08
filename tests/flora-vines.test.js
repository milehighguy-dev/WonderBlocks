import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {defaultFlora,addFloraAsset,extendFloraBranch,branchDisplayGeometry,floraAttachmentFrame,floraCurve,floraOrganPosition,floraNeedsWeld,buildFlora,validateFlora} from '../src/flora/flora.js';
import {buildPart,disposePart} from '../src/core/geometry.js';
import {makePart} from '../src/core/model.js';

const points=[[0,0,0],[1,-2,5],[-2,-4,10],[-5,-3,15],[-4,0,20],[0,3,24],[5,1,28],[7,-1,33]],radii=[.8,.9,.8,.7,.65,.7,.6,.5];
function vines(){
 const whole=defaultFlora(),root=addFloraAsset(whole,whole.branches[0].id,'flora-basic-branch');root.points=structuredClone(points);root.radii=[...radii];
 const pieces=defaultFlora();let parent=null,frame=new T.Matrix4();
 for(let i=0;i<points.length-1;i++){
  const node=addFloraAsset(pieces,parent?.id||pieces.branches[0].id,'flora-basic-branch',1);
  frame=floraAttachmentFrame(pieces,node);node.points=[[0,0,0],new T.Vector3(...points[i+1]).applyMatrix4(frame.clone().invert()).toArray()];node.radii=[radii[i],radii[i+1]];parent=node;
 }
 validateFlora(whole);validateFlora(pieces);return {whole,pieces};
}
function surface(f){const group=new T.Group();buildFlora(group,f,{}, {live:true});group.updateMatrixWorld(true);return group;}
function triangles(group){
 const result=[];group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,index=g.index,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<(index?.count||p.count);i+=3){const vertices=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j,position=new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(m.matrixWorld),normal=new T.Vector3().fromBufferAttribute(n,k).transformDirection(m.matrixWorld);vertices.push([...position.toArray(),...normal.toArray(),uv.getX(k),uv.getY(k)].map(x=>Math.round(x*1e4)).join(','));}result.push(vertices.sort().join('|'));}
 });return result.sort();
}

function sameExterior(actual,expected){
 const grid=new Map(),cell=.001,point=new T.Vector3(),normal=new T.Vector3(),vertices=[];let expectedTriangles=0,actualTriangles=0;
 const read=(group,accept)=>group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry;for(const i of g.index?new Set(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i)){point.fromBufferAttribute(g.attributes.position,i).applyMatrix4(m.matrixWorld);normal.fromBufferAttribute(g.attributes.normal,i).transformDirection(m.matrixWorld);accept([...point.toArray(),...normal.toArray(),g.attributes.uv.getX(i),g.attributes.uv.getY(i)]);}});
 expected.traverse(m=>{if(m.isMesh)expectedTriangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;});actual.traverse(m=>{if(m.isMesh)actualTriangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;});assert.equal(actualTriangles,expectedTriangles,'same exterior face count');
 read(expected,v=>{const key=v.slice(0,3).map(x=>Math.floor(x/cell)).join(',');if(!grid.has(key))grid.set(key,[]);grid.get(key).push(v);});read(actual,v=>vertices.push(v));
 for(const vertex of vertices){const at=vertex.slice(0,3).map(x=>Math.floor(x/cell));let found=false,best=Infinity,nearest=null;for(let z=-1;z<=1&&!found;z++)for(let y=-1;y<=1&&!found;y++)for(let x=-1;x<=1&&!found;x++)for(const candidate of grid.get([at[0]+x,at[1]+y,at[2]+z].join(','))||[]){const error=Math.max(...vertex.map((v,i)=>Math.abs(v-candidate[i])));if(error<best){best=error;nearest=candidate;}if(error<2e-5){found=true;break;}}assert.ok(found,'surface difference '+JSON.stringify({vertex,nearest,best}));}
}

test('a long manually assembled vine has the same exterior, normals and UVs as one authored curve',()=>{
 for(const detail of ['standard','swbf2']){const {whole,pieces}=vines();whole.detail=pieces.detail=detail;assert.equal(floraNeedsWeld(whole),false);assert.equal(floraNeedsWeld(pieces),false);const a=surface(whole),b=surface(pieces);try{sameExterior(b,a);}finally{disposePart(a);disposePart(b);}}
});

test('smooth vine rendering is independent of texture mapping flags and survives Finish and reload',()=>{
 const {pieces}=vines(),part=makePart('flora',{flora:pieces}),live=buildPart(part,{floraEditing:true,floraLive:true}),finished=buildPart(JSON.parse(JSON.stringify(part)));
 try{assert.deepEqual(triangles(finished),triangles(live));const reference=structuredClone(part);reference.flora.finishes.bark={preset:'forest-bark',scale:.3,mapping:'branch'};const ordinary=structuredClone(reference);delete ordinary.flora.finishes.bark.mapping;const a=buildPart(reference),b=buildPart(ordinary);try{assert.deepEqual(triangles(a),triangles(b));}finally{disposePart(a);disposePart(b);}}
 finally{disposePart(live);disposePart(finished);}
});

test('visible vine sections share boundary positions, side normals and both texture coordinates',()=>{
 const {pieces}=vines(),geometries=pieces.branches.map(b=>branchDisplayGeometry(pieces,b));
 try{for(let i=1;i<geometries.length;i++){const a=geometries[i-1],b=geometries[i],end=a.userData.floraSampleRings*13;for(let j=0;j<=12;j++)for(const attribute of ['position','normal','uv']){const pa=a.attributes[attribute],pb=b.attributes[attribute];for(let k=0;k<pa.itemSize;k++)assert.ok(Math.abs(pa.array[(end+j)*pa.itemSize+k]-pb.array[j*pb.itemSize+k])<2e-5,attribute+' crosses the join without a reset');}}}
 finally{geometries.forEach(g=>g.dispose());}
});

test('extending a full eight-joint branch continues the same limb and preserves existing attachments',()=>{
 const {whole}=vines(),root=whole.branches[0],leaf=addFloraAsset(whole,root.id,'flora-ginkgo-leaf',1),anchor=floraOrganPosition(whole,leaf),before=structuredClone(root),extended=extendFloraBranch(whole,root.id);
 assert.equal(whole.branches.length,2);assert.deepEqual(root,before);assert.equal(extended.parent,root.id);assert.equal(extended.at,1);assert.equal(extended.radii[0],root.radii.at(-1));assert.ok(floraOrganPosition(whole,leaf).distanceTo(anchor)<1e-6);assert.equal(floraNeedsWeld(whole),false);validateFlora(whole);
 const source=branchDisplayGeometry(whole,extended);try{assert.ok(source.attributes.position.count>24*13);}finally{source.dispose();}
});

test('extending an existing limb adds a joint without moving its older child joints or bark pins',()=>{
 const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');root.points=[[0,0,0],[1,2,0],[2,4,1]];root.radii=[.4,.3,.2];const child=addFloraAsset(f,root.id,'flora-elbow-branch',1),leaf=addFloraAsset(f,root.id,'flora-ginkgo-leaf',.3,0,{at:.3,branchSurface:{angle:0,pin:{triangle:40,bary:[.2,.3,.5]}}}),childBefore=floraCurve(f,child.id).getPoint(0),leafBefore=floraOrganPosition(f,leaf);
 const extended=extendFloraBranch(f,root.id);assert.equal(extended,root);assert.equal(root.points.length,4);assert.ok(floraCurve(f,child.id).getPoint(0).distanceTo(childBefore)<1e-6);assert.ok(floraOrganPosition(f,leaf).distanceTo(leafBefore)<.025);validateFlora(f);
});

test('adding a Basic Branch to a thick vine tip inherits its full girth without a narrowed section',()=>{
 const f=defaultFlora(),root=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');root.radii=[1.35,1.35];const child=addFloraAsset(f,root.id,'flora-basic-branch',1);assert.deepEqual(child.radii,[1.35,1.35]);assert.equal(floraNeedsWeld(f),false);validateFlora(f);
});
