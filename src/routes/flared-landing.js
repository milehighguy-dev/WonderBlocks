import * as T from '../../vendor/three.module.js';
import {angledTurn,angledFootprint} from './angled-landing.js';
// Offset exposed sides; keep connection planes fixed so neighboring bases meet.
export function landingSupportOutline(l,offsetBy){
 const s=l.segment,w=l.width,n=l.nextWidth,run=s.run,returning=s.turn.startsWith('return-'),shift=returning?(s.turn==='return-right'?-1:1)*(n+(s.gap??l.gap))/2:0,width=returning?w+n+(s.gap??l.gap):w,x0=shift-width/2,x1=shift+width/2;
 let points,ports;
 if(angledTurn(s)){points=angledFootprint(l);ports=new Set([0,3]);}
 else if(s.turn==='right'){points=[[x0,0],[x1,0],[x1,run],[x0,run],[x0,run-n]];ports=new Set([0,3]);}
 else if(s.turn==='left'){points=[[x0,0],[x1,0],[x1,run-n],[x1,run],[x0,run]];ports=new Set([0,2]);}
 else {points=[[x0,0],[x1,0],[x1,run],[x0,run]];ports=new Set(returning?[0]:[0,2]);}
 const offset=delta=>{const lines=points.map((p,i)=>{const q=points[(i+1)%points.length],dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz),d=ports.has(i)?0:delta;return {p:[p[0]+dz/len*d,p[1]-dx/len*d],dx,dz};});
 return lines.map((line,i)=>{const prev=lines[(i+lines.length-1)%lines.length],den=prev.dx*line.dz-prev.dz*line.dx;if(Math.abs(den)<1e-9){const port=ports.has(i)?line:prev,sign=ports.has(i)?-1:1,len=Math.hypot(port.dx,port.dz);return [points[i][0]+sign*delta*port.dx/len,points[i][1]+sign*delta*port.dz/len];}const t=((line.p[0]-prev.p[0])*line.dz-(line.p[1]-prev.p[1])*line.dx)/den;return [prev.p[0]+t*prev.dx,prev.p[1]+t*prev.dz];});};
 const area=ring=>ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const valid=ring=>ring.flat().every(Number.isFinite)&&area(ring)*area(points)>1e-9&&!ring.some((a,i)=>ring.some((c,j)=>{if(j<=i+1||i===0&&j===ring.length-1)return false;const b=ring[(i+1)%ring.length],d=ring[(j+1)%ring.length];return cross(a,b,c)*cross(a,b,d)<-1e-12&&cross(c,d,a)*cross(c,d,b)<-1e-12;}));
 let delta=offsetBy,base=offset(delta);for(let i=0;i<24&&!valid(base);i++){delta*=.5;base=offset(delta);}if(!valid(base))base=points.map(p=>p.slice());
 return {points,base};
}
export function flaredLandingGeometry(l,bottom){
 const {points,base}=landingSupportOutline(l,l.width*(l.segment.groundFlare??0)/2);
 const positions=[],ground=[];const emit=(p,y,isGround)=>{positions.push(p[0],y,p[1]);ground.push(isGround);};
 const triangle=(vertices)=>{const a=new T.Vector3(vertices[1][0][0]-vertices[0][0][0],vertices[1][1]-vertices[0][1],vertices[1][0][1]-vertices[0][0][1]),b=new T.Vector3(vertices[2][0][0]-vertices[0][0][0],vertices[2][1]-vertices[0][1],vertices[2][0][1]-vertices[0][0][1]);if(a.cross(b).lengthSq()<1e-16)return;for(const [p,y,g] of vertices)emit(p,y,g);};
 for(const [ring,y,groundFace] of [[points,0,false],[base,bottom,true]])for(const tri of T.ShapeUtils.triangulateShape(ring.map(p=>new T.Vector2(...p)),[])){const order=tri.slice(),p=order.map(i=>ring[i]),normalY=-((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]));if(groundFace?normalY>0:normalY<0)order.reverse();triangle(order.map(i=>[ring[i],y,groundFace]));}
 for(let i=0;i<points.length;i++){const j=(i+1)%points.length;triangle([[points[i],0,false],[points[j],0,false],[base[j],bottom,true]]);triangle([[points[i],0,false],[base[j],bottom,true],[base[i],bottom,true]]);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.userData.groundVertices=ground;g.userData.groundCustomFlare=true;return g;
}
