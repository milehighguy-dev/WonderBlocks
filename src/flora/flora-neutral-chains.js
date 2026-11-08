import * as T from '../../vendor/three.module.js';

const cache=new WeakMap(),neutral=b=>!b.anchor&&b.profile==='flora-basic-branch';
const endpoint=n=>!n.parentOrgan&&!n.branchSurface&&!n.pin&&Math.abs(n.at-1)<1e-7;

// Saved parts stay separate. Only the derived neutral sweep spans their shared
// end joints, using exactly the same controls as one authored branch.
export function neutralBranchChains(f,rotationAt,isBody){
 const key=JSON.stringify([f.branches,f.organs.filter(isBody)]),cached=cache.get(f);
 if(cached?.key===key)return cached;
 const branches=new Map(f.branches.map(b=>[b.id,b])),children=new Map(),next=new Map(),previous=new Map();
 for(const n of [...f.branches,...f.organs.filter(isBody)]){
  if(!endpoint(n))continue;const id=n.points?n.parent:n.branch;if(!id)continue;
  if(!children.has(id))children.set(id,[]);children.get(id).push(n);
 }
 for(const b of f.branches.filter(neutral)){
  const parent=branches.get(b.parent);
  if(parent&&neutral(parent)&&endpoint(b)&&children.get(parent.id)?.length===1&&Math.abs(parent.radii.at(-1)-b.radii[0])<1e-7){next.set(parent.id,b);previous.set(b.id,parent);}
 }
 const chains=[],byId=new Map();
 for(const root of f.branches.filter(b=>neutral(b)&&!previous.has(b.id))){
  const chain={root,last:root,members:[],points:[],radii:[]};let b=root,matrix=new T.Matrix4(),offset=0;
  while(b){
   const member={node:b,matrix:matrix.clone(),inverse:matrix.clone().invert(),offset,spans:b.points.length-1,chain};
   chain.members.push(member);byId.set(b.id,member);
   for(let i=chain.points.length?1:0;i<b.points.length;i++){chain.points.push(new T.Vector3(...b.points[i]).applyMatrix4(matrix).toArray());chain.radii.push(b.radii[i]);}
   chain.last=b;offset+=member.spans;
   const child=next.get(b.id);if(child)matrix.multiply(new T.Matrix4().compose(new T.Vector3(...b.points.at(-1)),rotationAt(b,1),new T.Vector3(1,1,1)));b=child;
  }
  chain.spans=offset;chain.branch={...root,points:chain.points,radii:chain.radii};
  // Stored rotations are edits, while the per-piece attachment frame is only
  // a coordinate system. Do not restart the tube's radial frame at each piece.
  const rotations={...root.jointRotations};
  for(const member of chain.members){
   if(member.node===root)continue;const frame=new T.Quaternion().setFromRotationMatrix(member.matrix),inverse=frame.clone().invert(),prior=Object.keys(rotations).map(Number).filter(i=>i<=member.offset).sort((a,b)=>b-a)[0],base=new T.Quaternion().setFromEuler(new T.Euler(...(rotations[prior]||root.childRotation||[0,0,0])));
   const entries=[...(member.node.childRotation?[[0,member.node.childRotation]]:[]),...Object.entries(member.node.jointRotations||{})];
   for(const [index,rotation] of entries){const q=frame.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(...rotation))).multiply(inverse).multiply(base),e=new T.Euler().setFromQuaternion(q);rotations[member.offset+Number(index)]=[e.x,e.y,e.z];}
  }
  if(Object.keys(rotations).length)chain.branch.jointRotations=rotations;else delete chain.branch.jointRotations;
  chain.signature=JSON.stringify([chain.points,chain.radii,chain.branch.childRotation,chain.branch.jointRotations]);chains.push(chain);
 }
 const result={key,chains,byId};cache.set(f,result);return result;
}
