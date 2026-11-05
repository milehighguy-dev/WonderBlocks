import * as T from '../../vendor/three.module.js';

// Closed, faceted strata with a level cap. Ring noise changes the silhouette;
// no displacement shader or external mesh is required by saving or export.
export function rockGeometry({roughness=.16,seed=1,taper=.4}={}){
 const sides=13,levels=5,positions=[],indices=[];
 const noise=(a,b)=>{const n=Math.sin(a*127.1+b*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};
 for(let j=0;j<=levels;j++)for(let i=0;i<sides;i++){
  const t=j/levels,angle=i/sides*Math.PI*2+(noise(i,7)-.5)*.12;
  const radius=.5*(1-taper*t)*(1+(noise(i,0)-.5)*roughness*2+(noise(i,j+1)-.5)*roughness*.65);
  const y=j===0?0:j===levels?1:t+(noise(i,j+18)-.5)*.09;
  positions.push(Math.cos(angle)*radius,y,Math.sin(angle)*radius);
 }
 for(let j=0;j<levels;j++)for(let i=0;i<sides;i++){
  const a=j*sides+i,b=j*sides+(i+1)%sides,c=a+sides,d=b+sides;
  indices.push(a,c,b,b,c,d);
 }
 const bottom=positions.length/3;positions.push(0,0,0);const top=positions.length/3;positions.push(0,1,0);
 for(let i=0;i<sides;i++){const n=(i+1)%sides;indices.push(bottom,i,n,top,levels*sides+n,levels*sides+i);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(positions.flatMap((n,i)=>i%3===0?[n,positions[i+2]]:[]),2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
