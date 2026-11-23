// Share compatible canopy images without changing each cloud's authored frame.
import fs from 'node:fs';import path from 'node:path';import {buildPart,disposePart} from '../src/core/geometry.js';import {makePart} from '../src/core/model.js';import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';import {exportMaterial,nativeLeafTexture} from '../src/swbf2/swbf2-textures.js';import {nativeLeafClusterKey} from '../src/swbf2/swbf2-tree-performance.js';import {crc32} from '../src/swbf2/swbf2-binary.js';
const [library,source,destination]=process.argv.slice(2);if(!destination)throw Error('Supply library, baked clouds and new destination.');fs.mkdirSync(destination,{recursive:true});const index=JSON.parse(fs.readFileSync(path.join(source,'index.json'))),groups=new Map();
for(const plant of JSON.parse(fs.readFileSync(library)).plants.filter(p=>p.collision)){
 const root=buildPart(makePart('flora',instantiateFloraTreePreset(plant.id)),{collision:false});try{root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.userData.floraBillboard)return;const s=mesh.geometry.userData.billboard.settings;if(s.count<=1)return;
  const native=nativeLeafTexture(exportMaterial(mesh.material,{maxTextureSize:256}),s.atlas,256),key=nativeLeafClusterKey(mesh,native.bytes),cluster=index.clusters[key];if(!cluster)throw Error('Missing baked cloud '+key);if(cluster.textureGroup)return;
  const spread=s.radius/Math.max(s.maxSize,.001),group=crc32(native.bytes).toString(16)+'|'+(s.count<=8?'open':'dense')+'|'+(spread<=.6?'compact':spread<=1.6?'medium':'wide');cluster.textureGroup=group;cluster.sourceTexture=native.texture;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(key);
 });}finally{disposePart(root);}
}
for(const keys of groups.values()){
 keys.sort((a,b)=>index.clusters[a].width/index.clusters[a].height-index.clusters[b].width/index.clusters[b].height);const representative=keys[Math.floor(keys.length/2)];
 for(const key of keys)index.clusters[key].textureKey=representative;
 for(const suffix of ['.tga','.png'])fs.copyFileSync(path.join(source,representative+suffix),path.join(destination,representative+suffix));
}
for(const [key,c] of Object.entries(index.clusters))if(!c.textureKey)throw Error('Uncatalogued cloud '+key);
index.sharing={originalTextures:Object.keys(index.clusters).length,sharedTextures:groups.size,individualCloudFramesPreserved:true};fs.writeFileSync(path.join(destination,'index.json'),JSON.stringify(index,null,2));console.log(JSON.stringify(index.sharing));
