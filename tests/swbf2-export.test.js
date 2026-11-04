import {SWBF2_VALIDATION_SCRIPT} from '../src/swbf2/swbf2-validation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makePart} from '../src/core/model.js';
import {defaultInterior} from '../src/interiors/interior.js';
import {defaultRoute} from '../src/routes/stair-route.js';
import {defaultHallway} from '../src/routes/hallway.js';
import {instantiateFloraTreePreset} from '../src/flora/flora-tree-presets.js';
import {planSWBF2,createSWBF2Package,createSWBF2PackageAsync} from '../src/swbf2/export-swbf2.js';
import {exportMaterial,exportUV,nativeLeafTexture} from '../src/swbf2/swbf2-textures.js';
import {textureFilename} from '../src/swbf2/swbf2-textures.js';
import {writeTGA} from '../src/swbf2/swbf2-binary.js';
const invisibleTexturePath='msh/'+textureFilename(writeTGA(16,16,new Uint8Array(16*16*4)));
const project=(parts,name='Exporter test')=>({format:'open-building-studio',version:1,name,parts});

test('export downloads omit the development validator and instructions in every format',()=>{
 for(const output of ['scene','object','mesh']){
  const result=createSWBF2Package(project([makePart('block')]),{output});
  assert.equal(result.files.has('validate-swbf2.ps1'),false);
  assert.ok(!result.manifest.files.includes('validate-swbf2.ps1'));
  assert.doesNotMatch(result.files.get('README.txt'),/validate-swbf2|_validation|ToolsPath/);
  assert.equal(Buffer.from(result.zip).includes(Buffer.from('validate-swbf2.ps1')),false);
 }
});
test('large scenes preserve every box without exhausting the global runtime primitive table',()=>{
 const parts=Array.from({length:134},(_,i)=>makePart('interior',{position:[i%14*20,1,Math.floor(i/14)*20],interior:defaultInterior()})),p=project(parts),before=JSON.stringify(p);
 const output=createSWBF2Package(p,{aiNavigation:false,shadows:false,lowDetail:false});
 assert.equal(output.manifest.primitiveBudget.requested,804);
 assert.equal(output.manifest.assets.reduce((n,a)=>n+(a.primitiveCollision??0),0),768);
 const meshes=output.manifest.assets.filter(a=>a.meshSerializedBoxes);
 assert.equal(meshes.reduce((n,a)=>n+a.meshSerializedBoxes,0),36);
 for(const asset of meshes){assert.ok(asset.maximumContactTriangles<=64);assert.equal(asset.maximumSampledCollisionErrorMetres,0);assert.equal(asset.collisionMask,'svbo');assert.ok(asset.collisionFacesPreserved);assert.match(output.files.get('msh/'+asset.name+'.msh.option'),/-donotmergecollision/);}
 assert.equal(JSON.stringify(p),before,'serialization must not change prepared object shapes');
 assert.match(SWBF2_VALIDATION_SCRIPT,/nativePrimitiveTotal -gt 768/);
});
test('opaque tree bark exports with depth-writing material and surface collision',()=>{
 const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),plan=planSWBF2(project([tree]));
 const bark=plan.assets.find(a=>a.preciseTreeCollision);assert.ok(bark);assert.equal(bark.primitives.length,0);assert.ok(bark.fallback.length);
 for(const s of bark.fallback)assert.equal(plan.materials[s.material].flags&28,0);
 const output=createSWBF2Package(project([tree])),skin=output.manifest.assets.find(a=>a.treeSurfaceCollision);
 assert.ok(skin);assert.equal(output.manifest.assets.find(a=>a.name===bark.name).primitiveCollision,0);assert.ok(!output.manifest.assets.some(a=>a.name.startsWith(bark.name+'_p')));assert.ok(!Buffer.from(output.files.get('msh/'+bark.name+'.msh')).includes(Buffer.from('SWCI')));assert.equal(skin.collisionMask,'svbo');assert.ok(skin.collisionFacesPreserved);assert.equal(skin.maximumSimplificationError,.05);
 const mat=new T.MeshStandardMaterial({side:T.DoubleSide});assert.equal(exportMaterial(mat,{opaqueSolid:true}).flags&12,0);
 mat.transparent=true;mat.opacity=.5;assert.equal(exportMaterial(mat,{opaqueSolid:true}).flags&12,12);
});
test('logical object groups merge, reflection preserves outward winding, and input stays unchanged',()=>{const parts=[makePart('block',{position:[3,0,2],rotation:[.2,.4,0],scale:[-2,3,1]}),makePart('block',{position:[6,0,2],scale:[2,1,1]})];parts.forEach(p=>{p.assemblyId='assembly';p.assemblyName='Hall';});const p=project(parts),before=JSON.stringify(p),plan=planSWBF2(p);assert.equal(plan.assets.length,1);assert.equal(plan.assets[0].partIds.length,2);assert.equal(plan.assets[0].segments.length,1);assert.equal(plan.assets[0].primitives.length,2);const asset=plan.assets[0];for(const s of asset.segments)for(const t of s.triangles){const [a,b,c]=t.map(i=>new T.Vector3(...s.positions[i])),normal=b.sub(a).cross(c.sub(a)).normalize(),n=new T.Vector3(...s.normals[t[0]]);assert.ok(normal.dot(n)>.999);}assert.equal(JSON.stringify(p),before);});
test('long routes retain original sections and placement while being split every six',()=>{const route=defaultRoute();route.segments=Array.from({length:14},(_,i)=>({kind:i%2?'landing':'stairs',run:3,rise:i%2?0:1,steps:4,turn:'straight',railing:{style:'none'}}));const part=makePart('stair-route',{route,position:[10,12,-4],rotation:[0,.3,0],scale:[1,1,1]});const plan=planSWBF2(project([part]));assert.equal(plan.assets.length,3);assert.deepEqual(plan.assets.map(a=>a.routeIndices),[[0,1,2,3,4,5],[6,7,8,9,10,11],[12,13]]);for(const a of plan.assets)assert.deepEqual(a.pivot,part.position);assert.ok(plan.assets[0].fallback.length);const output=createSWBF2Package(project([part]));assert.ok(output.files.has('world1/exporter_test_wonderblocks.lyr'));assert.match(output.files.get('world1/exporter_test_wonderblocks.lyr'),/ChildPosition\(10,12,-4\)/);assert.ok(output.manifest.assets.every(a=>!a.primitiveCollision||a.primitiveCollision<=64));});
test('interior door openings remain clear in primitive collision and use separate interior/exterior assets',()=>{const interior=defaultInterior();interior.doors=[{axis:'x',line:0,offset:3,width:1.2,height:2.2}];const plan=planSWBF2(project([makePart('interior',{interior})]));assert.ok(plan.assets.some(a=>a.role==='interior'));assert.ok(plan.assets.some(a=>a.role==='exterior'));const intersects=(p,point)=>{const matrix=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion(...p.rotation),new T.Vector3(1,1,1)),local=point.clone().applyMatrix4(matrix.invert());return local.toArray().every((v,i)=>Math.abs(v)<p.dimensions[i]-1e-5);};const primitives=plan.assets.flatMap(a=>a.primitives);assert.ok(primitives.length>4);assert.ok(!primitives.some(p=>intersects(p,new T.Vector3(3,1,0))));assert.ok(primitives.some(p=>intersects(p,new T.Vector3(1,1,0))));});

test('interior props and route railings export as separate details',()=>{const route=defaultRoute();route.segments=[{...route.segments[0],kind:'landing',hallway:defaultHallway()},{...route.segments[0],kind:'landing',railing:{style:'posts',sides:'both',height:1.2,spacing:2,postWidth:.12,railWidth:.1,railHeight:.1}}];const prop=makePart('block',{interiorProp:true}),plan=planSWBF2(project([prop,makePart('stair-route',{route})]));assert.equal(plan.assets.find(a=>a.partIds.includes(prop.id)).role,'details');assert.ok(plan.assets.some(a=>a.role==='interior'));assert.ok(plan.assets.some(a=>a.role==='details'&&a.routeIndices.length));});
test('native trees retain game-facing foliage with local textures and no character reference',()=>{const tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),parts=[tree,makePart('character-reference')];const output=createSWBF2Package(project(parts));assert.ok(output.manifest.assets.some(a=>a.nativeLeafPatches>0));assert.ok([...output.files].some(([name,text])=>name.endsWith('.odf')&&text.includes('ClassLabel = "leafpatch"')));assert.ok(output.manifest.assets.every(a=>!a.sourcePartIds?.includes(parts[1].id)));for(const [path,text] of output.files)if(path.endsWith('.odf'))for(const match of text.matchAll(/Texture = "([^"]+)"/g))assert.ok(output.files.has('msh/'+match[1]+'.tga'));assert.ok(output.manifest.assets.filter(a=>a.role!=='collision').every(a=>a.triangles>0));});
test('texture tint, alpha and native single-image leaves survive export',()=>{const data=new Uint8Array([200,100,50,23]),map=new T.DataTexture(data,1,1,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;const mat=new T.MeshStandardMaterial({map,color:0xffffff}),opaque=exportMaterial(mat);assert.equal(opaque.bytes[16],24);assert.deepEqual([...opaque.bytes.slice(18,21)],[50,100,200]);mat.alphaTest=.4;const alpha=exportMaterial(mat);assert.equal(alpha.bytes[16],32);assert.equal(alpha.bytes[21],23);const leaf=nativeLeafTexture(alpha,1);assert.equal(leaf.bytes[16],32);const view=new DataView(leaf.bytes.buffer);assert.equal(view.getUint16(12,true),2);});

test('independent color and cutout transforms bake together without moving the leaf mask',()=>{
 const map=new T.DataTexture(new Uint8Array([255,0,0,255,0,255,0,255,0,0,255,255,255,255,0,255]),4,1,T.RGBAFormat),alphaMap=new T.DataTexture(new Uint8Array([0,0,0,255,0,0,0,255,255,255,255,255,255,255,255,255]),4,1,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.wrapS=alphaMap.wrapS=T.RepeatWrapping;map.repeat.x=2;const mat=new T.MeshStandardMaterial({map,alphaMap,alphaTest:.4}),baked=exportMaterial(mat);assert.ok(baked.uvRange);assert.deepEqual(exportUV(mat,.625,.5,baked.uvRange),[.625,.5]);assert.deepEqual([...baked.bytes.slice(18)],[0,255,0,0,0,255,255,0,0,255,0,255,0,255,255,255]);
 alphaMap.repeat.x=2;const shared=exportMaterial(mat);assert.equal(shared.uvRange,null);assert.deepEqual(exportUV(mat,.3,.5),[.6,.5]);assert.deepEqual([...shared.bytes.slice(18)],[0,0,255,0,0,255,0,0,255,0,0,255,0,255,255,255]);
 const billboard=exportMaterial(mat,{bakeUV:true});assert.ok(billboard.uvRange);assert.deepEqual([...billboard.bytes.slice(18)],[0,255,0,0,0,255,255,255,0,255,0,0,0,255,255,255]);
});
test('settings reject invalid split lengths and optional collision preservation is packaged',()=>{assert.throws(()=>planSWBF2(project([makePart('block')]),{routeSections:0}),/1–24/);const result=createSWBF2Package(project([makePart('archbody')]),{preserveCollision:true});assert.ok([...result.files].some(([p,s])=>p.endsWith('.msh.option')&&s==='-donotmergecollision\n'));});

test('clamped texture regions retain edge colours beyond the first UV tile',()=>{
 const map=new T.DataTexture(new Uint8Array([255,0,0,255,0,0,255,255]),2,1,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.repeat.x=2;const mat=new T.MeshStandardMaterial({map}),exported=exportMaterial(mat);
 assert.equal(exported.width,4);assert.deepEqual(exportUV(mat,.875,.5,exported.uvRange),[.875,.5]);assert.deepEqual([...exported.bytes.slice(18)],[0,0,255,255,0,0,255,0,0,255,0,0]);
 map.repeat.x=1;const extended=exportMaterial(mat,{uvBounds:[-1,0,2,1]});assert.deepEqual(exportUV(mat,-.5,.5,extended.uvRange),[1/6,.5]);assert.deepEqual([...extended.bytes.slice(18,30)],[0,0,255,0,0,255,0,0,255,0,0,255]);assert.deepEqual([...extended.bytes.slice(-12)],[255,0,0,255,0,0,255,0,0,255,0,0]);
});

test('mirrored texture tiles bake their reversed direction and keep ordinary repeats tiled',()=>{
 const map=new T.DataTexture(new Uint8Array([255,0,0,255,0,0,255,255]),2,1,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.MirroredRepeatWrapping;map.repeat.x=2;const mat=new T.MeshStandardMaterial({map}),exported=exportMaterial(mat);
 assert.equal(exported.width,4);assert.deepEqual([...exported.bytes.slice(18)],[0,0,255,255,0,0,255,0,0,0,0,255]);map.wrapS=T.RepeatWrapping;const tiled=exportMaterial(mat);assert.equal(tiled.uvRange,null);assert.equal(tiled.width,2);assert.deepEqual(exportUV(mat,.875,.5,tiled.uvRange),[1.75,.5]);
});

test('async export has the same bytes as sync export and can be canceled without changing the scene',async()=>{const p=project([makePart('block')]),before=JSON.stringify(p),sync=createSWBF2Package(p),progress=[];const asyncResult=await createSWBF2PackageAsync(p,{}, {onProgress:s=>progress.push(s.phase)});assert.deepEqual(asyncResult.zip,sync.zip);assert.ok(progress.includes('Packing download'));const controller=new AbortController();await assert.rejects(createSWBF2PackageAsync(p,{}, {signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});assert.equal(JSON.stringify(p),before);});

test('package contains a complete file inventory and alternate layers cannot load twice by default',()=>{const p=project([makePart('block')]),result=createSWBF2Package(p);assert.deepEqual(new Set(result.manifest.files),new Set(result.files.keys()));assert.match(result.files.get('world1/exporter_test.ldx'),/Layer\("\[Base\]",0,8\)/);assert.doesNotMatch(result.files.get('world1/exporter_test.ldx'),/wonderblocks/);assert.match(SWBF2_VALIDATION_SCRIPT,/Get-CollisionMasks/);assert.match(result.files.get('README.txt'),/Including both duplicates/);assert.deepEqual(JSON.parse(result.files.get(result.manifest.sourceProject)),p);});


test('collision-only world assets have a fully cutout render carrier',()=>{
 const route=defaultRoute();const output=createSWBF2Package(project([makePart('stair-route',{route})])),helpers=output.manifest.assets.filter(a=>a.role==='collision');
 assert.ok(helpers.length);
 const tga=output.files.get(invisibleTexturePath),header=new DataView(tga.buffer,tga.byteOffset,tga.byteLength);assert.ok(header.getUint16(12,true)>=16&&header.getUint16(14,true)>=16,'invisible helpers must have a renderer-compatible texture base size');assert.equal(tga[16],32);for(let i=21;i<tga.length;i+=4)assert.equal(tga[i],0);
 assert.match(output.files.get(invisibleTexturePath+'.option'),/-maps 1 -format a8r8g8b8/,'do not allow runtime mip selection to produce a sub-block compressed helper texture');
 for(const a of helpers){assert.equal(a.carrierTriangles,2);const bytes=output.files.get('msh/'+a.name+'.msh');assert.ok(new TextDecoder().decode(bytes).includes('invisible_carrier'));}
 assert.ok(!createSWBF2Package(project([makePart('block')])).files.has(invisibleTexturePath));
});


test('collision can be excluded without changing visible geometry, foliage, LODs, shadows or AI',()=>{
 const route=defaultRoute(),p=project([makePart('block',{position:[30,0,0]}),makePart('stair-route',{route}),makePart('flora',{...instantiateFloraTreePreset('endor-woodland-tree'),position:[-30,0,0]})]),before=JSON.stringify(p);
 const included=createSWBF2Package(p),excluded=createSWBF2Package(p,{includeCollision:false,preserveCollision:true});
 assert.equal(included.manifest.settings.includeCollision,true);assert.equal(excluded.manifest.settings.includeCollision,false);
 assert.ok(included.manifest.assets.some(a=>a.primitiveCollision>0));assert.ok(included.manifest.assets.some(a=>a.treeSurfaceCollision));
 assert.ok(excluded.manifest.assets.every(a=>!a.collisionBodies.length&&!a.primitiveCollision&&!a.ordnanceCollision&&!a.collisionTriangles&&a.role!=='collision'));
 assert.equal(excluded.manifest.primitiveBudget.requested,0);assert.equal(excluded.manifest.primitiveBudget.nativeCollisionMeshes,0);
 assert.ok(!excluded.manifest.assets.some(a=>a.carrierTriangles));
 const chunks=bytes=>{const result=[];for(let at=0;at<bytes.length;){const size=new DataView(bytes.buffer,bytes.byteOffset+at+4,4).getUint32(0,true);assert.ok(at+8+size<=bytes.length);result.push({tag:new TextDecoder().decode(bytes.subarray(at,at+4)),bytes:bytes.subarray(at+8,at+8+size)});at+=8+size;}return result;};
 const models=bytes=>{const hed=chunks(bytes).find(c=>c.tag==='HEDR'),msh=chunks(hed.bytes).find(c=>c.tag==='MSH2');return chunks(msh.bytes).filter(c=>c.tag==='MODL').map(c=>{const fields=chunks(c.bytes);return {name:new TextDecoder().decode(fields.find(f=>f.tag==='NAME').bytes).replace(/\0.*$/s,''),fields};});};
 for(const [name,bytes] of excluded.files){
  if(name.endsWith('.msh')){
   assert.match(excluded.files.get(name+'.option'),/^-nocollision$/m);assert.doesNotMatch(excluded.files.get(name+'.option'),/-donotmergecollision/);
   const actual=models(bytes),expected=models(included.files.get(name));
   assert.ok(actual.every(m=>!m.name.startsWith('collision')&&!m.name.startsWith('p_-')&&!m.fields.some(f=>f.tag==='SWCI')));
   for(const model of actual){const source=expected.find(m=>m.name===model.name);assert.ok(source);assert.deepEqual(model.fields.filter(f=>f.tag!=='MNDX'),source.fields.filter(f=>f.tag!=='MNDX'),name+' / '+model.name);}
  }
  if(name.endsWith('.tga')||name.endsWith('.odf')||name.endsWith('.pln')||name.endsWith('.bar'))assert.deepEqual(bytes,included.files.get(name),name);
 }
 assert.deepEqual(excluded.files.get('source/ai-navigation.json'),included.files.get('source/ai-navigation.json'));
 assert.match(excluded.files.get('README.txt'),/Physical collision was excluded/);
 assert.equal(JSON.stringify(p),before);
 assert.throws(()=>planSWBF2(p,{includeCollision:'false'}),/Invalid export option: includeCollision/);
});


test('standalone assets combine object groups in one MSH with a bottom-center origin and optional ODF',()=>{
 const parts=[makePart('block',{position:[14,8,-9],rotation:[0,.3,0],scale:[2,3,4]}),makePart('pillar',{position:[17,8,-7],scale:[1,2,1]})];for(const p of parts){p.assemblyId='group';p.assemblyName='Bridge tower';}
 const p=project(parts,'Bridge tower'),before=JSON.stringify(p);
 for(const output of ['object','mesh']){
  const result=createSWBF2Package(p,{output}),plan=planSWBF2(p,{output}),asset=result.manifest.asset;
  assert.equal(plan.assets.length,1);assert.equal(result.manifest.objects,1);assert.equal(result.manifest.settings.aiNavigation,false);
  assert.equal([...result.files.keys()].filter(n=>n.endsWith('.msh')).length,1);assert.equal([...result.files.keys()].filter(n=>n.endsWith('.odf')).length,output==='object'?1:0);
  assert.equal([...result.files.keys()].some(n=>n.startsWith('world1/')||n.includes('ai-navigation')),false);
  assert.ok(result.files.has(asset.mesh));if(output==='object')assert.ok(result.files.has(asset.odf));else assert.equal(asset.odf,undefined);
  const positions=plan.assets[0].segments.flatMap(s=>s.positions),bounds=new T.Box3().setFromPoints(positions.map(p=>new T.Vector3(...p))),center=bounds.getCenter(new T.Vector3());
  assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(Math.abs(center.x)<1e-6&&Math.abs(center.z)<1e-6);assert.deepEqual(asset.origin,plan.assets[0].pivot);
  assert.deepEqual(new Set(result.manifest.files),new Set(result.files.keys()));
 }
 assert.equal(JSON.stringify(p),before);
 assert.throws(()=>planSWBF2(p,{output:'unknown'}),/Choose scene/);
 const named=name=>createSWBF2Package(project([makePart('block')],name),{output:'mesh',includeCollision:false}).manifest.asset.mesh;
 assert.notEqual(named('Wookiee landing platform blue'),named('Wookiee landing platform green'),'long asset names must not collide after truncation');
});

test('standalone ODF attaches required collision resources without changing their shape or masks',()=>{
 const route=defaultRoute(),p=project([makePart('stair-route',{route})]);
 const result=createSWBF2Package(p,{output:'object'}),main=result.manifest.asset,helpers=result.manifest.assets.filter(a=>a.role==='collision');assert.ok(helpers.length);
 const odf=result.files.get(main.odf),mesh=new TextDecoder().decode(result.files.get(main.mesh));
 for(const [i,helper] of helpers.entries()){assert.ok(odf.includes('AttachOdf = "'+helper.name+'"'));assert.ok(odf.includes('AttachToHardPoint = "hp_collision_'+i+'"'));assert.ok(mesh.includes('hp_collision_'+i));assert.ok(result.files.has('msh/'+helper.name+'.msh'));assert.ok(result.files.has('odf/'+helper.name+'.odf'));}
 assert.throws(()=>createSWBF2Package(p,{output:'mesh'}),/Choose MSH \+ ODF.*uncheck Include collision/);
 const meshOnly=createSWBF2Package(p,{output:'mesh',includeCollision:false});assert.equal([...meshOnly.files.keys()].filter(n=>n.endsWith('.msh')).length,1);assert.equal(meshOnly.manifest.asset.collisionHelpers.length,0);
});

test('standalone trees bake all leaf patches into a single textured MSH without ODF dependencies',()=>{
 const p=project([makePart('flora',instantiateFloraTreePreset('endor-woodland-tree'))]),settings={output:'mesh',includeCollision:false,shadows:false,lowDetail:false};
 const native=createSWBF2Package(p,{includeCollision:false,shadows:false,lowDetail:false}),asset=createSWBF2Package(p,settings),plan=planSWBF2(p,settings);
 assert.ok(native.manifest.assets.some(a=>a.nativeLeafPatches>0));assert.equal(asset.manifest.assets.length,1);assert.equal(asset.manifest.assets[0].nativeLeafPatches,0);
 assert.ok(asset.manifest.assets[0].triangles>native.manifest.assets.reduce((n,a)=>n+(a.role==='collision'?0:a.triangles),0));
 assert.ok(plan.assets[0].segments.some(s=>s.colors?.length));assert.ok(plan.materials.some(m=>m.flags&16));
 assert.equal([...asset.files.keys()].filter(n=>n.endsWith('.msh')).length,1);assert.equal([...asset.files.keys()].filter(n=>n.endsWith('.odf')).length,0);
 assert.deepEqual(createSWBF2Package(p,settings).zip,asset.zip);
});


test('every exported mesh and texture has a compiler option companion in all formats',()=>{
 const route=makePart('stair-route'),tree=makePart('flora',instantiateFloraTreePreset('endor-woodland-tree')),block=makePart('block'),p=project([route,tree,block]);
 for(const output of ['scene','object','mesh']){
  const result=createSWBF2Package(p,{output,includeCollision:output!=='mesh',aiNavigation:false,shadows:false,lowDetail:false});
  const assets=[...result.files.keys()].filter(n=>n.endsWith('.msh')||n.endsWith('.tga'));assert.ok(assets.length);
  for(const name of assets){
   assert.ok(result.files.has(name+'.option'),name);assert.ok(result.manifest.files.includes(name+'.option'));
   if(name.endsWith('.tga'))assert.match(result.files.get(name+'.option'),/-format (compressed|a8r8g8b8)/);
  }
  if(output==='scene'){assert.ok(result.files.has(invisibleTexturePath+'.option'));assert.equal(result.files.get(invisibleTexturePath+'.option'),'-maps 1 -format a8r8g8b8\n');}
 }
 const normal=createSWBF2Package(project([block]),{aiNavigation:false});assert.equal(normal.files.get('msh/'+normal.manifest.assets[0].name+'.msh.option'),'\n','native defaults require no invented mesh flags');
});
