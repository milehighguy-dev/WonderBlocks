import * as T from '../../vendor/three.module.js';
import {floraCurve,floraAttachmentFrame,floraOrganMatrix,floraConnectionSockets,floraSocketPose,floraBodyOrgan,floraDeformPositions} from './flora.js';
import {floraAsset} from './flora-palette.js';

const outlineMaterial=new T.MeshBasicMaterial({color:'#183136',depthTest:false,depthWrite:false});
export function outlineFloraHandle(mesh,geometry=mesh.geometry,scale=1.18){const outline=new T.Mesh(geometry,outlineMaterial);outline.scale.setScalar(scale);outline.renderOrder=mesh.renderOrder-1;outline.raycast=()=>{};mesh.add(outline);return mesh;}

export function floraArrowGeometry(double=false){
 const stem=new T.CylinderGeometry(.16,.16,1.2,8),tip=new T.ConeGeometry(.48,.8,8).translate(0,.9,0),pieces=[stem,tip];
 if(double)pieces.push(new T.ConeGeometry(.48,.8,8).rotateZ(Math.PI).translate(0,-.9,0));
 const positions=[],normals=[];for(const piece of pieces){const g=piece.toNonIndexed();positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();piece.dispose();}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();return geometry;
}

// Geometry is pooled. Reframing the camera or dragging a joint only moves the
// widgets; it never creates more WebGL buffers or screen-sized origin spheres.
export function createFloraWidgets(camera,canvas){
 const group=new T.Group(),pool=new Map(),arrow=floraArrowGeometry(),materials=new Map();
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,opacity:.9}));return materials.get(color);};
 const unit=p=>Math.max(.01,-p.clone().applyMatrix4(camera.matrixWorldInverse).z)*Math.tan(camera.fov*Math.PI/360)*2/Math.max(1,canvas.clientHeight||600);
 function mesh(key,geometry,color,data){let m=pool.get(key);if(!m){m=new T.Mesh(geometry,material(color));m.renderOrder=2200;outlineFloraHandle(m,geometry,1.18);pool.set(key,m);}m.material=material(color);m.userData.floraWidget=data;group.add(m);return m;}
 function extend(key,position,axis,selection,length,radius=0){const u=unit(position),m=mesh(key,arrow,'#ffe09a',{kind:'extend',selection,axis:axis.clone(),length,label:'Extend / shorten branch · drag arrow'});m.position.copy(position).addScaledVector(axis,u*64+radius);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);m.scale.setScalar(u*10);}
 function update(part,selection,pose,mode){
  group.clear();if(!selection.branch||selection.morph||mode!=='scale')return;
  const f=part.flora,o=f.organs.find(o=>o.id===selection.organ),b=f.branches.find(b=>b.id===selection.branch),world=pose.matrixWorld;
  if(mode==='scale'&&!selection.organ)for(const branch of f.branches.filter(b=>!b.anchor&&b.id===selection.branch)){
   const curve=floraCurve(f,branch.id),tip=curve.getPoint(1).applyMatrix4(world),axis=tip.clone().sub(curve.getPoint(0).applyMatrix4(world));if(axis.lengthSq()<1e-8)axis.copy(curve.getTangent(1).transformDirection(world));else axis.normalize();
   const frame=world.clone().multiply(floraAttachmentFrame(f,branch)),scale=Math.max(...[0,1,2].map(i=>new T.Vector3().setFromMatrixColumn(frame,i).length()));
   extend('branch:'+branch.id,tip,axis,{branch:branch.id,index:branch.points.length-1},0,branch.radii.at(-1)*scale);
  }
  if(mode==='scale'&&o&&floraBodyOrgan(o)){
   const sockets=floraConnectionSockets(o.asset),matrix=world.clone().multiply(floraOrganMatrix(f,o));
   for(const socket of sockets.filter(s=>(!selection.socket||s.id===selection.socket)&&!sockets.some(child=>child.parent===s.id))){
    const current=floraSocketPose(o,socket),parent=sockets.find(s=>s.id===socket.parent),base=parent?floraSocketPose(o,parent).point:[0,0,0],axis=new T.Vector3(...current.point).sub(new T.Vector3(...base));if(axis.lengthSq()<1e-8)axis.fromArray(socket.direction);
    extend(o.id+':'+socket.id,new T.Vector3(...current.point).applyMatrix4(matrix),axis.transformDirection(matrix),{branch:o.branch,organ:o.id,socket:socket.id},new T.Vector3(...current.point).distanceTo(new T.Vector3(...base)));
   }
  }else if(mode==='scale'&&o&&floraAsset(o.asset)?.category==='Trunks'&&!floraAsset(o.asset).shapeControls?.some(c=>c.id==='length')){
   const bounds=new T.Box3();for(const mesh of floraAsset(o.asset).meshes){const positions=floraDeformPositions(o,mesh.positions);for(let i=0;i<positions.length;i+=3)bounds.expandByPoint(new T.Vector3().fromArray(positions,i));}
   const tip=bounds.getCenter(new T.Vector3());tip.y=bounds.max.y;const matrix=world.clone().multiply(floraOrganMatrix(f,o));
   extend('part:'+o.id,tip.applyMatrix4(matrix),new T.Vector3(0,1,0).transformDirection(matrix),{branch:o.branch,organ:o.id},Math.max(.05,bounds.max.y-bounds.min.y));
  }
  group.updateMatrixWorld(true);
 }
 return {group,update,unit};
}

// Convert a drag into motion along a visible axis. Looking straight down the
// axis still permits extension by dragging up/down, without an enormous jump.
export function floraAxisDrag(camera,rect,origin,axis,dx,dy){
 const start=origin.clone().project(camera),end=origin.clone().add(axis).project(camera),screen=new T.Vector2((end.x-start.x)*rect.width/2,-(end.y-start.y)*rect.height/2);
 let pixels=screen.length();const depth=Math.max(.01,-origin.clone().applyMatrix4(camera.matrixWorldInverse).z),fallback=rect.height/(2*depth*Math.tan(camera.fov*Math.PI/360));
 if(pixels<fallback*.15){screen.set(0,-1);pixels=fallback;}else screen.divideScalar(pixels);
 return (dx*screen.x+dy*screen.y)/Math.max(.01,pixels);
}
