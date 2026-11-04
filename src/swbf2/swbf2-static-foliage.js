import * as T from '../../vendor/three.module.js';

// A standalone MSH cannot spawn leafpatch ODFs. Bake deterministic, varied
// upright cards, using the same atlas, colours, size and distribution instead.
export function staticFoliageMesh(source,{renderMaterial=false}={}){
 source.updateWorldMatrix(true,false);
 const mesh=new T.Mesh(source.geometry.clone(),source.material),g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,centers=g.attributes.billboardCenter,corners=g.attributes.billboardCorner;
 const scale=source.getWorldScale(new T.Vector3()),point=new T.Vector3(),center=new T.Vector3(),normal=new T.Vector3();
 for(let i=0;i<p.count;i++){
  const angle=Math.floor(i/4)*2.399963229728653;
  center.fromBufferAttribute(centers,i).applyMatrix4(source.matrixWorld);
  point.set(Math.cos(angle)*corners.getX(i)*Math.abs(scale.x),corners.getY(i)*Math.abs(scale.y),Math.sin(angle)*corners.getX(i)*Math.abs(scale.x)).add(center);
  p.setXYZ(i,point.x,point.y,point.z);normal.set(-Math.sin(angle),0,Math.cos(angle));n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 // World-space geometry avoids applying a mirrored source transform twice.
 p.needsUpdate=n.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();mesh.matrixAutoUpdate=false;
 if(renderMaterial){mesh.material=source.material.clone();mesh.material.onBeforeCompile=()=>{};mesh.material.customProgramCacheKey=()=> 'swbf2-static-foliage-v1';}
 return mesh;
}
