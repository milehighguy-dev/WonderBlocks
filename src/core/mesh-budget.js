import * as THREE from '../../vendor/three.module.js';
export function geometryStats(root){let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {triangles,meshes};}
// Merge within a part only, retaining its selection, transforms and materials.
export function batchPart(group){
 const batches=new Map();
 for(const m of [...group.children]){
  if(!m.isMesh||m.userData.floraBillboard)continue;m.updateMatrix();const source=m.geometry,g=source.index?source.toNonIndexed():source.clone();g.applyMatrix4(m.matrix);
  if(m.matrix.determinant()<0)for(const attr of Object.values(g.attributes))for(let i=0;i<attr.count;i+=3)for(let k=0;k<attr.itemSize;k++){const a=i*attr.itemSize+k,b=(i+2)*attr.itemSize+k,v=attr.array[a];attr.array[a]=attr.array[b];attr.array[b]=v;}
  if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(g);group.remove(m);source.dispose();
 }
 for(const [material,geometries] of batches){
  const g=new THREE.BufferGeometry(),count=geometries.reduce((n,g)=>n+g.attributes.position.count,0);
  for(const [name,size] of [['position',3],['normal',3],['uv',2]]){const values=new Float32Array(count*size);let offset=0;for(const geo of geometries){const a=geo.getAttribute(name);if(a)values.set(a.array,offset);offset+=geo.attributes.position.count*size;}g.setAttribute(name,new THREE.BufferAttribute(values,size));}
  geometries.forEach(g=>g.dispose());g.computeBoundingBox();g.computeBoundingSphere();const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;group.add(m);
 }
 return group;
}
