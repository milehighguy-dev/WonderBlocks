import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {reviewContactPolygons} from '../src/swbf2/swbf2-contact-review.js';

const args=process.argv.slice(2),at=args.indexOf('--output');if(at<0||!args[at+1])throw Error('Usage: node tools/review-native-collision.mjs --output REPORT.json COMPILED_DIR ...');
const output=args[at+1];args.splice(at,2);if(!args.length)throw Error('Supply compiled model directories.');
function chunks(bytes){
 const result=[];let at=0;while(at+8<=bytes.length){const tag=bytes.toString('ascii',at,at+4),size=bytes.readUInt32LE(at+4);if(at+8+size>bytes.length)throw Error('Invalid native chunk '+tag);result.push([tag,bytes.subarray(at+8,at+8+size)]);at=(at+8+size+3)&~3;}return result;
}
const models=[];
for(const dir of args)for(const file of (await readdir(dir)).filter(n=>n.endsWith('.model')).sort()){
 const bytes=await readFile(path.join(dir,file)),container=new Map(chunks(bytes)).get('ucfb');if(!container)throw Error('Missing ucfb: '+file);
 const model={name:path.basename(file,'.model'),sha256:createHash('sha256').update(bytes).digest('hex'),primitiveCount:0,primitiveMasks:[],meshes:[]};
 for(const [tag,payload] of chunks(container)){
  if(tag==='prim'){for(const [kind,value] of chunks(payload))if(kind==='DATA')model.primitiveCount++;else if(kind==='MASK')model.primitiveMasks.push(value[0]);}
  if(tag!=='coll')continue;
  const fields=new Map(chunks(payload)),mask=fields.get('MASK')?.[0]??31,raw=fields.get('POSI'),positions=Array.from({length:raw.length/12},(_,i)=>[0,1,2].map(j=>raw.readFloatLE(i*12+j*4))),polygons=[];
  for(const [kind,leaf] of chunks(fields.get('TREE')))if(kind==='LEAF'){
   const count=leaf[0];if(count>100)throw Error('Native polygon exceeds 100 vertices: '+file);
   // Compiled collision polygons use the opposite winding from source meshes.
   polygons.push(Array.from({length:count},(_,i)=>positions[leaf.readUInt16LE(7+i*2)]).reverse());
  }
  const review=reviewContactPolygons(polygons,mask);review.basis='compiled-polygons';model.meshes.push({mask,polygons:polygons.length,review});
 }
 models.push(model);
 console.log(model.name+': '+model.primitiveCount+' primitives; '+model.meshes.map(m=>m.polygons+' polygons, mask '+m.mask+', infantry '+m.review.infantry.maximumVertices+' / vehicle '+m.review.vehicle.maximumVertices+' candidate vertices').join('; '));
}
await writeFile(output,JSON.stringify({method:'PC ModelMunge output; sampled exterior infantry and two vehicle AABBs. Candidate counts are advisory; reachability and runtime movement are not tested.',models},null,2)+'\n');
