import {Vector3} from '../../vendor/three.module.js';
import {updateBillboardFacing} from '../flora/flora-billboards.js';
// Bake world transforms into vertices. Reflection reverses triangle winding.
export function exportOBJ(root,{camera}={}){
 root.updateMatrixWorld(true);const lines=['# Wonderblocks geometry export'];let offset=1;
 root.traverse(mesh=>{if(!mesh.isMesh)return;for(let o=mesh;o;o=o.parent)if(o.userData.referenceOnly)return;if(mesh.userData.floraBillboard&&camera)updateBillboardFacing(mesh,camera);const g=mesh.geometry,pos=g.attributes.position,index=g.index,flip=mesh.matrixWorld.determinant()<0;
 lines.push('o '+mesh.parent.name.replace(/[^a-z0-9_-]/gi,'_'));
 for(let i=0;i<pos.count;i++){const v=new Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);lines.push(`v ${v.x} ${v.y} ${v.z}`);}
 const count=index?index.count:pos.count;
 for(let i=0;i<count;i+=3){let a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;if(flip)[b,c]=[c,b];lines.push(`f ${a+offset} ${b+offset} ${c+offset}`);}
 offset+=pos.count;
 });return lines.join('\n')+'\n';
}
