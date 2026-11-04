import * as THREE from '../../vendor/three.module.js';
import {enclosedRouteSide} from './route-profile.js';
// Vertical strips stay valid when support bottoms move to a world ground plane.
// A triangulated whole polygon cannot safely be deformed that way.
export function filledFlightGeometry(s,width,bottom,backing=.45){
 if(!s.groundFlare)return unflaredFlightGeometry(s,width,bottom);
 const positions=[],ground=[];const v=(x,y,z,isGround=false)=>({p:[x,y,z],ground:isGround});
 function quad(a,b,c,d){for(const q of [a,b,c,a,c,d]){positions.push(...q.p);ground.push(q.ground);}}
 const count=s.kind==='stairs'?s.steps:1,left=-width/2,right=width/2;
 let previous;
 for(let i=0;i<count;i++){
  const z0=i*s.run/count,z1=(i+1)*s.run/count;
  const u0=s.rise*z0/s.run,u1=s.rise*z1/s.run;
  const y0=s.kind==='stairs'?(i+(s.rise<0?0:1))*s.rise/count:0,y1=s.kind==='stairs'?y0:s.rise;
  quad(v(left,y0,z0),v(left,y1,z1),v(right,y1,z1),v(right,y0,z0));
  if(i===0)quad(v(left,bottom,0,true),v(right,bottom,0,true),v(right,bottom,s.run,true),v(left,bottom,s.run,true));
  if(!enclosedRouteSide(s,'left'))quad(v(right,y0,z0),v(right,y1,z1),v(right,u1,z1),v(right,u0,z0));
  if(i===0)quad(v(right,0,0),v(right,s.rise,s.run),v(right,bottom,s.run,true),v(right,bottom,0,true));
  if(!enclosedRouteSide(s,'right'))quad(v(left,y1,z1),v(left,y0,z0),v(left,u0,z0),v(left,u1,z1));
  if(i===0)quad(v(left,s.rise,s.run),v(left,0,0),v(left,bottom,0,true),v(left,bottom,s.run,true));
  if(i===0){quad(v(left,bottom,z0,true),v(left,u0,z0),v(right,u0,z0),v(right,bottom,z0,true));quad(v(left,u0,z0),v(left,y0,z0),v(right,y0,z0),v(right,u0,z0));}
  else if(y0>previous)quad(v(left,previous,z0),v(left,y0,z0),v(right,y0,z0),v(right,previous,z0));
  else if(y0<previous)quad(v(right,y0,z0),v(right,previous,z0),v(left,previous,z0),v(left,y0,z0));
  if(i===count-1){quad(v(right,bottom,z1,true),v(right,u1,z1),v(left,u1,z1),v(left,bottom,z1,true));quad(v(right,u1,z1),v(right,y1,z1),v(left,y1,z1),v(left,u1,z1));}
  previous=y1;
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i],positions[i+2]]:[]),2));g.computeVertexNormals();g.userData.groundVertices=ground;return g;
}

// Vertical strips stay valid when support bottoms move to a world ground plane.
// A triangulated whole polygon cannot safely be deformed that way.
function unflaredFlightGeometry(s,width,bottom){
 const positions=[],ground=[];const v=(x,y,z,isGround=false)=>({p:[x,y,z],ground:isGround});
 function quad(a,b,c,d){for(const q of [a,b,c,a,c,d]){positions.push(...q.p);ground.push(q.ground);}}
 const count=s.kind==='stairs'?s.steps:1,left=-width/2,right=width/2;
 let previous;
 for(let i=0;i<count;i++){
  const z0=i*s.run/count,z1=(i+1)*s.run/count;
  const y0=s.kind==='stairs'?(i+(s.rise<0?0:1))*s.rise/count:0,y1=s.kind==='stairs'?y0:s.rise;
  quad(v(left,y0,z0),v(left,y1,z1),v(right,y1,z1),v(right,y0,z0));
  quad(v(left,bottom,z0,true),v(right,bottom,z0,true),v(right,bottom,z1,true),v(left,bottom,z1,true));
  if(!enclosedRouteSide(s,'left')||s.groundFlare)quad(v(right,y0,z0),v(right,y1,z1),v(right,bottom,z1,true),v(right,bottom,z0,true));
  if(!enclosedRouteSide(s,'right')||s.groundFlare)quad(v(left,y1,z1),v(left,y0,z0),v(left,bottom,z0,true),v(left,bottom,z1,true));
  if(i===0)quad(v(left,bottom,z0,true),v(left,y0,z0),v(right,y0,z0),v(right,bottom,z0,true));
  else if(y0>previous)quad(v(left,previous,z0),v(left,y0,z0),v(right,y0,z0),v(right,previous,z0));
  else if(y0<previous)quad(v(right,y0,z0),v(right,previous,z0),v(left,previous,z0),v(left,y0,z0));
  if(i===count-1)quad(v(right,bottom,z1,true),v(right,y1,z1),v(left,y1,z1),v(left,bottom,z1,true));
  previous=y1;
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i],positions[i+2]]:[]),2));g.computeVertexNormals();g.userData.groundVertices=ground;return g;
}
