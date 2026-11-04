import * as T from '../../vendor/three.module.js';

const empty=()=>({positions:[],uv:[],indices:[]}),v=p=>new T.Vector3(...p),tau=Math.PI*2;
// Low-poly coral fingers keep their girth and finish with rounded living tips.
// Flattened sections distinguish elkhorn forks from cylindrical staghorn forks.
function branch(mesh,points,radii,{sides=6,steps=5,flat=1}={}){
 const curve=new T.CatmullRomCurve3(points.map(v)),frames=curve.computeFrenetFrames(steps,false),base=mesh.positions.length/3;
 for(let i=0;i<=steps;i++){
  const t=i/steps,p=curve.getPoint(t),x=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(x)),r=T.MathUtils.lerp(radii[j],radii[j+1],x-j);
  let across=frames.normals[i],other=frames.binormals[i];
  if(flat!==1){across=new T.Vector3(-frames.tangents[i].y,frames.tangents[i].x,0).normalize();if(across.lengthSq()<.1)across.set(1,0,0);other=new T.Vector3().crossVectors(frames.tangents[i],across).normalize();}
  for(let k=0;k<sides;k++){const a=k/sides*tau,q=p.clone().addScaledVector(across,Math.cos(a)*r).addScaledVector(other,Math.sin(a)*r*flat);mesh.positions.push(...q.toArray());mesh.uv.push(k/sides,t*2);}
  if(i)for(let k=0;k<sides;k++){const a=base+(i-1)*sides+k,b=base+(i-1)*sides+(k+1)%sides,c=b+sides,d=a+sides;mesh.indices.push(a,b,d,b,c,d);}
 }
 for(const end of [0,steps]){
  const t=end/steps,p=curve.getPoint(t),radius=radii[end?radii.length-1:0],direction=frames.tangents[end].clone().multiplyScalar(end?1:-1);let prior=base+end*sides;
  if(end)for(let ring=1;ring<=2;ring++){
   const angle=ring*Math.PI/6,offset=mesh.positions.length/3,center=p.clone().addScaledVector(direction,radius*Math.sin(angle));let across=frames.normals[end],other=frames.binormals[end];
   if(flat!==1){across=new T.Vector3(-direction.y,direction.x,0).normalize();other=new T.Vector3().crossVectors(direction,across).normalize();}
   for(let k=0;k<sides;k++){const a=k/sides*tau,q=center.clone().addScaledVector(across,Math.cos(a)*radius*Math.cos(angle)).addScaledVector(other,Math.sin(a)*radius*flat*Math.cos(angle));mesh.positions.push(...q.toArray());mesh.uv.push(k/sides,2+ring*.04);}
   for(let k=0;k<sides;k++){const a=prior+k,b=prior+(k+1)%sides,c=offset+(k+1)%sides,d=offset+k;mesh.indices.push(a,b,d,b,c,d);}prior=offset;
  }
  const center=mesh.positions.length/3;mesh.positions.push(...p.clone().addScaledVector(direction,end?radius:0).toArray());mesh.uv.push(.5,t*2+.12);for(let k=0;k<sides;k++){const a=prior+k,b=prior+(k+1)%sides;mesh.indices.push(...(end?[center,a,b]:[center,b,a]));}
 }

}
// A cheap irregular growth lump. Broad, restrained noise changes the outline;
// the texture supplies the brain pattern. Planar UVs have no wrap seam.
function brainGroove(x,z){const maze=Math.sin(x*8+2*Math.sin(z*5))+.65*Math.sin(z*9+1.6*Math.cos(x*4));return Math.exp(-maze*maze*2.8);}
function brain(){
 const m=empty(),sides=16,rings=6;
 const add=(x,y,z)=>{
  const normal=new T.Vector3(x/(1.1*1.1),y/(.95*.95),z).normalize(),relief=(.035*Math.sin(x*6+z*2)+.022*Math.sin(z*9-x*3)+.014*Math.sin(y*11+x))*T.MathUtils.smoothstep(y,0,.2),p=new T.Vector3(x,y,z).addScaledVector(normal,relief);
  m.positions.push(...p.toArray());m.uv.push(.5+x*.38,.5+z*.38);
 };
 add(0,.95,0);
 for(let i=1;i<=rings;i++){
  const r=Math.sin(i/rings*Math.PI/2);
  for(let j=0;j<sides;j++){const a=j/sides*tau;add(Math.cos(a)*r*1.1,Math.sqrt(Math.max(0,1-r*r))*.95,Math.sin(a)*r);}
  if(i===1)for(let j=0;j<sides;j++)m.indices.push(0,1+(j+1)%sides,1+j);
  else for(let j=0;j<sides;j++){const a=1+(i-2)*sides+j,b=1+(i-2)*sides+(j+1)%sides;m.indices.push(a,b,a+sides,b,b+sides,a+sides);}
 }
 const center=m.positions.length/3;m.positions.push(0,0,0);m.uv.push(.5,.5);
 for(let j=0;j<sides;j++)m.indices.push(center,1+(rings-1)*sides+j,1+(rings-1)*sides+(j+1)%sides);
 return m;
}
function plate(){
 const m=empty();branch(m,[[0,0,0],[0,.15,0]],[.15,.12],{steps:2});
 const sides=24,profile=[[.08,.05],[.35,.03],[.72,.07],[1,.18],[1,.23],[.72,.12],[.35,.08],[.08,.10]],base=m.positions.length/3;
 for(const [r,h] of profile)for(let j=0;j<sides;j++){const a=j/sides*tau,ruffle=Math.sin(a*5)*.055+Math.sin(a*9)*.025,rr=r*(1+.055*Math.cos(a*3));m.positions.push(Math.cos(a)*rr,h+ruffle*r*r,Math.sin(a)*rr*.9);m.uv.push(j/sides,r*.8);}
 for(let i=0;i<profile.length;i++)for(let j=0;j<sides;j++){const a=base+i*sides+j,b=base+i*sides+(j+1)%sides,c=base+((i+1)%profile.length)*sides+(j+1)%sides,d=base+((i+1)%profile.length)*sides+j;m.indices.push(a,d,b,b,d,c);}
 return m;
}
const textures=new Map();
export function coralTexture(kind){
 if(textures.has(kind))return textures.get(kind);const size=128,data=new Uint8Array(size*size*4),colors={staghorn:[202,171,124],elkhorn:[188,137,73],brain:[177,157,120],plate:[178,99,86]};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*tau,v=y/size*tau,hash=((Math.imul(x+13,73856093)^Math.imul(y+3,19349663))>>>0),grain=(hash%101)/100,pit=grain<.07?(kind==='brain'?.9:.64):1;let shade=.84+grain*.2;
  if(kind==='brain')shade=(1-.48*brainGroove((x/size-.5)/.38,(y/size-.5)/.38))*(.94+grain*.06); // Winding maze detail stays in the texture.
  else if(kind==='plate')shade*=.84+.15*Math.abs(Math.sin(v*38+Math.sin(u*8)));
  else{const cup=Math.hypot((x%12)-6,(y%12)-6);shade*=cup<1.5?.57:cup<2.8?1.14:1;}
  const at=(y*size+x)*4;for(let c=0;c<3;c++)data[at+c]=Math.min(255,Math.round(colors[kind][c]*shade*pit));data[at+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.flipY=false;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;textures.set(kind,texture);return texture;
}
// Each fork is a reusable growth segment, not an entire coral colony.
function fork(flat=false){
 const m=empty(),options={sides:8,steps:5,flat:flat?.3:1};
 branch(m,[[0,0,0],[.02,.4,0],[.08,1.05,.02]],flat?[.21,.26,.24]:[.14,.14,.12],options);
 for(const side of [-1,1])branch(m,[[.02,.38,0],[side*.29,.65,side*.02],[side*.52,.98,side*.06]],flat?[.20,.25,.21]:[.12,.115,.095],options);
 return m;
}
function asset(id,name,kind,mesh,paletteCategory='Flora'){
 return {id,name,sourceName:'Modular coral construction part',category:'Leaves',paletteCategory,surfaceHost:true,editorAxis:'z-to-y',texture:true,textureMap:()=>coralTexture(kind),alphaMap:()=>null,iconUrl:new URL('../../assets/reef-flora/'+id+'.png',import.meta.url).href,meshes:[mesh],triangles:mesh.indices.length/3};
}
function surface(id,name,kind,mesh,paletteCategory){
 return {...asset(id,name,kind,mesh,paletteCategory),shapeControls:[
  {id:'width',name:'Part width',default:.5,start:[-.7,.1,0],end:[-.7,.8,0]},
  {id:'height',name:'Part height',default:.5,start:[.7,.1,0],end:[.7,.8,0]}],
 shapeMesh:(m={})=>({...mesh,positions:mesh.positions.map((x,i)=>x*T.MathUtils.lerp(.65,1.35,(i%3===1?m.height:m.width)??.5))})};
}
const lobe=brain();lobe.positions=lobe.positions.map((x,i)=>x*(i%3===1?.65:.7));
export const CORAL_PARTS=[
 surface('coral-staghorn-fork','Coral: Staghorn Fork','staghorn',fork(),'Coral'),
 surface('coral-antler-branch','Coral: Elkhorn Fork','elkhorn',fork(true),'Coral'),
 surface('coral-brain-lobe','Coral: Brain Growth Lobe','brain',lobe,'Coral'),
 surface('coral-shelf-plate','Coral: Shelf Plate','plate',plate(),'Coral')
];
