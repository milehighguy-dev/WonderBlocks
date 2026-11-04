import * as T from '../../vendor/three.module.js';
// Broad, deterministic facets keep this a solid low-poly ice tunnel.
// The same field moves shared wall/roof vertices; connection planes stay fixed.
export function naturalTunnelPoint(x,y,z,width,height,run){
 const end=Math.min(1,Math.max(0,z/.7),Math.max(0,(run-z)/.7)),up=Math.min(1,Math.max(0,y/height));
 const side=x<0?-1:1,phase=side<0?1.37:3.91;
 const bulge=Math.sin(z*1.13+up*3.4+phase)*.65+Math.sin(z*.47-up*5.1+phase)*.35;
 const dx=side*width*.085*bulge*Math.sin(up*Math.PI*.9)*end;
 const dy=height*.055*(Math.sin(z*.83+x*.79+1.2)*.65+Math.sin(z*1.47-x*.51)*.35)*Math.max(0,(up-.52)/.48)*end;
 return [x+dx,y+dy,z];
}
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function clip(poly,axis,value,above){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[axis]-value,db=b[axis]-value,ia=above?da>=-1e-8:da<=1e-8,ib=above?db>=-1e-8:db<=1e-8;if(ia)out.push(a);if(ia!==ib)out.push(mix(a,b,da/(da-db)));}return out;}
export function roughenNaturalHallways(group,layout){for(const m of group.children){const l=layout[m.userData.routeSegment];if(!m.userData.hallway||l?.segment.hallway?.style!=='hoth-natural')continue;
 const s=l.segment,h=s.hallway,old=m.geometry,pos=old.attributes.position,uv=old.attributes.uv,out=[],tex=[],c=Math.cos(l.heading),n=Math.sin(l.heading),rows=Math.max(1,Math.ceil(s.run/2)),spacing=s.run/rows;
 for(let i=0;i<pos.count;i+=3){const triangle=[0,1,2].map(j=>{const x=pos.getX(i+j)-l.start[0],z=pos.getZ(i+j)-l.start[2];return [x*c-z*n,pos.getY(i+j)-l.start[1],x*n+z*c,uv?.getX(i+j)??0,uv?.getY(i+j)??0];}),lo=Math.floor(Math.min(...triangle.map(v=>v[2]))/spacing),hi=Math.floor(Math.max(...triangle.map(v=>v[2]))/spacing);
  for(let row=lo;row<=hi;row++){const strip=clip(clip(triangle,2,row*spacing,true),2,(row+1)*spacing,false);for(const [a,b] of [[-Infinity,0],[0,Infinity]]){let poly=strip;if(Number.isFinite(a))poly=clip(poly,0,a,true);if(Number.isFinite(b))poly=clip(poly,0,b,false);for(let j=1;j+1<poly.length;j++){
   const tri=[poly[0],poly[j],poly[j+1]],v=tri.map(p=>new T.Vector3(...p.slice(0,3)));if(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()<1e-16)continue;
   for(const p of tri){const base=s.kind==='landing'?0:s.rise*p[2]/s.run,[x,y,z]=naturalTunnelPoint(p[0],p[1]-base,p[2],l.width,h.height,s.run);out.push(l.start[0]+x*c+z*n,l.start[1]+y+base,l.start[2]-x*n+z*c);tex.push(p[3],p[4]);}
  }}}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.computeVertexNormals();m.geometry=g;m.userData.naturalTunnel=true;old.dispose();
}}
