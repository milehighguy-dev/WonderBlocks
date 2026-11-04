import * as T from '../../vendor/three.module.js';
export const angledTurn=s=>s.kind==='landing'&&s.turnAngle!==undefined;
export const angleMinimum=(width,angle)=>Math.max(.2,width*Math.abs(Math.tan(angle/2))+.001);
export function angledLanding(l){
 const {segment:s,width:w,nextWidth:next}=l,a=s.turnAngle,d=s.run/2,dx=Math.sin(a)*d,dz=(1+Math.cos(a))*d;
 const point=side=>[dx+side*next/2*Math.cos(a),dz-side*next/2*Math.sin(a)];
 const left=point(-1),right=point(1);
 const intersect=(side,p)=>[side*w/2,p[1]+(side*w/2-p[0])*Math.cos(a)/Math.sin(a)];
 const points=[[-w/2,0],[w/2,0],intersect(1,right),right,left,intersect(-1,left)];
 const edges=[{a:points[1],b:points[2],side:'left'},{a:points[2],b:points[3],side:'left'},{a:points[4],b:points[5],side:'right'},{a:points[5],b:points[0],side:'right'}].filter(e=>Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1])>1e-6);
 for(const e of edges){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz);e.out=[dz/len,-dx/len];}
 return {points,edges,end:[dx,dz]};
}
export function angledFootprint(l,inset=0,scale=[1,1,1],sides='both'){
 const {points}=angledLanding(l);if(!inset)return points;
 const lines=points.map((p,i)=>{const q=points[(i+1)%points.length],dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len,side=i===1||i===2?'left':'right',wall=i!==0&&i!==3&&(sides==='both'||sides===side),c=Math.cos(l.heading),s=Math.sin(l.heading),wx=c*nx+s*nz,wz=-s*nx+c*nz,offset=wall?inset*Math.hypot(wx/Math.abs(scale[0]),wz/Math.abs(scale[2])):0;return {p:[p[0]-nx*offset,p[1]-nz*offset],dx,dz};});
 return lines.map((line,i)=>{const prev=lines[(i+lines.length-1)%lines.length],den=prev.dx*line.dz-prev.dz*line.dx;if(Math.abs(den)<1e-9)return line.p;const t=((line.p[0]-prev.p[0])*line.dz-(line.p[1]-prev.p[1])*line.dx)/den;return [prev.p[0]+t*prev.dx,prev.p[1]+t*prev.dz];});
}
export function angledFloor(l,height,inset=0,scale=[1,1,1],sides='both'){
 const points=angledFootprint(l,inset,scale,sides),shape=new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1]))),g=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,-height,0);return g;
}
