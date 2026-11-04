import * as THREE from '../../vendor/three.module.js';

// Original, stylized temple kit. Columns share a three-unit height.
export const CLASSICAL_PARTS = [
 ['doric','Doric column'],['ionic','Ionic column'],['corinthian','Corinthian column'],
 ['doric-smooth','Smooth Doric column'],['ionic-smooth','Smooth Ionic column'],['corinthian-smooth','Smooth Corinthian column'],
 ['column-drum','Fluted shaft drum'],['temple-base','Temple platform'],
 ['architrave','Architrave beam'],['triglyph','Triglyph frieze'],['cornice','Dentil cornice'],
 ['temple-roof-complete','Temple roof & pediments'],['temple-entablature','Temple cornice frame'],
 ['temple-roof-half','Half temple roof'],
 ['temple-door','Temple doorway'],['acroterion','Palmette ornament']
].map(([id,name])=>({id,name,category:'Classical',icon:'◇',color:id.startsWith('temple-roof')?'#b57153':'#e4dcc7'}));

export function buildClassical(type,group,material,parameters={}){
 const smooth=type.endsWith('-smooth');
 if(smooth)type=type.slice(0,-7);
 if(type==='temple-entablature'){
  // Continuous rectangular rings: adjoining sides share their corner vertices.
  function ringLayer(outerX,outerZ,innerX,innerZ,y,height){
   const shape=new THREE.Shape();shape.moveTo(-outerX,-outerZ);shape.lineTo(outerX,-outerZ);shape.lineTo(outerX,outerZ);shape.lineTo(-outerX,outerZ);shape.closePath();
   const hole=new THREE.Path();hole.moveTo(-innerX,-innerZ);hole.lineTo(-innerX,innerZ);hole.lineTo(innerX,innerZ);hole.lineTo(innerX,-innerZ);hole.closePath();shape.holes.push(hole);
   const g=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:2});g.rotateX(-Math.PI/2);g.translate(0,y,0);
   const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
  }
  ringLayer(1.12,1.52,.88,1.28,0,.28);
  ringLayer(1.14,1.54,.86,1.26,.28,.06);
  ringLayer(1.12,1.52,.88,1.28,.34,.35);
  ringLayer(1.14,1.54,.86,1.26,.69,.12);
  ringLayer(1.18,1.58,.84,1.24,.81,.10);
  return;
 }
 if(type==='temple-roof-complete'||type==='temple-roof-half'){
  const half=type==='temple-roof-half';
  const rise=parameters.roofPitch===undefined?.28:Math.tan(parameters.roofPitch*Math.PI/180),thickness=parameters.roofThickness??.04;
  // One shallow, closed roof shell; no crossing ridge tubes or trim bars.
  const outline=new THREE.Shape();outline.moveTo(half?0:-1,half?rise:0);if(!half)outline.lineTo(0,rise);outline.lineTo(1,0);outline.lineTo(1,thickness);outline.lineTo(0,rise+thickness);if(!half)outline.lineTo(-1,thickness);outline.closePath();
  const shell=new THREE.ExtrudeGeometry(outline,{depth:1,bevelEnabled:false,steps:12});shell.translate(0,0,-.5);
  const roof=new THREE.Mesh(shell,material);roof.castShadow=true;roof.receiveShadow=true;group.add(roof);
  const stone=new THREE.MeshStandardMaterial({color:'#e4dcc7',roughness:.72,metalness:.05});
  for(const z of [-.5,.478]){
   const end=new THREE.Shape();end.moveTo(half?0:-1,0);end.lineTo(1,0);end.lineTo(0,rise);end.closePath();
   const g=new THREE.ExtrudeGeometry(end,{depth:.022,bevelEnabled:false});g.translate(0,0,z);
   const m=new THREE.Mesh(g,stone);m.castShadow=true;m.receiveShadow=true;group.add(m);
  }
  return;
 }
 const mesh=(g,x=0,y=0,z=0)=>{const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 const box=(w,h,d,x=0,y=h/2,z=0)=>mesh(new THREE.BoxGeometry(w,h,d,1,1,1),x,y,z);
 const cylinder=(top,bottom,h,y)=>mesh(new THREE.CylinderGeometry(top,bottom,h,12,2),0,y,0);
 const ring=(r,t,y)=>{const m=mesh(new THREE.TorusGeometry(r,t,4,16),0,y,0);m.rotation.x=Math.PI/2;return m;};
 function shaft(height,bottom,top,y){
  const g=new THREE.CylinderGeometry(top,bottom,height,smooth?12:40,4),a=g.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),r=Math.hypot(x,z);if(r<1e-6)continue;const t=(a.getY(i)+height/2)/height,angle=Math.atan2(z,x),flute=smooth?1:1-(parameters.fluteDepth??.07)*(.5+.5*Math.cos(20*angle)),entasis=1+(parameters.shaftFullness??.035)*Math.sin(Math.PI*t);a.setXYZ(i,x*flute*entasis,a.getY(i),z*flute*entasis);}
  g.computeVertexNormals();const m=mesh(g,0,y,0);m.name='shaft';return m;
 }
 function scroll(x,z){const pts=[];for(let i=0;i<=16;i++){const t=i/16,a=t*Math.PI*3.5,r=.15*(1-t)+.012;pts.push(new THREE.Vector3(x+Math.cos(a)*r,2.78+Math.sin(a)*r,z));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.028,4,false));}
 if(['doric','ionic','corinthian'].includes(type)){
  if(type!=='doric'){box(.62,.12,.62);ring(.245,.055,.17);}
  shaft(type==='doric'?2.64:2.42,.245,.20,type==='doric'?1.32:1.43);ring(.215,.035,2.63);
  if(type==='doric'){cylinder(.31,.215,.17,2.755);box(.68,.16,.68,0,2.92);}
  if(type==='ionic'){box(.58,.1,.45,0,2.73);for(const x of [-.27,.27])for(const z of [-.235,.235])scroll(x,z);box(.72,.12,.57,0,2.94);}
  if(type==='corinthian'){
   cylinder(.30,.21,.22,2.76);
   for(let i=0;i<8;i++){const a=i*Math.PI/4,m=mesh(new THREE.SphereGeometry(1,6,4),Math.cos(a)*.24,2.76,Math.sin(a)*.24);m.scale.set(.075,.19,.035);m.rotation.y=-a+Math.PI/2;m.rotation.z=.18;}
   box(.73,.1,.73,0,2.95);
  }
  return;
 }
 switch(type){
 case 'column-drum':shaft(1,.3,.3,.5);break;
 case 'temple-base':for(let i=0;i<3;i++)box(1.4-i*.2,.15,1.4-i*.2,0,.075+i*.15);break;
 case 'architrave':box(1,.28,.45);box(1.04,.06,.5,0,.31);break;
 case 'triglyph':box(1,.35,.3);for(const x of [-.4,0,.4]){box(.16,.3,.04,x,.19,.17);for(const dx of [-.045,0,.045])box(.018,.26,.025,x+dx,.19,.20);}break;
 case 'cornice':box(1,.12,.42,0,.06);box(1.08,.1,.55,0,.17);for(let i=0;i<7;i++)box(.065,.09,.09,-.45+i*.15,.065,.255);break;
 case 'temple-door':box(.16,1.6,.28,-.58);box(.16,1.6,.28,.58);box(1.32,.2,.32,0,1.7);box(1.48,.09,.4,0,1.845);break;
 case 'acroterion':box(.4,.1,.26);for(let i=-3;i<=3;i++){const a=i*.23,m=mesh(new THREE.SphereGeometry(1,12,10),Math.sin(a)*.27,.27+Math.cos(a)*.12,0);m.scale.set(.055,.28,.035);m.rotation.z=-a;}ring(.10,.025,.12);break;
 }
}
