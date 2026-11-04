import * as T from '../../vendor/three.module.js';

// BF1 wall_ruin_16: broad masonry remnants with broken courses and deep,
// open-topped losses. Keep the same profile across curved tessellation panels.
export function yavinRuinGeometry({length,offset,total,r,point,tangent,normal,closeStart,closeEnd}){
 const course=[[0,.86],[.1,.88],[.13,.62],[.26,.61],[.3,.38],[.42,.4],[.48,.16],[.58,.18],[.62,.64],[.73,.62],[.77,1],[.91,.98]],nodes=[[0,r.height*.86]];
 for(let cycle=0;cycle*r.spacing<total;cycle++)for(const [t,h] of course){const x=(cycle+t)*r.spacing;if(x>0&&x<total-1e-6)nodes.push([x,r.height*T.MathUtils.clamp(h+(t?Math.sin(cycle*2.3)*.06:0),.1,1)]);}
 // Shared-height ends make adjoining mitred walls meet, including trimmed bays.
 nodes.push([total,r.height*.86]);
 const height=x=>{const i=nodes.findIndex(n=>n[0]>=x-1e-7);if(i<=0)return nodes[0][1];const [a,b]=[nodes[i-1],nodes[i]];return T.MathUtils.lerp(a[1],b[1],(x-a[0])/(b[0]-a[0]));};
 const xs=[0,...nodes.map(n=>n[0]-offset).filter(x=>x>1e-7&&x<length-1e-7),length],half=r.panelThickness/2,positions=[];
 const quad=(coordinates,expected)=>{const p=coordinates.map(([x,y,z])=>point(x,y,z));if(p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).dot(expected)<0)p.reverse();for(const i of [0,1,2,0,2,3])positions.push(...p[i].toArray());};
 for(let i=1;i<xs.length;i++){
  const a=xs[i-1],b=xs[i],ha=height(a+offset),hb=height(b+offset);
  for(const [z,sign] of [[half,1],[-half,-1]])quad([[a,0,z],[b,0,z],[b,hb,z],[a,ha,z]],normal.clone().multiplyScalar(sign));
  quad([[a,ha,half],[b,hb,half],[b,hb,-half],[a,ha,-half]],new T.Vector3(0,1,0));
  quad([[a,0,half],[b,0,half],[b,0,-half],[a,0,-half]],new T.Vector3(0,-1,0));
 }
 for(const [x,closed,sign] of [[0,closeStart,-1],[length,closeEnd,1]])if(closed){const h=height(x+offset);quad([[x,0,half],[x,h,half],[x,h,-half],[x,0,-half]],tangent.clone().multiplyScalar(sign));}
 const wall=new T.BufferGeometry();wall.setAttribute('position',new T.Float32BufferAttribute(positions,3));wall.computeVertexNormals();
 const recesses=new T.BufferGeometry();recesses.setAttribute('position',new T.Float32BufferAttribute([],3));return {wall,recesses};
}

// The BF1 ruined screens use trapezoidal windows and stepped shoulders, not
// round arches. Sample a single continuous pattern across curved wall panels.
export function yavinWallGeometry({length,offset,total,r,point,tangent,normal,closeStart,closeEnd}){
 const spacing=r.spacing,width=Math.min(r.archWidth??1.6,spacing*.65),topWidth=width*.58,sill=Math.min(.9,r.height*.3),high=Math.min(sill+(r.archHeight??1.4),r.height-.4),half=r.panelThickness/2,windows=[];
 for(let center=spacing/2;center+width/2<total-.2;center+=spacing)windows.push({center});
 const cuts=[0,length];for(const {center} of windows)for(const x of [center-width/2,center-topWidth/2,center+topWidth/2,center+width/2,center-spacing*.34,center-spacing*.22,center+spacing*.22,center+spacing*.34])if(x>offset+1e-7&&x<offset+length-1e-7)cuts.push(x-offset);
 cuts.sort((a,b)=>a-b);const xs=[...new Set(cuts)],wall=[],inside=[];
 const top=x=>{const a=windows.find(a=>Math.abs(x+offset-a.center)<spacing*.34);return r.height-(a?Math.abs(x+offset-a.center)<spacing*.22?0:.16:.32);};
 const quad=(out,coordinates,expected)=>{const p=coordinates.map(([x,y,z])=>point(x,y,z));if(p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).dot(expected)<0)p.reverse();for(const i of [0,1,2,0,2,3])out.push(...p[i].toArray());};
 const opening=(a,x)=>{const distance=Math.abs(x+offset-a.center);return distance<=topWidth/2?high:sill+(high-sill)*T.MathUtils.clamp((width/2-distance)/((width-topWidth)/2),0,1);};
 for(let i=1;i<xs.length;i++){
  const lo=xs[i-1],hi=xs[i],mid=(lo+hi)/2,upper=top(mid),hole=windows.find(a=>Math.abs(mid+offset-a.center)<width/2),a=hole?opening(hole,lo):sill,b=hole?opening(hole,hi):sill;
  for(const [z,sign] of [[half,1],[-half,-1]]){
   quad(wall,[[lo,a,z],[hi,b,z],[hi,r.height-.32,z],[lo,r.height-.32,z]],normal.clone().multiplyScalar(sign));
   for(const [low,high] of [[r.height-.32,r.height-.16],[r.height-.16,r.height]])if(high<=upper+1e-7)quad(wall,[[lo,low,z],[hi,low,z],[hi,high,z],[lo,high,z]],normal.clone().multiplyScalar(sign));
   quad(wall,[[lo,0,z],[hi,0,z],[hi,sill,z],[lo,sill,z]],normal.clone().multiplyScalar(sign));
  }
  quad(wall,[[lo,upper,half],[hi,upper,half],[hi,upper,-half],[lo,upper,-half]],new T.Vector3(0,1,0));
  quad(wall,[[lo,0,half],[hi,0,half],[hi,0,-half],[lo,0,-half]],new T.Vector3(0,-1,0));
  if(hole){quad(inside,[[lo,a,half],[hi,b,half],[hi,b,-half],[lo,a,-half]],new T.Vector3(0,-1,0));quad(inside,[[lo,sill,half],[hi,sill,half],[hi,sill,-half],[lo,sill,-half]],new T.Vector3(0,1,0));}
  if(i<xs.length-1){const next=top((hi+xs[i+1])/2);if(Math.abs(next-upper)>1e-6)quad(wall,[[hi,Math.min(next,upper),half],[hi,Math.max(next,upper),half],[hi,Math.max(next,upper),-half],[hi,Math.min(next,upper),-half]],tangent.clone().multiplyScalar(upper>next?1:-1));}
 }
 for(const [x,closed,sign] of [[0,closeStart,-1],[length,closeEnd,1]])if(closed){const upper=top(x===0?1e-5:length-1e-5),levels=[0,sill,r.height-.32,r.height-.16,r.height].filter(y=>y<=upper+1e-7);for(let i=1;i<levels.length;i++)quad(wall,[[x,levels[i-1],half],[x,levels[i],half],[x,levels[i],-half],[x,levels[i-1],-half]],tangent.clone().multiplyScalar(sign));}
 const geometry=positions=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;};return {wall:geometry(wall),recesses:geometry(inside)};
}
