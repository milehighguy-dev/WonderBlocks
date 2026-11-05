import * as T from '../../vendor/three.module.js';

// Long playable vines need enough axial sections to follow their joint curve;
// stretching a small branch mesh leaves coarse kinks across a soldier's path.
export function floraVineGeometry(curve,radiusAt){
 const length=curve.getLength(),steps=Math.min(200,Math.max(24,Math.ceil(length*3))),sides=12,stride=sides+1,frames=curve.computeFrenetFrames(steps,false),positions=[],uv=[],branchUV=[],indices=[];
 for(let i=0;i<=steps;i++){
  const u=i/steps,t=curve.getUtoTmapping(u),center=curve.getPoint(t),radius=radiusAt(t);
  for(let j=0;j<=sides;j++){
   const angle=j/sides*Math.PI*2,p=center.clone().addScaledVector(frames.normals[i],Math.cos(angle)*radius).addScaledVector(frames.binormals[i],Math.sin(angle)*radius);
   positions.push(...p.toArray());uv.push(j/sides,u);branchUV.push(j/sides,Math.PI*2*radius,u*length);
  }
 }
 for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*stride+j,b=a+stride;indices.push(a,a+1,b,a+1,b+1,b);}
 for(const end of [0,steps]){
  const center=curve.getPoint(end?1:0),index=positions.length/3;positions.push(...center.toArray());uv.push(.5,.5);branchUV.push(.5,Math.PI*2*radiusAt(end?1:0),end?length:0);
  for(let j=0;j<sides;j++){const a=end*stride+j;indices.push(index,...(end?[a,a+1]:[a+1,a]));}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('floraBranchUV',new T.Float32BufferAttribute(branchUV,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
