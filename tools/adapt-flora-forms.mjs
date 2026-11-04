// Offline adaptation of the approved reference silhouettes. No source textures,
// animation samples, asset IDs or format-specific importer code ship at runtime.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as T from '../vendor/three.module.js';
import {simplifySurface} from '../src/parts/surface-simplify.js';
import {skinBone,floraSkinGeometry} from '../src/flora/flora-skin.js';
import {FLORA_DESIGNS} from '../src/flora/data/procedural-flora-definitions.js';
import {BARK_BRANCH_PARTS} from '../src/flora/bark-branches.js';
import {MODELED_LEAF_PARTS} from '../src/flora/modeled-leaves.js';

const [directory,mappingFile]=process.argv.slice(2);if(!directory||!mappingFile)throw Error('Pass the reference directory and ID mapping file.');
const load=name=>import(pathToFileURL(path.resolve(directory,name))),catalogue=await load('catalogue.js'),source=catalogue.NATIVE_FLORA||catalogue.PROCEDURAL_FLORA,{FLORA_SKELETONS}=await load('assembly-skeletons.js'),{FLORA_BODY_FIELDS}=await load('body-fields.js'),{FLORA_MUSCLES}=await load('muscle-shapes.js'),ids=JSON.parse(fs.readFileSync(mappingFile,'utf8')),forms={},report=[];
const round=x=>Math.round(x*1e6)/1e6;
function reduced(mesh,target,rotate=false){
 const positions=[],mapping=[],unique=new Map();for(let i=0;i<mesh.positions.length;i+=3){const p=rotate?[mesh.positions[i],mesh.positions[i+2],-mesh.positions[i+1]]:mesh.positions.slice(i,i+3),key=p.map(x=>Math.round(x*1e6)).join(',');if(!unique.has(key)){unique.set(key,positions.length);positions.push(p);}mapping.push(unique.get(key));}
 const triangles=[];for(let i=0;i<mesh.indices.length;i+=3){const t=mesh.indices.slice(i,i+3).map(j=>mapping[j]);if(new Set(t).size===3)triangles.push(t);}
 const bounds=new T.Box3().setFromPoints(positions.map(p=>new T.Vector3(...p))),span=bounds.getSize(new T.Vector3()),result=simplifySurface({positions,triangles},target,{maximumError:span.length()*.004,preserveSmallFaces:true});
 return {positions:result.positions.flat().map(round),indices:result.triangles.flat(),uv:result.positions.flatMap(p=>[Math.atan2(p[2],p[0])/(Math.PI*2),p[1]/Math.max(.1,span.x*1.5)]).map(round)};
}
const authoredParts=new Set([...BARK_BRANCH_PARTS,...MODELED_LEAF_PARTS].map(part=>part.id));
for(const [old,id] of Object.entries(ids).filter(([,id])=>FLORA_DESIGNS.some(d=>d[0]===id)&&!authoredParts.has(id))){
 const design=FLORA_DESIGNS.find(d=>d[0]===id),kind=design[2],entry=source.find(a=>a.id===old);if(id==='flora-basic-branch'||id==='flora-basic-trunk')continue;
 if(kind==='profile'){
  const profile=FLORA_MUSCLES[old],mesh=reduced(profile.mesh,200),points=profile.points,radii=profile.radii,bindings=[];
  for(let i=0;i<mesh.positions.length;i+=3){const p=new T.Vector3().fromArray(mesh.positions,i);let best=Infinity,at=0;for(let j=0;j<points.length-1;j++){const a=new T.Vector3(...points[j]),d=new T.Vector3(...points[j+1]).sub(a),t=T.MathUtils.clamp(p.clone().sub(a).dot(d)/d.lengthSq(),0,1),distance=a.addScaledVector(d,t).distanceToSquared(p);if(distance<best){best=distance;at=(j+t)/(points.length-1);}}bindings.push(round(at));}
  mesh.bindings=bindings;forms[id]={profile:{points,radii,length:profile.length,joints:2,mesh}};
 }else if(kind==='body'){
  const edges=FLORA_BODY_FIELDS[old].map(({start,end,radii,groups})=>({start,end,radii:radii||[FLORA_SKELETONS[old].find(n=>n.id===start).radius*2,FLORA_SKELETONS[old].find(n=>n.id===end).radius*2],groups})),active=new Set(edges.flatMap(e=>[e.start,e.end])),skeleton=FLORA_SKELETONS[old].filter(n=>active.has(n.id)),bones=[];
  for(const edge of edges){const a=new T.Vector3(...skeleton.find(n=>n.id===edge.start).point),b=new T.Vector3(...skeleton.find(n=>n.id===edge.end).point);for(const group of edge.groups){let previous;for(const sample of group){const girth=T.MathUtils.lerp(...edge.radii,sample.t),point=a.clone().lerp(b,sample.t).addScaledVector(new T.Vector3(...sample.offset),girth/.1),radius=girth*sample.radius;if(previous)bones.push(skinBone(previous.point,point,previous.radius,radius,id));previous={point,radius};}}}
  const geometry=floraSkinGeometry(bones,'swbf2'),mesh={positions:[...geometry.attributes.position.array],indices:[...geometry.index.array],uv:[...geometry.attributes.uv.array]};geometry.dispose();forms[id]={skeleton,edges,meshes:[mesh]};
 }else if(kind==='leaf'){
  // Preserve each reference's individual leaflets, folds and compound silhouette.
  // The plain source diffuse is replaced by a BF2 leaf atlas at runtime.
  forms[id]={meshes:entry.meshes.map(m=>({positions:m.positions.flatMap((x,i)=>i%3===0?[x,m.positions[i+2],-m.positions[i+1]]:[]),indices:m.indices,uv:m.uv}))};
 }else forms[id]={meshes:entry.meshes.map(m=>reduced(m,kind==='base'?24:240,true))};
 const form=forms[id],meshes=form.meshes||[form.profile.mesh];report.push({id,triangles:meshes.reduce((n,m)=>n+m.indices.length/3,0),joints:form.skeleton?.length||0});
 console.log(id,report.at(-1).triangles);
}
fs.writeFileSync(new URL('../src/flora/data/bf2-flora-forms.js',import.meta.url),'// BF2-style adaptations of the approved part-form references.\n// Silhouettes and joint layouts are reference-derived; wood uses new reduced topology and BF2 materials.\nexport const BF2_FLORA_FORMS='+JSON.stringify(forms)+';\n');
fs.writeFileSync(path.resolve('../../work/bf2-flora-adaptation-report.json'),JSON.stringify(report,null,2));
