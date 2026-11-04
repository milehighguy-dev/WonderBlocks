import * as T from '../../vendor/three.module.js';
import {boxSurface} from './collision-geometry.js';

function lines(surface,target){const edges=new Set();for(const triangle of surface.triangles)for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3],key=a<b?a+','+b:b+','+a;if(edges.has(key))continue;edges.add(key);target.push(...surface.positions[a],...surface.positions[b]);}}
// An inspection view of existing collision data; it never authors bodies.
export function createCollisionOverlay({scene,roots,viewport,invalidate}){
 const overlay=new T.Group();overlay.name='Collision outlines';overlay.userData.referenceOnly=true;scene.add(overlay);
 const materials=[new T.LineBasicMaterial({color:0x68c7dd,transparent:true,opacity:.75,depthTest:false}),new T.LineBasicMaterial({color:0xf3ba61,transparent:true,opacity:.7,depthTest:false})];
 const legend=document.createElement('div');legend.className='collision-legend';legend.hidden=true;legend.innerHTML='<strong>Collision view legend</strong><span>Blue: movement</span><span>Gold: bullets only</span>';viewport.append(legend);
 let active=false;
 function clear(){for(const child of [...overlay.children]){child.traverse(m=>m.geometry?.dispose());overlay.remove(child);}}
 function updateTransforms(){for(const group of overlay.children){const root=group.userData.source;root.updateWorldMatrix(true,false);group.visible=root.visible;group.matrix.copy(root.matrixWorld).multiply(new T.Matrix4().makeScale(...root.userData.collision.scale.map(v=>1/v)));group.matrixWorldNeedsUpdate=true;}}
 function refresh(){if(!active)return;clear();for(const root of roots()){const collision=root.userData.collision;if(!collision)continue;const group=new T.Group(),vertices=[[],[]];group.matrixAutoUpdate=false;group.userData.source=root;
   for(const body of collision.bodies){const index=body.mask&1?0:1,surface=body.surface??boxSurface(body.primitive);lines(surface,vertices[index]);}
   vertices.forEach((values,i)=>{if(!values.length)return;const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(values,3));const mesh=new T.LineSegments(geometry,materials[i]);mesh.renderOrder=1000;mesh.frustumCulled=false;group.add(mesh);});overlay.add(group);
  }updateTransforms();invalidate();}
 return {get visible(){return active;},setVisible(value){active=!!value;overlay.visible=active;legend.hidden=!active;if(active)refresh();else clear();invalidate();},refresh,updateTransforms};
}
