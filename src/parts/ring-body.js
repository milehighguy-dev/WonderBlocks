import * as THREE from '../../vendor/three.module.js';

// A cylindrical shell, with hard edges between its walls and flat annular rims.
export function buildRingBody(group, material, parameters={}, shape={}) {
 const outer=.5, inner=outer-(parameters.wallThickness??15)/100, segments=parameters.sides??24, heightSegments=Object.values(shape).some(Boolean)?3:1;
 const add=(geometry,y=0,rotation=0)=>{
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.y=y;mesh.rotation.x=rotation;
  mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 };
 add(new THREE.CylinderGeometry(outer,outer,1,segments,heightSegments,true),.5);
 const inside=new THREE.CylinderGeometry(inner,inner,1,segments,heightSegments,true);
 // Reverse the inner wall so it faces the empty shaft rather than the solid.
 const index=inside.index;
 for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}
 const normals=inside.attributes.normal;
 for(let i=0;i<normals.count;i++)normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));
 add(inside,.5);
 add(new THREE.RingGeometry(inner,outer,segments),1,-Math.PI/2);
 add(new THREE.RingGeometry(inner,outer,segments),0,Math.PI/2);
}
