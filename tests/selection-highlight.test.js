import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createSelectionHighlight} from '../src/editor/selection-highlight.js';
import {exportScope} from '../src/swbf2/swbf2-export-scope.js';
import {defaultHallwayRoute} from '../src/routes/hallway.js';
import {makePart} from '../src/core/model.js';

test('selection tint follows exact visible geometry without changing source data or owning its resources',()=>{
 const scene=new T.Scene(),root=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial({color:0x123456,alphaTest:.5}),mesh=new T.Mesh(geometry,material);root.add(mesh);scene.add(root);
 const original=root.toJSON(),highlight=createSelectionHighlight(scene);let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);
 highlight.set([root]);assert.equal(highlight.group.children.length,1);const overlay=highlight.group.children[0];assert.equal(overlay.geometry,geometry);assert.equal(overlay.material.color.getHex(),0xffd43b);assert.equal(overlay.material.depthWrite,false);assert.equal(overlay.material.alphaTest,.5*overlay.material.opacity,'cutout threshold follows overlay opacity so leaves remain highlighted');assert.notEqual(overlay.material,material);
 root.position.set(3,4,5);highlight.update();assert.deepEqual(overlay.matrix.elements,mesh.matrixWorld.elements);root.visible=false;highlight.update();assert.equal(overlay.visible,false);
 root.visible=true;root.position.set(0,0,0);root.updateMatrixWorld(true);highlight.set([]);assert.equal(highlight.group.children.length,0);assert.equal(disposed,false);assert.deepEqual(root.toJSON(),original);
 highlight.dispose();geometry.dispose();material.dispose();
});

test('export scopes keep only selected objects, detach outside route references and preserve the scene',()=>{
 const a=makePart('block',{name:'Tower A'}),b=makePart('block',{name:'Tower B'}),other=makePart('stair-route',{route:defaultHallwayRoute()}),ref=makePart('character-reference'),route=makePart('stair-route',{route:defaultHallwayRoute()});a.assemblyId=b.assemblyId='tower';a.assemblyName=b.assemblyName='Lookout';route.route.links={start:{partId:other.id,segment:0,side:'back'}};
 const p={format:'open-building-studio',version:1,name:'Village',parts:[a,b,other,ref,route]},before=JSON.stringify(p),selected=exportScope(p,[a.id,b.id]);
 assert.equal(selected.name,'Lookout');assert.deepEqual(selected.parts.map(p=>p.id),[a.id,b.id]);assert.equal(exportScope(p,[a.id]).name,'Tower A');assert.equal(exportScope(p).parts.length,4);
 assert.deepEqual(exportScope(p,[route.id]).parts[0].route.links,{});assert.equal(JSON.stringify(p),before);
 assert.throws(()=>exportScope(p,[]),/Select an object/);assert.throws(()=>exportScope(p,[ref.id]),/Select an object/);
});


test('static foliage keeps mirrored transforms, winding and render material separate from camera-facing leaves',async()=>{
 const {billboardGeometry}=await import('../src/flora/flora-billboards.js');
 const {staticFoliageMesh}=await import('../src/swbf2/swbf2-static-foliage.js');
 const settings={count:4,radius:1,height:.2,minSize:1,maxSize:1,heightScale:.5,darknessMin:.5,darknessMax:1,seed:2,atlas:2,facing:'camera',anchor:'center'},material=new T.MeshStandardMaterial();material.onBeforeCompile=shader=>{shader.custom=true;};
 const source=new T.Mesh(billboardGeometry(settings),material);source.position.set(14,20,-3);source.rotation.set(.1,.7,.2);source.scale.set(-2,3,1);source.updateMatrixWorld(true);
 const before=source.geometry.attributes.position.array.slice(),baked=staticFoliageMesh(source,{renderMaterial:true});assert.notEqual(baked.material,source.material);const shader={};baked.material.onBeforeCompile(shader);assert.equal(shader.custom,undefined);
 assert.deepEqual(source.geometry.attributes.position.array,before);assert.ok(baked.matrixWorld.equals(new T.Matrix4()));
 const g=baked.geometry;for(let i=0;i<g.index.count;i+=3){const indices=[0,1,2].map(j=>g.index.getX(i+j)),[a,b,c]=indices.map(j=>new T.Vector3().fromBufferAttribute(g.attributes.position,j)),normal=new T.Vector3().fromBufferAttribute(g.attributes.normal,indices[0]);assert.ok(b.sub(a).cross(c.sub(a)).normalize().dot(normal)>.999);}
 baked.geometry.dispose();baked.material.dispose();source.geometry.dispose();material.dispose();
});
