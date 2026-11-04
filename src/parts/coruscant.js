import * as T from '../../vendor/three.module.js';
const TOWER_SECTIONS=[[-1.5,2.3],[-1.45,2.55],[-1.3,2.8],[-1.1,2.95],[-.8,3],[.8,3],[1.1,2.95],[1.3,2.8],[1.45,2.55],[1.5,2.3]];
export const beveledTowerFootprint=()=>[...TOWER_SECTIONS.map(([z,x])=>({x,z})),...TOWER_SECTIONS.slice().reverse().map(([z,x])=>({x:-x,z}))];
export const CORUSCANT_PARTS=[
 ['cor-skyscraper-blade','Skyscraper blade'],['cor-balcony','Scalloped terrace'],
 ['cor-shoulder','Curved tower shoulder'],['cor-swept-spire','Swept spire'],
 ['cor-transfer-deck','Raised landing deck'],['cor-bulb-cap','Acorn cap'],['cor-curved-strut','Curved support strut'],
 ['cor-half-round-roof','Half-round roof'],['cor-roundtop-body','Beveled tower body']
].map(([id,name])=>({id,name,category:'Coruscant',icon:'◇',color:'#b9b6ab'}));
export function buildCoruscant(type,group,material){
 const mesh=g=>{const m=new T.Mesh(g,material);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 const profile=(points,depth)=>{const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:false});g.translate(0,0,-depth/2);return mesh(g);};
 const lathe=points=>mesh(new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),12));
 switch(type){
 case 'cor-half-round-roof':
 case 'cor-roundtop-body':{
  // Both pieces share this beveled footprint exactly at their joining plane.
  const sections=TOWER_SECTIONS;
  if(type==='cor-roundtop-body'){
   const outline=beveledTowerFootprint().map(({x,z})=>[x,-z]);
   const shape=new T.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
   const g=new T.ExtrudeGeometry(shape,{depth:4,steps:1,bevelEnabled:false});g.rotateX(-Math.PI/2);mesh(g);
  }else{
   const rings=sections.map(([z,r])=>Array.from({length:17},(_,i)=>{const a=i*Math.PI/16;return [r*Math.cos(a),i===0||i===16?0:r*Math.sin(a),z];}));
   const positions=[],uvs=[],tri=(a,b,c)=>{for(const p of [a,b,c]){positions.push(...p);uvs.push(p[0],p[1]);}};
   for(let j=0;j<rings.length-1;j++)for(let i=0;i<17;i++){const k=(i+1)%17;tri(rings[j][i],rings[j][k],rings[j+1][k]);tri(rings[j][i],rings[j+1][k],rings[j+1][i]);}
   for(let i=1;i<16;i++){tri(rings[0][0],rings[0][i+1],rings[0][i]);tri(rings.at(-1)[0],rings.at(-1)[i],rings.at(-1)[i+1]);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();mesh(g);
  }
  break;
 }
 case 'cor-shoulder':{
  // A repeatable side wing: tall flush back and a rounded setback shoulder.
  const pts=[[-2,0],[1,0],[1,7],[.45,7],[.45,5.5]];
  for(let i=1;i<=8;i++){const t=i/8,u=1-t;pts.push([u*u*u*.45+3*u*u*t*.45+3*u*t*t*(-2)+t*t*t*(-2),u*u*u*5.5+3*u*u*t*3.8+3*u*t*t*4.7+t*t*t*2.8]);}
  profile(pts,2.6);break;
 }
 case 'cor-swept-spire':{
  // Solid thin fin; the curved overhang is intentional, with a complete back.
  const pts=[[-.25,0],[.65,0],[.65,6.8],[.15,8],[.15,5.3]];
  for(let i=1;i<=8;i++){const t=i/8,u=1-t;pts.push([u*u*.15+2*u*t*.05-2.6*t*t,u*u*5.3+2*u*t*3.8+3.2*t*t]);}
  pts.push([-2.5,2.7],[-2.2,2.7],[-2,3],[-.25,3]);profile(pts,.8);break;
 }
 case 'cor-transfer-deck':
  // Flat walkable disc with an integral flared underside for tower mounting.
  lathe([[0,0],[1.25,0],[1.25,.35],[1.3,.8],[1.65,1.3],[2.2,1.75],[2.9,2],[3.5,2.1],[3.5,2.4],[0,2.4]]);break;
 case 'cor-bulb-cap':
  lathe([[0,0],[1.35,0],[1.45,.3],[1.38,1],[1.1,1.8],[.65,2.5],[.25,2.85],[0,2.85]]);break;
 case 'cor-curved-strut':
  profile([[-.35,0],[-.1,0],[.15,.9],[.35,1.5],[.12,1.5],[-.1,.95]],.18);break;
 case 'cor-skyscraper-blade':{
  // Lengthwise half-almond: planar cut back, bowed front, truncated level ends.
  const shape=new T.Shape();shape.moveTo(-.85,0);
  for(let i=1;i<=12;i++){const a=Math.PI-i*Math.PI/12;shape.lineTo(.85*Math.cos(a),-1.8*Math.sin(a));}
  shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:8,steps:8,bevelEnabled:false});
  g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const t=p.getY(i)/8,r=1-.65*t*t;p.setXYZ(i,p.getX(i)*r,p.getY(i),p.getZ(i)*r-.9);}
  g.computeVertexNormals();mesh(g);break;
 }


 case 'cor-balcony':{const pts=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,r=i%2?3.3:3.7;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}const m=profile(pts,.35);m.rotation.x=-Math.PI/2;m.position.y=.175;break;}
 }
}
