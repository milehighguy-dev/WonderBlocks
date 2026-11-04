import * as T from '../../vendor/three.module.js';
// Measured from Blender bes1_bldg_platform_med. Deck radius 24.948,
// shoulder radius 28.282, underside 22.425, lowest boss 9.567 below deck.
export const BESPIN_PLATFORM_PROFILE=[[0,0],[.882,-1.0091],[3.334,-3.8461],[-2.523,-7.9838]];
export function offsetPlatformLoop(loop,d){return loop.map((p,i)=>{const a=loop[(i+loop.length-1)%loop.length],b=loop[(i+1)%loop.length],u=new T.Vector2(p.x-a.x,p.z-a.z).normalize(),v=new T.Vector2(b.x-p.x,b.z-p.z).normalize(),n=new T.Vector2(u.y+v.y,-u.x-v.x),den=1+u.dot(v);return {x:p.x+d*n.x/Math.max(.25,den),z:p.z+d*n.y/Math.max(.25,den)};});}
export function buildBespinPlatform(group,material,part,loops){
 const depth=part.platform.thickness,k=depth/9.5673,positions=[];
 const tri=(a,b,c)=>positions.push(...a,...b,...c);
 const bridge=(a,b,ya,yb)=>{for(let i=0;i<a.length;i++){const j=(i+1)%a.length;const A=[a[i].x,ya,a[i].z],B=[a[j].x,ya,a[j].z],C=[b[j].x,yb,b[j].z],D=[b[i].x,yb,b[i].z];tri(A,B,C);tri(A,C,D);}};
 const area=l=>l.reduce((s,p,i)=>s+p.x*l[(i+1)%l.length].z-l[(i+1)%l.length].x*p.z,0)/2;
 const cap=(rings,y,up)=>{const outer=rings.filter(l=>area(l)>0),holes=rings.filter(l=>area(l)<0);for(const loop of outer){const box=new T.Box2().setFromPoints(loop.map(p=>new T.Vector2(p.x,p.z))),hs=holes.filter(h=>box.containsPoint(new T.Vector2(h[0].x,h[0].z))),all=[loop,...hs].flat(),faces=T.ShapeUtils.triangulateShape(loop.map(p=>new T.Vector2(p.x,p.z)),hs.map(h=>h.map(p=>new T.Vector2(p.x,p.z))));for(const f of faces){const vs=f.map(i=>[all[i].x,y,all[i].z]);if(up)vs.reverse();tri(...vs);}}};
 cap(loops,0,true);
 for(const loop of loops){let prev=loop,py=0;for(const [d,y] of BESPIN_PLATFORM_PROFILE.slice(1)){const next=offsetPlatformLoop(loop,d*k);bridge(prev,next,py,y*k);prev=next;py=y*k;}}
 const s=part.platform.sections[0],circular=part.platform.sections.length===1&&s.kind==='circle';
 if(circular){const loop=loops[0],scale=(r)=>loop.map(p=>({x:s.x+(p.x-s.x)*r/24.948,z:s.z+(p.z-s.z)*r/24.948}));let prev=offsetPlatformLoop(loop,-2.523*k),py=-7.9838*k;
 // The circular reference has a recessed underside and a short central boss.
 for(const [r,y] of [[11.187,-7.9838],[8.657,-7.0095],[4.302,-7.0095],[4.302,-9.5673]]){const next=scale(r);bridge(prev,next,py,y*k);prev=next;py=y*k;}cap([prev],py,false);
 }else cap(loops.map(l=>offsetPlatformLoop(l,-2.523*k)),-7.9838*k,false);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.userData.platformProfile='bespin';const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
}
export function buildBespinRim(group,material,part,spans,loops){
 const width=part.platform.thickness*1.0235/9.5673,height=part.platform.railHeight,positions=[];
 const tri=(a,b,c)=>positions.push(...a,...b,...c),quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
 const connected=(point,end)=>spans.some(pair=>pair[end].distanceTo(point)<1e-5);
 for(const [a,b] of spans){const edge=loops.flatMap(l=>l.map((p,i)=>({p,q:l[(i+1)%l.length],l,i}))).find(({p,q})=>{const v=new T.Vector2(q.x-p.x,q.z-p.z),u=new T.Vector2((a.x+b.x)/2-p.x,(a.z+b.z)/2-p.z);return Math.abs(v.x*u.y-v.y*u.x)<1e-5&&u.dot(v)>=-1e-5&&u.dot(v)<=v.lengthSq()+1e-5;});if(!edge)continue;
 const {p,q,l,i}=edge,inner=offsetPlatformLoop(l,-width),len=Math.hypot(q.x-p.x,q.z-p.z),at=v=>{const t=((v.x-p.x)*(q.x-p.x)+(v.z-p.z)*(q.z-p.z))/(len*len);return new T.Vector3(inner[i].x+(inner[(i+1)%l.length].x-inner[i].x)*t,0,inner[i].z+(inner[(i+1)%l.length].z-inner[i].z)*t);},c=at(b),d=at(a),v=(p,y)=>[p.x,y,p.z];
 quad(v(a,0),v(a,height),v(b,height),v(b,0));quad(v(d,0),v(c,0),v(c,height),v(d,height));quad(v(a,height),v(d,height),v(c,height),v(b,height));if(!connected(a,1))quad(v(a,0),v(d,0),v(d,height),v(a,height));if(!connected(b,0))quad(v(b,0),v(b,height),v(c,height),v(c,0));
 }
 if(!positions.length)return;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();const m=new T.Mesh(g,material);m.userData.railing=true;m.userData.railingPart='bespin-rim';m.castShadow=m.receiveShadow=true;group.add(m);
}
