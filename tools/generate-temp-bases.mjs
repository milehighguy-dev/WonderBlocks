// Bake independently authored review bases through the same field mesher used
// by editable plant bodies. Regeneration imports no old base mesh data.
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {TEMP_BASE_DESIGNS} from '../src/flora/temp-bases.js';
import {floraBodyGeometry} from '../src/flora/flora-body.js';
import {simplifySurface} from '../src/parts/surface-simplify.js';

const targets={stem:560,fork:900,crooked:780,bulbous:900,buttress:1200,stilt:1100},meshes={};
for(const design of TEMP_BASE_DESIGNS){
 const geometry=floraBodyGeometry({asset:design.id},'standard');if(!geometry)throw Error('Missing base field: '+design.id);
 try{
  const p=geometry.attributes.position,ix=geometry.index.array,positions=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i).toArray()),triangles=[];
  for(let i=0;i<ix.length;i+=3)triangles.push([...ix.slice(i,i+3)]);
  const span=geometry.boundingBox.getSize(new T.Vector3()),result=simplifySurface({positions,triangles},targets[design.id.slice(10)],{maximumError:span.length()*.006,preserveSmallFaces:true});
  // Split texture coordinates by dominant face direction. Bark keeps its scale
  // on root sides and cut surfaces rather than collapsing onto a single plane.
  const smooth=new T.BufferGeometry();smooth.setAttribute('position',new T.Float32BufferAttribute(result.positions.flat(),3));smooth.setIndex(result.triangles.flat());smooth.computeVertexNormals();
  const mesh={positions:[],normals:[],uv:[],indices:[]},vertices=new Map();
  for(const face of result.triangles){
   const [a,b,c]=face.map(i=>new T.Vector3(...result.positions[i])),n=b.clone().sub(a).cross(c.clone().sub(a)),axis=Math.abs(n.y)>Math.max(Math.abs(n.x),Math.abs(n.z))?'y':Math.abs(n.x)>Math.abs(n.z)?'x':'z';
   for(const old of face){const key=old+':'+axis;if(!vertices.has(key)){vertices.set(key,mesh.positions.length/3);const [x,y,z]=result.positions[old];mesh.positions.push(x,y,z);mesh.normals.push(...new T.Vector3().fromBufferAttribute(smooth.attributes.normal,old).toArray());mesh.uv.push(...(axis==='y'?[x,z]:axis==='x'?[z,y]:[x,y]));}mesh.indices.push(vertices.get(key));}
  }
  smooth.dispose();meshes[design.id]=mesh;console.log(design.id,triangles.length+' -> '+mesh.indices.length/3+' triangles');
 }finally{geometry.dispose();}
}
fs.writeFileSync(new URL('../src/flora/data/temp-base-meshes.js',import.meta.url),'// Baked from independent field definitions by tools/generate-temp-bases.mjs.\nexport const TEMP_BASE_MESHES='+JSON.stringify(meshes)+';\n');
