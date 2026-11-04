import * as T from '../../vendor/three.module.js';

// New sculptural growth shapes. Curves and section layouts below are authored
// here; no reference vertices, sampled surfaces or source textures are imported.
const tau=Math.PI*2,mesh=()=>({positions:[],uv:[],indices:[]});
function put(m,p,uv){const n=m.positions.length/3;m.positions.push(...p);m.uv.push(...uv);return n;}
function stitch(m,rings){
 const n=rings[0].length;
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const k=(i+1)%n,a=rings[j][i],b=rings[j][k],c=rings[j+1][k],d=rings[j+1][i];m.indices.push(a,d,c,a,c,b);}
 for(const end of [false,true]){const ring=rings[end?rings.length-1:0],center=[0,0,0];for(const i of ring)for(let a=0;a<3;a++)center[a]+=m.positions[i*3+a]/n;const v=put(m,center,[.5,end?1:0]);for(let i=0;i<n;i++){const k=(i+1)%n;m.indices.push(...(end?[v,ring[k],ring[i]]:[v,ring[i],ring[k]]));}}
}
function sweep(m,points,radii,{sides=7,steps=8,flat=1,ridge=.035}={}){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal'),frames=curve.computeFrenetFrames(steps,false),rings=[];
 for(let j=0;j<=steps;j++){
  const t=j/steps,center=curve.getPoint(t),q=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(q)),radius=T.MathUtils.lerp(radii[k],radii[k+1],q-k),ring=[];
  for(let i=0;i<sides;i++){const a=i/sides*tau,r=radius*(1+ridge*Math.cos(a*3+t*1.4));ring.push(put(m,center.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r*flat).toArray(),[i/sides,t]));}rings.push(ring);
 }
 stitch(m,rings);
}
function rosette(){
 const m=mesh(),n=16,rings=[],sections=[[0,.10],[.2,.09],[.43,.12],[.61,.23],[.78,.33],[.98,.36],[1.18,.32],[1.35,.23],[1.45,.07]];
 for(let j=0;j<sections.length;j++){
  const [y,r]=sections[j],ring=[];
  for(let i=0;i<n;i++){const a=i/n*tau,k=1+.07*Math.sin(a*3+j*.5);ring.push(put(m,[Math.cos(a)*r*k+.025*Math.sin(y*2),y,Math.sin(a)*r*k*.95],[i/n,j/(sections.length-1)]));}rings.push(ring);
 }
 stitch(m,rings);
 const center=new T.Vector3(.02,1.0,0);
 for(let i=0;i<13;i++){
  const y=-.67+i/12*1.52,a=i*Math.PI*(3-Math.sqrt(5))+.22,r=Math.sqrt(1-y*y),direction=new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r),length=.35+.08*Math.sin(i*1.7);
  const base=center.clone().addScaledVector(direction,.27),tip=center.clone().addScaledVector(direction,.29+length),mid=base.clone().lerp(tip,.62).add(new T.Vector3(.02*Math.sin(i),.025,.015*Math.cos(i)));
  sweep(m,[base.toArray(),mid.toArray(),tip.toArray()],[.13,.075,.006],{steps:3,sides:5,flat:1,ridge:.07});
 }
 return m;
}
function coral(){
 const m=mesh(),grow=(p,r,steps=6)=>sweep(m,p,r,{steps,sides:6,flat:.92,ridge:.05});
 grow([[0,0,0],[-.04,.32,.035],[.045,.72,.06]],[.135,.16,.14],7);
 grow([[.045,.68,.06],[-.34,.88,-.35],[-.59,1.31,-.55],[-.78,1.63,-.38]],[.15,.13,.115,.07],9);
 grow([[.03,.69,.07],[.30,.98,.2],[.52,1.4,.4],[.44,1.90,.52]],[.15,.13,.11,.07],9);
 grow([[.02,.73,.05],[.02,1.1,-.52],[.2,1.45,-.79],[.16,1.76,-.9]],[.13,.125,.10,.06],9);
 grow([[-.34,.88,-.35],[-.68,.94,-.02],[-.92,1.15,.05]],[.11,.115,.07]);
 grow([[-.59,1.31,-.55],[-.79,1.4,-.83],[-.88,1.57,-.85]],[.10,.095,.06],5);
 grow([[.52,1.4,.4],[.85,1.45,.15],[1.04,1.72,.02]],[.105,.12,.07]);
 grow([[.3,.98,.2],[.38,1.07,.74],[.55,1.37,.92]],[.11,.12,.065]);
 grow([[.2,1.45,-.79],[.58,1.38,-.78],[.67,1.65,-.71]],[.095,.105,.06]);
 // Short blunt prongs break the regularity of the larger forks.
 grow([[.44,1.84,.5],[.73,1.91,.54]],[.075,.045],3);
 grow([[-.77,1.59,-.39],[-.9,1.76,-.18]],[.075,.04],3);
 return m;
}

function tendril(curl){
 const m=mesh(),points=[[0,0,0],[-.035,.35,.035],[.07,.83,-.09],[-.08,1.4,.11],[.08,2.02,.21],[-.06,2.59,.04],[.04,2.96,-.12]];
 for(let j=1;j<=18;j++){
  const t=j/18,a=-Math.PI/2+t*(.65+curl*1.1)*tau,r=.5*(1-.74*t);
  points.push([.04+Math.cos(a)*r,3.46+Math.sin(a)*r,-.12+.28*Math.sin(t*Math.PI*1.45)]);
 }
 sweep(m,points,[.105,.12,.085,.06,.045,.022],{steps:34,sides:7,flat:.94});
 sweep(m,[[.015,.69,-.02],[-.35,.84,-.34],[-.46,1.18,-.5],[-.34,1.47,-.47]],[.075,.10,.065,.025],{steps:11,sides:6});
 sweep(m,[[.02,1.91,.17],[.32,2.09,.51],[.45,2.47,.61],[.29,2.66,.54]],[.067,.078,.047,.022],{steps:11,sides:6});
 return m;
}
export function accentVolume(kind,morphs={}){
 const m=kind==='star'?rosette():kind==='coral'?coral():tendril(morphs.curl??.5),width=T.MathUtils.lerp(.65,1.35,morphs.width??.5),length=T.MathUtils.lerp(.7,1.3,morphs.length??.5),bend=kind==='tendril'?0:T.MathUtils.lerp(-.24,.24,morphs.curl??.5),height=Math.max(...m.positions.filter((_,i)=>i%3===1));
 for(let i=0;i<m.positions.length;i+=3){const t=m.positions[i+1]/height;m.positions[i]*=width;m.positions[i+1]*=length;m.positions[i+2]=m.positions[i+2]*width+bend*t*t*height;}
 // A sweep's frame may have the opposite handedness to an axial loft. Keep
 // outward-facing closed pieces before their use as opaque foliage surfaces.
 let volume=0;for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3).map(j=>new T.Vector3().fromArray(m.positions,j*3));volume+=a.dot(b.cross(c));}
 if(volume<0)for(let i=0;i<m.indices.length;i+=3)[m.indices[i+1],m.indices[i+2]]=[m.indices[i+2],m.indices[i+1]];
 return m;
}
