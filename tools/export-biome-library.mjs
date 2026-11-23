// Export the editable collection with the same object exporter used by the app.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {BIOME_PRESETS} from '../src/flora/data/biome-presets-data.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {makePart} from '../src/core/model.js';
import {createSWBF2Package} from '../src/swbf2/export-swbf2.js';

const destination=process.argv[2];
if(!destination)throw Error('Supply a new output folder for the native flora library.');
const root=path.resolve(destination);
if(fs.existsSync(root))throw Error('Output folder already exists: '+root);
fs.mkdirSync(root,{recursive:true});
const native=path.join(root,'native');fs.mkdirSync(native);
const colliding=new Set(['oak','birch','pine','spruce','rowan','kapok','fig','vined-fig','mangrove','vined-mangrove','cypress','pandanus','willow','alder','poplar','column-cactus','date-palm','tamarisk','sea-grape','coconut-palm','understory-palm']);
const seen=new Map(),records=[],parts=[];
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const spriteFolder=process.argv.find(a=>a.startsWith('--sprites='))?.slice(10);
const canopyFolder=process.argv.find(a=>a.startsWith('--canopies='))?.slice(11);
const clusterFolder=process.argv.find(a=>a.startsWith('--clusters='))?.slice(11),clusterIndex=clusterFolder?JSON.parse(fs.readFileSync(path.join(clusterFolder,'index.json'))):null;
for(const [i,spec] of BIOME_PRESETS.entries()){
 if(only&&!only.includes(spec.id.replace('biome-','')))continue;
 const short=spec.id.replace('biome-',''),name='af_'+short.replaceAll('-','_');
 const family=spec.family||short,solid=colliding.has(family);
 const part=makePart('flora',instantiateFloraTreePreset(spec.id));
 part.name=spec.name;
 const project={format:'open-building-studio',version:1,name,parts:[part]};
 const sprite=solid&&spriteFolder?JSON.parse(fs.readFileSync(path.join(spriteFolder,short+'.json'))):null;
 if(sprite)sprite.bytes=new Uint8Array(fs.readFileSync(path.join(spriteFolder,short+'.tga')));
 const canopyPath=canopyFolder&&path.join(canopyFolder,short,'canopy.json'),canopy=solid&&canopyPath&&fs.existsSync(canopyPath)?JSON.parse(fs.readFileSync(canopyPath)):null;
 if(canopy)for(const zone of canopy.zones){if(path.basename(zone.texture)!==zone.texture)throw Error('Invalid canopy image path.');zone.bytes=new Uint8Array(fs.readFileSync(path.join(path.dirname(canopyPath),zone.texture)));}
 const nativeLeafClusters=solid&&clusterIndex?Object.fromEntries((clusterIndex.plants[spec.id]??[]).map(key=>[key,{...clusterIndex.clusters[key],bytes:new Uint8Array(fs.readFileSync(path.join(clusterFolder,(clusterIndex.clusters[key].textureKey??key)+'.tga')))}])):null;
 const result=createSWBF2Package(project,{output:'object',classLabel:'prop',aiNavigation:false,lowDetail:true,maxTextureSize:256,shadows:false,includeCollision:solid,foliage:solid?'native':'static',collisionFamily:'af_'+family.replaceAll('-','_'),...(sprite?{nativeTreeSprite:sprite,nativeLeafDistance:180}:{}),...(canopy?{nativeTreeCanopy:canopy}:nativeLeafClusters?{nativeLeafClusters}:{})},{packZip:false});
 const folder=path.join(root,'plants',short);fs.mkdirSync(folder,{recursive:true});
 for(const [file,contents] of result.files){
  const data=typeof contents==='string'?Buffer.from(contents):Buffer.from(contents);
  const output=path.join(folder,file);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,data);
  if(file.startsWith('msh/')||file.startsWith('odf/')){
   const leaf=path.basename(file),hash=crypto.createHash('sha256').update(data).digest('hex');
   if(seen.has(leaf)&&seen.get(leaf)!==hash)throw Error('Native filename collision: '+leaf);
   if(!seen.has(leaf)){seen.set(leaf,hash);fs.writeFileSync(path.join(native,leaf),data);}
  }
 }
 const report=result.manifest;
 records.push({...spec,floraPreset:undefined,asset:name,mesh:report.asset.mesh,odf:report.asset.odf,collision:solid,assets:report.assets,primitiveBudget:report.primitiveBudget,renderCost:report.renderCost,warnings:report.warnings});
 part.position=[(i%8)*35,0,Math.floor(i/8)*35];parts.push(part);
 console.log(`${i+1}/${BIOME_PRESETS.length} ${short}: ${report.assets.reduce((n,a)=>n+(a.triangles||0)+(a.carrierTriangles||0),0)} / ${report.assets.reduce((n,a)=>n+(a.lowDetailTriangles||0),0)} triangles, ${report.assets.length} models`);
}
fs.writeFileSync(path.join(root,'library.json'),JSON.stringify({plants:records,nativeFiles:Object.fromEntries(seen)},null,2)+'\n');
fs.writeFileSync(path.join(root,'Biome Flora Collection.building.json'),JSON.stringify({format:'open-building-studio',version:1,name:'Biome Flora Collection',parts},null,2)+'\n');
console.log('Exported '+records.length+' editable plants and '+seen.size+' unique native files.');
