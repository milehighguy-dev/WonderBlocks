import * as T from '../../vendor/three.module.js';
import {routeHandleGeometry} from './route-handles.js';

// Snap rings share one geometry, material and draw call. Camera/hover changes
// update instance data instead of allocating hundreds of meshes and shaders.
export function createRouteBubbles(){
 const group=new T.Group(),geometry=routeHandleGeometry('join'),material=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.7,depthTest:false,depthWrite:false,side:T.DoubleSide}),edgeMaterial=material.clone(),edge=new T.Mesh(geometry,edgeMaterial),matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(),cyan=new T.Color('#51d8ed'),white=new T.Color('#ffffff');
 group.userData.routeGuides=true;edgeMaterial.opacity=1;edge.renderOrder=15;edge.visible=false;group.add(edge);
 let rings=null,capacity=0,targets=[],linked=null,hovered=null,edgeTarget=null;
 const connected=target=>target.ref&&JSON.stringify(target.ref)===linked;
 function color(target){const index=targets.indexOf(target);if(index>=0){rings.setColorAt(index,target===hovered||connected(target)?white:cyan);rings.instanceColor.needsUpdate=true;}}
 return {group,
  set(next,ref){targets=next;linked=ref?JSON.stringify(ref):null;hovered=null;edgeTarget=null;edge.visible=false;
   if(targets.length>capacity){if(rings){group.remove(rings);rings.dispose();}capacity=2**Math.ceil(Math.log2(targets.length));rings=new T.InstancedMesh(geometry,material,capacity);rings.instanceMatrix.setUsage(T.DynamicDrawUsage);rings.frustumCulled=false;rings.renderOrder=12;group.add(rings);}
   if(rings){rings.count=targets.length;targets.forEach((target,index)=>rings.setColorAt(index,connected(target)?white:cyan));if(rings.instanceColor)rings.instanceColor.needsUpdate=true;}
  },
  update(camera,height){const factor=Math.tan(camera.fov*Math.PI/360)*18/(height||600);if(rings){for(let i=0;i<targets.length;i++){scale.setScalar(camera.position.distanceTo(targets[i].point)*factor);matrix.compose(targets[i].point,rotation,scale);rings.setMatrixAt(i,matrix);}rings.instanceMatrix.needsUpdate=true;}if(edgeTarget){edge.position.copy(edgeTarget.point);edge.scale.setScalar(camera.position.distanceTo(edgeTarget.point)*factor);}},
  hover(target,nextEdge=null){if(hovered!==target){const old=hovered;hovered=target;color(old);color(target);}edgeTarget=nextEdge;edge.visible=!!edgeTarget;},
  dispose(){rings?.dispose();geometry.dispose();material.dispose();edgeMaterial.dispose();group.clear();}
 };
}
