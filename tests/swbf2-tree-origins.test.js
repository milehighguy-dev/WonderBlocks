import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {createSWBF2Package,planSWBF2} from '../src/swbf2/export-swbf2.js';

const text=b=>new TextDecoder().decode(b).replace(/\0.*$/s,'');
function chunks(b){const out=[],v=new DataView(b.buffer,b.byteOffset,b.byteLength);for(let at=0;at+8<=b.length;){const n=v.getUint32(at+4,true);assert.ok(at+8+n<=b.length);out.push({tag:text(b.slice(at,at+4)),bytes:b.slice(at+8,at+8+n)});at+=8+n;}return out;}
function models(bytes){const msh=chunks(chunks(bytes).find(c=>c.tag==='HEDR').bytes).find(c=>c.tag==='MSH2');return chunks(msh.bytes).filter(c=>c.tag==='MODL').map(c=>{const f=chunks(c.bytes),x=f.find(c=>c.tag==='TRAN').bytes,v=new DataView(x.buffer,x.byteOffset,x.byteLength),a=Array.from({length:10},(_,i)=>v.getFloat32(i*4,true));return {name:text(f.find(c=>c.tag==='NAME').bytes),parent:text(f.find(c=>c.tag==='PRNT')?.bytes??new Uint8Array()),matrix:new T.Matrix4().compose(new T.Vector3(...a.slice(7)),new T.Quaternion(...a.slice(3,7)),new T.Vector3(...a.slice(0,3))),fields:f};});}

test('tree helper origins follow distributed geometry while bark collision remains in place',()=>{
 const p={format:'open-building-studio',version:1,name:'Mangrove origin regression',parts:[makePart('flora',instantiateFloraTreePreset('biome-mangrove'))]},options={output:'object',classLabel:'prop',shadows:false,aiNavigation:false,lowDetail:true,maxTextureSize:256},plan=planSWBF2(p,options),result=createSWBF2Package(p,options,{packZip:false}),origins=[],physical=[];
 const walk=(name,frame)=>{
  const odf=result.files.get('odf/'+name+'.odf'),mesh=odf.match(/GeometryName\s*=\s*"([^"\n]+)"/)[1].replace(/\.msh$/,''),nodes=models(result.files.get('msh/'+mesh+'.msh')),byName=new Map(nodes.map(n=>[n.name,n]));
  const nodeFrame=name=>{const n=byName.get(name);assert.ok(n,'attachment hardpoint exists: '+name);return n.parent?nodeFrame(n.parent).multiply(n.matrix):n.matrix.clone();};
  origins.push(new T.Vector3().setFromMatrixPosition(frame));
  for(const resource of new Set([...odf.matchAll(/GeometryName\s*=\s*"([^"\n]+)"/g)].map(m=>m[1].replace(/\.msh$/,'')))){
   const collisionNodes=models(result.files.get('msh/'+resource+'.msh')),map=new Map(collisionNodes.map(n=>[n.name,n])),pose=name=>{const n=map.get(name);return n.parent?pose(n.parent).multiply(n.matrix):n.matrix.clone();};
   for(const node of collisionNodes.filter(n=>n.name.startsWith('collision'))){const transform=frame.clone().multiply(pose(node.name));for(const geom of node.fields.filter(f=>f.tag==='GEOM'))for(const seg of chunks(geom.bytes).filter(f=>f.tag==='SEGM')){const pos=chunks(seg.bytes).find(f=>f.tag==='POSL');if(!pos)continue;const v=new DataView(pos.bytes.buffer,pos.bytes.byteOffset,pos.bytes.byteLength);for(let i=0;i<v.getUint32(0,true);i++)physical.push(new T.Vector3(...[0,1,2].map(j=>v.getFloat32(4+i*12+j*4,true))).applyMatrix4(transform));}}
  }
  for(const pair of odf.matchAll(/AttachOdf\s*=\s*"([^"\n]+)"\s*\nAttachToHardPoint\s*=\s*"([^"\n]+)"/g))walk(pair[1],frame.clone().multiply(nodeFrame(pair[2])));
 };
 walk(result.manifest.asset.odf.slice(4,-4),new T.Matrix4());
 const coincident=new Map();for(const p of origins){const key=[p.x,p.z].map(n=>Math.round(n*1e4)).join(',');coincident.set(key,(coincident.get(key)||0)+1);}
 assert.ok(Math.max(...coincident.values())<=10,'helper origins follow the distributed tree geometry');
 const expected=plan.assets.flatMap(a=>a.bodies.flatMap(b=>(b.surface?.positions??[]).map(p=>new T.Vector3(-p[0],p[1],p[2]))));
 assert.ok(physical.length&&expected.length);
 const matches=(a,b)=>a.every(p=>b.some(q=>p.distanceToSquared(q)<4e-8));
 assert.ok(matches(physical,expected),'rebased helper collision vertices retain their source positions');
 assert.ok(matches(expected,physical),'no bark collision surface was discarded');
 assert.ok(result.manifest.assets.filter(a=>a.role==='collision').every(a=>a.helperOffset));
 assert.ok(result.manifest.assets.filter(a=>a.role==='collision').length>2,'physical bark partitions retain independent prop ownership');
 for(const a of result.manifest.assets.filter(a=>a.role==='collision')){assert.equal(a.collisionBodies.length,1);const odf=result.files.get('odf/'+a.name+'.odf');assert.equal(new Set([...odf.matchAll(/GeometryName\s*=\s*"([^"]+)"/g)].map(m=>m[1].replace(/\.msh$/,''))).size,1);}
});
