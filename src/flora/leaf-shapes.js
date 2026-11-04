import * as T from '../../vendor/three.module.js';

// Independent leaf shapes. Curves, section profiles and ribs are authored here;
// no source-game vertices, UVs, attachment layouts or textures are imported.
const tau=Math.PI*2,lerp=T.MathUtils.lerp,clamp=T.MathUtils.clamp;
const empty=()=>({positions:[],uv:[],indices:[]});
const add=(m,p,uv)=>{const i=m.positions.length/3;m.positions.push(...p);m.uv.push(...uv);return i;};
const tri=(m,a,b,c)=>m.indices.push(a,b,c);
const smooth=t=>t*t*(3-2*t);
function profile(points,t){
 const n=points.length-1,x=clamp(t,0,1)*n,i=Math.min(n-1,Math.floor(x)),f=x-i;
 return lerp(points[i],points[i+1],smooth(f));
}

// A continuous skin runs from a thickening petiole into the whole leaf. This
// avoids the detached oval-on-a-stick silhouette of the discarded first pass.
function blade(kind){
 const m=empty(),long=kind==='willow',lobed=kind==='scalloped',h=long?1.91:lobed?2.02:1.89;
 const widths=long?[.040,.064,.135,.202,.233,.213,.163,.085,.009]:lobed?[.075,.085,.103,.272,.366,.401,.369,.282,.033]:[.069,.073,.075,.127,.204,.245,.242,.225,.122];
 const depths=long?[.030,.033,.041,.047,.051,.05,.043,.027,.007]:lobed?[.072,.079,.10,.256,.353,.385,.355,.27,.031]:[.066,.071,.073,.122,.198,.239,.234,.218,.117];
 const rows=lobed?22:18,sides=lobed?14:12,rings=[];
 for(let j=0;j<=rows;j++){
  const t=j/rows,w=profile(widths,t)*(lobed?.91:1),d=profile(depths,t)*(lobed?.91:1),edge=lobed?1:1;
  const y=h*(lobed&&t>.75?.75+.25*Math.sin((t-.75)*Math.PI*2):t),x=(long?.075:lobed?-.055:.035)*Math.sin(t*Math.PI)+.026*Math.sin(t*Math.PI*2),z=(long?.075:lobed?.065:.105)*t*t-.045*Math.sin(t*Math.PI);
  const lean=(long?.16:lobed?-.09:.08)*t,ring=[];
  for(let k=0;k<sides;k++){
   const a=k/sides*tau,c=Math.cos(a),s=Math.sin(a),blisters=[[.35,.2,.34],[.40,1.6,.31],[.41,3.1,.33],[.46,4.9,.34],[.55,.8,.38],[.58,2.7,.36],[.64,4.2,.32],[.71,5.8,.35],[.77,1.7,.37],[.83,3.4,.31],[.88,5.1,.26]],bump=lobed?blisters.reduce((sum,[at,angle,height])=>sum+height*Math.exp(-(((t-at)/.09)**2)-((Math.atan2(Math.sin(a-angle),Math.cos(a-angle))/.70)**2)),0):0,asym=1+(c<0?-.05:.035)*Math.sin(Math.PI*t);
   const across=c*w*edge*asym*(1+bump),knob=1+bump,section=Math.sign(s)*Math.abs(s)**.78*d*(long&&s<0?.72:1)*knob,fluted=0;
   ring.push(add(m,[x+across*Math.cos(lean)+section*Math.sin(lean),y,z-across*Math.sin(lean)+section*Math.cos(lean)+fluted],[.5+c*.48,t]));
  }
  rings.push(ring);
 }
 for(let j=0;j<rows;j++)for(let k=0;k<sides;k++){const q=(k+1)%sides;tri(m,rings[j][k],rings[j+1][k],rings[j+1][q]);tri(m,rings[j][k],rings[j+1][q],rings[j][q]);}
 for(const end of [false,true]){
  const row=rings[end?rows:0],p=[0,0,0];for(const id of row)for(let axis=0;axis<3;axis++)p[axis]+=m.positions[id*3+axis]/sides;
  if(!end)p.fill(0);const center=add(m,p,[.5,end?1:0]);for(let k=0;k<sides;k++){const q=(k+1)%sides;tri(m,center,...(end?[row[q],row[k]]:[row[k],row[q]]));}
 }
 return m;
}
function tube(m,points,radii,sides=8,steps=7){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(steps,false),rings=[];
 for(let j=0;j<=steps;j++){
  const t=j/steps,p=curve.getPoint(t),r=profile(radii,t),ring=[];
  for(let k=0;k<=sides;k++){const a=k/sides*tau,q=p.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r);ring.push(add(m,q.toArray(),[k/sides,t]));}rings.push(ring);
 }
 for(let j=0;j<steps;j++)for(let k=0;k<sides;k++){const q=k+1;tri(m,rings[j][k],rings[j][q],rings[j+1][q]);tri(m,rings[j][k],rings[j+1][q],rings[j+1][k]);}
 for(const end of [false,true]){const ring=rings[end?steps:0],center=add(m,curve.getPoint(end?1:0).toArray(),[.5,end?1:0]);for(let k=0;k<sides;k++){const q=k+1;tri(m,center,...(end?[ring[k],ring[q]]:[ring[q],ring[k]]));}}
}

function outlineShell(m,outline,center,form){
 const area=outline.reduce((n,p,i)=>{const q=outline[(i+1)%outline.length];return n+p[0]*q[1]-q[0]*p[1];},0);if(area<0)outline=[...outline].reverse();
 const count=outline.length,front=[],back=[],fractions=[.16,.43,.72,1];
 for(const side of [1,-1]){
  const rings=side===1?front:back;
  for(const r of fractions){const ring=[];for(let i=0;i<count;i++){
   const [x,y]=outline[i],angle=Math.atan2(x,y),surface=form(x*r,y*r,r,angle),thickness=.026+.07*(1-r*r),p=[center[0]+x*r,center[1]+y*r,center[2]+surface+side*thickness];
   ring.push(add(m,p,[.5+x*.48,.16+y*.72]));
  }rings.push(ring);}
  const surface=form(0,0,0,0),c=add(m,[center[0],center[1],center[2]+surface+side*.096],[.5,.16]);
  const face=(a,b,c)=>side===1?tri(m,a,b,c):tri(m,a,c,b);
  for(let i=0;i<count;i++){const q=(i+1)%count;face(c,rings[0][i],rings[0][q]);for(let j=0;j<fractions.length-1;j++){face(rings[j][i],rings[j+1][i],rings[j+1][q]);face(rings[j][i],rings[j+1][q],rings[j][q]);}}
 }
 for(let i=0;i<count;i++){const q=(i+1)%count;tri(m,front[3][i],back[3][i],back[3][q]);tri(m,front[3][i],back[3][q],front[3][q]);}
}
function fan(maple=false){
 const m=empty(),root=maple?.35:.48,outline=[[0,-.115]],steps=28;
 const lobes=[[-1.75,.46,.21],[-1.15,.74,.25],[-.58,.88,.28],[.025,1.03,.29],[.61,.91,.28],[1.2,.72,.25],[1.77,.44,.21]];
 const angles=maple?[-1.88,...lobes.flatMap(([a,r,w])=>[a-w*.65,a,a+w*.65]),...lobes.slice(0,-1).map(([a],i)=>(a+lobes[i+1][0])*.5),1.88].filter(a=>a>=-1.88&&a<=1.88).sort((a,b)=>a-b):Array.from({length:steps+1},(_,i)=>-1.46+2.92*i/steps);
 for(const a of angles){
  let r;
  if(maple){
   r=.40;for(const [direction,length,spread] of lobes)r=Math.max(r,.40+(length-.40)*Math.exp(-(((a-direction)/spread)**2)));
  }else{
   r=.88*(1-.10*Math.exp(-((a/.135)**2)))+.022*Math.sin(a*18+.4)+.022*Math.cos(a*5);
  }
  const x=Math.sin(a)*r*(maple?1:.96),y=Math.cos(a)*r*(maple?1:.70);
  outline.push([x,y]);
 }
 tube(m,[[0,0,0],[maple?.02:-.025,root*.55,-.015],[0,root+.08,-.04]],[.066,.061,.043],8,6);
 outlineShell(m,outline,[0,root,-.035],(x,y,r,a)=>{
  const cup=(maple?.22:.34)*x*x+(maple?.10:.12)*y*y;
  const warp=(maple?.16:.07)*Math.sin(a*(maple?3:2)+.35)*r*r;
  const ribs=(maple?.024:.034)*Math.cos(a*(maple?7:13))*(.25+.75*r)*Math.sin(Math.PI*r);
  return cup+warp+ribs-.06*y;
 });
 return m;
}
function coin(){
 const m=empty(),sides=14,rows=10,rings=[];
 // A broad rounded terminal body leans away from the root on three veins.
 // Its back is fully modeled; this is not a thin disk with inflated faces.
 for(let j=0;j<=rows;j++){
  const u=j/rows,t=(1-Math.cos(Math.PI*u))*.5,rad=Math.max(.015,Math.sin(Math.PI*u)),ring=[],centerY=.91+.87*t,centerZ=.47+.16*t,centerX=.022*Math.sin(t*Math.PI);
  for(let k=0;k<=sides;k++){
   const a=k/sides*tau,ripple=1+.025*Math.sin(a*3+t*4)+.018*Math.cos(a*5-.3),rx=.405*rad**.83,rz=.375*rad**.9;
   const z=rz*Math.sin(a)*(Math.sin(a)<0?.88:1);
   ring.push(add(m,[centerX+rx*Math.cos(a)*ripple,centerY,centerZ+z*ripple],[k/sides,t]));
  }rings.push(ring);
 }
 for(let j=0;j<rows;j++)for(let k=0;k<sides;k++){const q=k+1;tri(m,rings[j][k],rings[j+1][k],rings[j+1][q]);tri(m,rings[j][k],rings[j+1][q],rings[j][q]);}
 for(const end of [false,true]){const row=rings[end?rows:0],center=add(m,[end?0:0,end?1.78:.91,end?.63:.47],[.5,end?1:0]);for(let k=0;k<sides;k++){const q=k+1;tri(m,center,...(end?[row[q],row[k]]:[row[k],row[q]]));}}
 tube(m,[[0,0,0],[-.015,.17,.014],[.012,.33,.055]],[.10,.105,.062],8,5);
 tube(m,[[.005,.25,.035],[-.06,.49,.11],[-.155,.81,.20],[-.21,1.16,.235]],[.047,.041,.031,.024],7,7);
 tube(m,[[.012,.27,.045],[.07,.51,.12],[.16,.84,.19],[.21,1.14,.24]],[.045,.038,.03,.023],7,7);
 tube(m,[[0,.30,.065],[.015,.53,.17],[.045,.78,.31],[.04,1.02,.38]],[.037,.033,.027,.022],6,6);
 for(let i=2;i<m.positions.length;i+=3)m.positions[i]*=-1;for(let i=0;i<m.indices.length;i+=3)[m.indices[i+1],m.indices[i+2]]=[m.indices[i+2],m.indices[i+1]];
 return m;
}

export function leafVolume(kind,morphs={}){
 let mesh;if(['willow','scalloped','paddle'].includes(kind))mesh=blade(kind);else if(kind==='fan'||kind==='maple')mesh=fan(kind==='maple');else if(kind==='coin')mesh=coin();else throw Error('Unknown leaf volume: '+kind);
 const nativeScale=kind==='fan'?[.61,.95,.43]:kind==='maple'?[1.78,2.03,.65]:[1,1,1];for(let i=0;i<mesh.positions.length;i++)mesh.positions[i]*=nativeScale[i%3];
 const width=lerp(.68,1.32,morphs.width??.5),length=lerp(.73,1.27,morphs.length??.5),bend=lerp(-.28,.32,morphs.curl??.5)-.02,height=Math.max(...mesh.positions.filter((_,i)=>i%3===1));
 for(let i=0;i<mesh.positions.length;i+=3){const t=mesh.positions[i+1]/height;mesh.positions[i]*=width;mesh.positions[i+1]*=length;mesh.positions[i+2]=mesh.positions[i+2]*width+bend*height*t*t;}
 return mesh;
}
