// Test-only inputs for geometry and connection regressions.
import * as T from '../../vendor/three.module.js';
import {defaultFlora,addFloraAsset,floraAttachmentFrame,floraOrganMatrix,validateFlora} from '../../src/flora/flora.js';
import {floraAsset} from '../../src/flora/flora-palette.js';
const V=p=>new T.Vector3(...p),tau=Math.PI*2;
export const CORAL_FIXTURES=['staghorn','elkhorn','brain','plate'];
// Colonies are recipes made from surface-pinned growth pieces. No foundation
// disk, generic skeletal stem or complete-colony palette mesh is required.
export function coralAttachmentFixture(kind){
 if(!CORAL_FIXTURES.includes(kind))throw Error('Unknown coral example.');
 const f=defaultFlora();f.colors={bark:'#ffffff',leaf:'#ffffff'};f.detail='swbf2';
 function piece(asset,scale,rotation=[0,0,0],parent=null,point=[0,0,0],lift=0){
  let target=null;
  if(parent){
   const mesh=floraAsset(parent.asset).meshes[0];let surface,distance=Infinity;
   for(let j=0;j<mesh.indices.length;j+=3){const tri=new T.Triangle(...mesh.indices.slice(j,j+3).map(k=>V(mesh.positions.slice(k*3,k*3+3)))),near=tri.closestPointToPoint(V(point),new T.Vector3()),d=near.distanceToSquared(V(point));if(d<distance){distance=d;surface={mesh:0,triangle:j/3,bary:tri.getBarycoord(near,new T.Vector3()).toArray().map(x=>T.MathUtils.clamp(x,0,1))};}}
   const sum=surface.bary.reduce((a,b)=>a+b,0);surface.bary=surface.bary.map(x=>x/sum);target={organ:parent.id,surface};
  }
  const o=addFloraAsset(f,f.branches[0].id,asset,0,0,target),frame=floraAttachmentFrame(f,o),position=new T.Vector3(),q=new T.Quaternion(),inherited=new T.Vector3();frame.decompose(position,q,inherited);
  const desired=new T.Quaternion().setFromEuler(new T.Euler(...rotation)),r=new T.Euler().setFromQuaternion(q.invert().multiply(desired));o.rotation=[r.x,r.y,r.z];o.scale=scale.map((x,i)=>x/inherited.getComponent(i));
  if(parent){o.depth=.025;if(lift)o.offset=V([0,lift,0]).transformDirection(frame.clone().invert()).multiplyScalar(lift).toArray();}
  return o;
 }
 if(kind==='brain'){
  const root=piece('coral-brain-lobe',[1.5,1.8,1.4]);
  for(let i=0;i<3;i++){const a=i*tau/3;piece('coral-brain-lobe',[.85,1.05,.8],[0,a,0],root,[Math.cos(a)*.5,.15,Math.sin(a)*.5]);}
 }else if(kind==='plate'){
  let parent=piece('coral-shelf-plate',[1.6,1.6,1.6]);
  for(let i=0;i<4;i++)parent=piece('coral-shelf-plate',[1.45-i*.2,1.45-i*.2,1.45-i*.2],[0,i*.6,0],parent,[0,.15,0],.03);
 }else{
  const flat=kind==='elkhorn',asset=flat?'coral-antler-branch':'coral-staghorn-fork',root=piece(asset,flat?[1.5,1.3,1.5]:[1.15,1.15,1.15]);
  for(let i=0;i<3;i++){
   const side=i-1,arm=piece(asset,flat?[1.1,1.15,1.1]:[.9,1.05,.9],[flat?0:side*.25,i*.9,-side*.5],root,[side*.5,side===0?1.05:.98,side*.06]);
   if(!flat)for(const s of [-1,1])piece(asset,[.6,.72,.6],[s*.25,i*.9+s*.55,-s*.5],arm,[s*.5,.98,s*.06]);
  }
 }
 validateFlora(f);return f;
}
